import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres from "postgres";

// Helper function to dynamically fetch the database schema (currently unused but kept for future use)
async function _getDbSchema(sql: postgres.Sql): Promise<string> {
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

IMPORTANT: When users ask questions that require data from the database, you should ALWAYS respond with exactly this format:
[DATABASE_QUERY]
[SQL query here]
[/DATABASE_QUERY]

For example:
- User: "How many products do we have?"
- Your response: "[DATABASE_QUERY]SELECT COUNT(*) FROM products;[/DATABASE_QUERY]"

- User: "What's our total revenue?"
- Your response: "[DATABASE_QUERY]SELECT SUM(total_amount) FROM transactions;[/DATABASE_QUERY]"

For non-data questions or guidance, respond normally without the [DATABASE_QUERY] tags.

Available tables and their common columns:
- products: id, name, price, stock_quantity, category_id
- categories: id, name, description
- transactions: id, total_amount, created_at, user_id
- companies: id, name, contact_info
- users: id, username, email, last_login

For guidance on adding/editing data, direct users to:
- Products Page: for managing products
- Categories Page: for managing categories
- Companies Page: for managing suppliers
- Transactions Page: for viewing sales history
- Settings Page: for user preferences
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

    // Get AI response
    const response = await chat.sendMessage(query);
    const aiResponse = response.response.text();
    
    console.log("AI response:", aiResponse);

    // Check if AI wants to query the database
    if (aiResponse.includes('[DATABASE_QUERY]') && aiResponse.includes('[/DATABASE_QUERY]')) {
      const sqlMatch = aiResponse.match(/\[DATABASE_QUERY\](.*?)\[\/DATABASE_QUERY\]/s);
      if (sqlMatch && supabaseDbUrl) {
        const generatedSql = sqlMatch[1].trim();
        console.log("Extracted SQL:", generatedSql);
        
        if (generatedSql.toLowerCase().startsWith('select')) {
          let sql;
          try {
            sql = postgres(supabaseDbUrl);
            console.log("Executing SQL:", generatedSql);
            const data = await sql.unsafe(generatedSql);
            console.log("SQL execution successful, data:", data);
            
            await sql.end();
            
            // If no data found
            if (!data || (Array.isArray(data) && data.length === 0)) {
              return new Response(JSON.stringify({ 
                response: "I executed the query successfully, but no data was found in the database." 
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              });
            }
            
            // Format the response with data
            const finalPrompt = `
              The user asked: "${query}"
              I executed this SQL: ${generatedSql}
              Here's the data: ${JSON.stringify(data, null, 2)}
              
              Please provide a clear, friendly answer to the user's question based on this data:
            `;
            
            const finalResponse = await chat.sendMessage(finalPrompt);
            return new Response(JSON.stringify({ 
              response: finalResponse.response.text() 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
            
          } catch (sqlError) {
            console.error("SQL execution error:", sqlError);
            if (sql) {
              try { 
                await sql.end(); 
              } catch (closeError) {
                console.error("Error closing connection:", closeError);
              }
            }
            const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
            return new Response(JSON.stringify({ 
              response: `I tried to run the query "${generatedSql}" but got an error: ${errorMessage}. The table or column might not exist.` 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }
        } else {
          return new Response(JSON.stringify({ 
            response: "I can only execute SELECT queries for security reasons." 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }
    }

    // Return the AI response directly (for guidance or general conversation)
    return new Response(JSON.stringify({ 
      response: aiResponse
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