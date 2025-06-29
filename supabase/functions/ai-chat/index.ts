import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres from "postgres";

// Helper function to dynamically fetch the database schema
async function getDbSchema(sql: postgres.Sql): Promise<string> {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    let schema = "";
    for (const table of tables) {
      const tableName = table.table_name;
      // Skip internal Supabase and system tables
      if (tableName.startsWith('pg_') || tableName.startsWith('sql_') || 
          tableName === 'realtime' || tableName === 'supabase_migrations') {
        continue;
      }

      schema += `Table "${tableName}":\n`;
      const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;

      for (const column of columns) {
        schema += `  - ${column.column_name} (${column.data_type})\n`;
      }
      schema += "\n";
    }
    return schema;
  } catch (error) {
    console.error("Error fetching schema:", error);
    return "Unable to fetch database schema";
  }
}

const SYSTEM_PROMPT = `
You are Insight, a helpful AI assistant for the QuickCart sales dashboard.
Your goal is to assist users by either guiding them on how to use the web application or by answering their data-related queries.

Follow these instructions in order of priority:

1. **Application Guidance (Top Priority):**
   If a user asks how to perform actions like adding, editing, creating, updating, or deleting data, guide them to the correct page in the web application.
   - **Do not** generate SQL queries for modification requests.
   - Instead, provide helpful directions to the appropriate page.

   Available pages:
   - **Dashboard Page:** Main landing page with revenue, sales, and transaction overviews
   - **Products Page:** Add new products, edit product details (price, stock), view all products
   - **Categories Page:** Manage product categories
   - **Companies Page:** Manage supplier and company information
   - **Transactions Page:** Detailed log of all past sales
   - **Admins Page:** Manage user accounts (super_admin only)
   - **Settings Page:** Change personal preferences

2. **Database Queries (For Read-Only Questions):**
   If the user asks "what", "how many", "who", or "list" queries that require reading existing data, generate a PostgreSQL SELECT query.
   - Example: "What was our total revenue last month?" or "How many products are low in stock?"
   - Only SELECT statements are allowed. For data modifications, refer to guidance above.

3. **General Conversation:**
   For queries not related to the dashboard or its data, answer from general knowledge while maintaining a helpful assistant persona.
`;

// Main function to serve requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Received request:", req.method, req.url);
    
    // Check for required environment variables
    const supabaseDbUrl = Deno.env.get("SUPABASE_DB_URL");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    console.log("Environment check:");
    console.log("SUPABASE_DB_URL exists:", !!supabaseDbUrl);
    console.log("GEMINI_API_KEY exists:", !!geminiApiKey);
    
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    const { query, history } = await req.json();
    if (!query) throw new Error("query is required");
    console.log("User query:", query);
    console.log("Chat history length:", history ? history.length : 0);

    // Initialize AI client
    console.log("Initializing AI client...");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_PROMPT 
    });
    
    // Initialize chat with history if provided
    let chat;
    if (history && history.length > 0) {
      chat = model.startChat({
        history: history
      });
    } else {
      chat = model.startChat();
    }
    console.log("AI client initialized successfully.");

    // First, get initial response to determine if this is guidance or data query
    const initialResponse = await chat.sendMessage(query);
    const firstPassText = initialResponse.response.text();
    
    // Check if response contains guidance keywords
    const guidanceKeywords = ["go to the", "on the page", "you can manage", "navigate to", "you should be able to"];
    if (guidanceKeywords.some(keyword => firstPassText.toLowerCase().includes(keyword))) {
        console.log("Providing guidance directly:", firstPassText);
        return new Response(JSON.stringify({ response: firstPassText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    // Check if this is a data query by looking at the user's question
    const dataQueryKeywords = ["what", "how many", "how much", "list", "show me", "count", "total", "sum", "revenue", "sales", "products", "top selling", "best selling", "stock", "inventory"];
    const isDataQuery = dataQueryKeywords.some(keyword => query.toLowerCase().includes(keyword));
    
    // If it's a data query and we have database URL, try database query
    if (isDataQuery && supabaseDbUrl) {
      try {
        console.log("Attempting database query for:", query);
        const sql = postgres(supabaseDbUrl);
        const dbSchema = await getDbSchema(sql);

        const sqlPrompt = `
          Based on the database schema below, write a single, valid PostgreSQL SELECT query to answer the user's query.
          Return ONLY the raw SQL query, no explanation or markdown.

          Schema:
          ${dbSchema}

          User query: "${query}"

          SQL Query:
        `;

        const sqlResult = await chat.sendMessage(sqlPrompt);
        const generatedSql = sqlResult.response.text().trim().replace(/^```sql\n|```$/g, '').trim();
        
        if (generatedSql.toLowerCase().startsWith('select')) {
          console.log("Executing SQL:", generatedSql);
          const data = await sql.unsafe(generatedSql);
          
          // Format the response with data
          const finalPrompt = `
            Based on this data, provide a clear answer to: "${query}"
            
            Data: ${JSON.stringify(data, null, 2)}
            
            Answer:
          `;
          
          const finalResult = await chat.sendMessage(finalPrompt);
          const finalResponse = finalResult.response.text();
          
          await sql.end();
          return new Response(JSON.stringify({ response: finalResponse }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          console.log("Generated SQL doesn't start with SELECT:", generatedSql);
        }
        
        await sql.end();
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Fall through to return the initial AI response
      }
    }

    // Return the initial AI response if no database query needed
    return new Response(JSON.stringify({ 
      response: firstPassText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: message,
      details: "Function is testing AI integration"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});