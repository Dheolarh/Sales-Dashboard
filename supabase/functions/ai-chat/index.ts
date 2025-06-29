import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres from "postgres";

// Helper function to dynamically fetch the database schema.
// This acts as our live, "virtual DatabaseX".
async function getDbSchema(sql: postgres.Sql): Promise<string> {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  let schema = "";
  for (const table of tables) {
    const tableName = table.table_name;
    // Skips internal Supabase and system tables for a cleaner schema
    if (tableName.startsWith('pg_') || tableName.startsWith('sql_') || tableName === 'realtime' || tableName === 'supabase_migrations') {
      continue;
    }

    schema += `Table "${tableName}":\n`;
    const columns = await sql`
      SELECT 
        column_name, 
        data_type, 
        col_description(('public.' || ${tableName})::regclass, a.attnum) as comment
      FROM 
        information_schema.columns
      JOIN 
        pg_attribute a ON a.attname = column_name AND a.attrelid = (
          SELECT oid FROM pg_class WHERE relname = ${tableName} AND relnamespace = (
              SELECT oid FROM pg_namespace WHERE nspname = 'public'
          )
        )
      WHERE 
        table_schema = 'public' AND table_name = ${tableName}
      ORDER BY 
        ordinal_position;
    `;

    for (const column of columns) {
        schema += `  - ${column.column_name} (${column.data_type})`;
        if (column.comment) {
            schema += ` -- ${column.comment}`;
        }
        schema += `\n`;
    }

    const tableCommentResult = await sql`
        SELECT obj_description(${tableName}::regclass, 'pg_class') as comment;
    `;
    // THIS IS THE CORRECTED LINE
    if (tableCommentResult[0] && tableCommentResult[0].comment) {
        schema += `  -- Table Comment: ${tableCommentResult[0].comment}\n`;
    }

    schema += "\n";
  }
  return schema;
}

const SYSTEM_PROMPT = `
You are Insight, a highly intelligent and helpful AI assistant for the QuickCart sales dashboard.
Your goal is to assist users by either guiding them on how to use the web application or by answering their data-related querys.

You must follow these instructions in order of priority:

1.  **Application Guidance (Your Top Priority):**
    If a user asks how to perform an action like **adding, editing, creating, updating, or deleting** data, your main job is to guide them to the correct page in the web application.
    - **Do not** try to generate a SQL query for these modification requests.
    - Instead, use your knowledge of the application's structure to provide helpful directions.

    Here is a map of the available pages:
    - **Dashboard Page:** This is the main landing page with overviews of revenue, sales, and recent transactions.
    - **Products Page:** Guide users here to **add new products, edit a product's price or stock, or view all products.**
    - **Categories Page:** This is where users can **manage product categories.**
    - **Companies Page:** Users should go here to **manage supplier and company information.**
    - **Transactions Page:** This page provides a **detailed log of all past sales.**
    - **Admins Page:** Only for "super_admin" users to **manage other user accounts.**
    - **Settings Page:** The place for users to **change their personal preferences.**

    **Example Interaction:**
    - User: "I need to change the price of the Sony Headphones."
    - Your Correct Response: "You can edit all product details, including the price, on the 'Products' page. From there, you can search for the Sony headphones and update its information."

2.  **Database Queries (For Read-Only querys):**
    If the user asks a "what", "how many", "who", or "list" query that requires **reading or analyzing existing data**, you should generate a PostgreSQL query to find the answer.
    - Example: "What was our total revenue last month?" or "How many Coca-Colas do we have in stock?"
    - You are strictly forbidden from generating any query that is not a 'SELECT' statement. If you are asked to modify data, follow the guidance in step 1.

3.  **General Conversation:**
    If the query is not related to the dashboard or its data, you can answer from your general knowledge, always maintaining your helpful assistant persona.
`;

// Main function to serve requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Received request:", req.method, req.url);
    const { query } = await req.json();
    if (!query) throw new Error("query is required");
    console.log("User query:", query);

    // Initialize clients
    console.log("Initializing database and AI clients...");
    const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!);
    const genAI = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", systemInstruction: SYSTEM_PROMPT });
    const chat = model.startChat();
    console.log("Clients initialized successfully.");

    // First, ask the model if this is a guidance query or a data query based on the system prompt.
    const initialResponse = await chat.sendMessage(query);
    const firstPassText = initialResponse.response.text();
    
    // Simple check: If the response sounds like guidance (telling the user where to go),
    // we return it directly. This avoids unnecessary SQL generation for non-data tasks.
    const guidanceKeywords = ["go to the", "on the page", "you can manage", "navigate to", "you should be able to"];
    if (guidanceKeywords.some(keyword => firstPassText.toLowerCase().includes(keyword))) {
        console.log("Providing guidance directly:", firstPassText);
        return new Response(JSON.stringify({ response: firstPassText }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    }

    // If it's not guidance, proceed to generate SQL
    console.log("User query appears to be data-related. Generating SQL...");
    const dbSchema = await getDbSchema(sql);

    const sqlPrompt = `
      Based on the previous instruction and the user's query, and given the database schema below, write a single, valid PostgreSQL SELECT query to answer the query.
      Your response must be ONLY the raw SQL query, with no explanation, no markdown, and no surrounding text.

      --- Schema ---
      ${dbSchema}
      ---

      query: "${query}"

      SQL Query:
    `;

    console.log("Sending SQL generation prompt to Gemini...");
    const sqlResult = await chat.sendMessage(sqlPrompt);
    let generatedSql = sqlResult.response.text();
    generatedSql = generatedSql.trim().replace(/^```sql\n|```$/g, '').trim();
    console.log("Generated SQL:", generatedSql);

    // Security check
    if (!generatedSql.toLowerCase().startsWith('select')) {
      console.log("Blocking non-SELECT query:", generatedSql);
      return new Response(JSON.stringify({ response: "I'm sorry, I can only perform read-only queries." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log("Executing SQL:", generatedSql);
    const data = await sql.unsafe(generatedSql);
    console.log("SQL execution complete. Data retrieved:", data);

    // Final step: Formulate answer based on data
    const finalPrompt = `
      Based on the following data, please formulate a clear and concise answer to the user's original query.
      If the data is empty or an array with no items, inform the user that no results were found.
      Present the answer in a friendly and direct way.

      Original query: "${query}"

      --- Data ---
      ${JSON.stringify(data, null, 2)}
      ---

      Final Answer:
    `;
    
    console.log("Sending final prompt to Gemini to formulate response...");
    const finalResult = await chat.sendMessage(finalPrompt);
    const finalResponse = finalResult.response.text();

    return new Response(JSON.stringify({ response: finalResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});