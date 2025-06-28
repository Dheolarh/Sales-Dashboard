import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

// --- 1. INTENT CLASSIFIER ---
class IntentClassifier {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

  async classify(query: string, history: any[]): Promise<'conversational' | 'data_query'> {
    const prompt = `
      You are an intent classifier for a business AI assistant.
      Your task is to determine if the user's query is a general conversation or a request for data from a database.

      - **Conversational**: Greetings, thank you, how are you, general questions not related to business data.
      - **Data Query**: Questions about sales, products, customers, revenue, inventory, etc.

      Conversation History:
      ${JSON.stringify(history, null, 2)}

      User Query: "${query}"

      Based on the query and history, is this 'conversational' or a 'data_query'?
      Return ONLY the classification.
    `;
    try {
      const result = await this.model.generateContent(prompt);
      const classification = result.response.text().trim().toLowerCase();
      if (classification.includes('data_query')) return 'data_query';
      return 'conversational';
    } catch (e) {
      console.error("Intent classification failed:", e);
      return 'data_query'; // Default to data_query on failure
    }
  }
}

// --- 2. CONVERSATIONAL RESPONDER ---
class ConversationalResponder {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

  async generateResponse(query: string, history: any[]): Promise<string> {
    const prompt = `
      You are Stella, a friendly and helpful AI business assistant.
      The user is having a general conversation with you. Respond naturally and helpfully.
      DO NOT try to query a database or generate SQL.

      Conversation History:
      ${JSON.stringify(history, null, 2)}

      User's Latest Message: "${query}"

      Your response:
    `;
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      console.error("Conversational response failed:", e);
      return "I'm sorry, I had trouble processing that. Could you try rephrasing?";
    }
  }
}

// --- 3. DYNAMIC QUERY ENGINE (FINAL VERSION) ---
class DynamicQueryEngine {
    private model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro-latest',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
  });

  constructor(private supabase: SupabaseClient) {}

  private async getSchema(): Promise<string> {
    const { data, error } = await this.supabase.rpc('get_schema_info');
    if (error) {
      console.error('Schema analysis failed:', error);
      return 'Database schema information unavailable';
    }
    return data.map((table: any) =>
      `Table \`${table.table_name}\`:\n` +
      `  - Description: ${table.description || 'No description available.'}\n` +
      `  - Columns: ${table.columns.map((c: any) => `${c.column_name} (${c.data_type})`).join(', ')}\n`
    ).join('\n');
  }

  async generateAndExecute(query: string, history: any[]): Promise<string> {
    const schema = await this.getSchema();
    const prompt = `
      You are a hyper-intelligent data analyst AI. Your ONLY task is to answer the user's question by generating a valid PostgreSQL query against the provided database schema. You must follow all rules strictly.

      DATABASE SCHEMA:
      ---
      ${schema}
      ---

      USER'S QUESTION: "${query}"

      **RULES:**
      1.  **NEVER** use a table or column that is NOT explicitly listed in the DATABASE SCHEMA. Do not guess or hallucinate names.
      2.  "Stock" or "inventory" refers to the \`current_stock\` column in the \`products\` table.
      3.  "Sales" or "revenue" refer to the \`transactions\` table, specifically the \`total_amount\` column.
      4.  "Items" or "goods" refer to the \`products\` table.
      5.  For "last week", use a construction like: \`transaction_time >= date_trunc('week', NOW() - interval '1 week') AND transaction_time < date_trunc('week', NOW())\`.
      6.  Always add a \`LIMIT 20\` to your query unless the user specifies a different limit.
      7.  **DO NOT** include a semicolon (;) at the end of your SQL query.

      **RESPONSE FORMAT:**
      Your output MUST be a single, valid JSON object with two keys: "thought_process" and "sql".

      **Thought Process Steps (Must be followed):**
      1.  **Analyze Request**: Briefly state what the user wants in simple terms.
      2.  **Map to Schema**: Identify the exact tables and columns from the schema that are needed.
      3.  **Construct SQL**: Write the initial SQL query based on the mapping, ensuring no semicolon at the end.
      4.  **Validate SQL**: Critically review the generated SQL. Ensure every table and column exists in the schema provided above and that there is no trailing semicolon.

      **EXAMPLE for "What products are low in stock?"**
      {
        "thought_process": "1. Analyze Request: The user wants a list of products with low inventory.\\n2. Map to Schema: I need the 'name' and 'current_stock' columns from the 'products' table.\\n3. Construct SQL: I will write a SELECT query on the 'products' table, filtering where 'current_stock' is below a reasonable threshold, like 50.\\n4. Validate SQL: The table 'products' and columns 'name' and 'current_stock' all exist in the schema. The query is valid and has no trailing semicolon.",
        "sql": "SELECT name, current_stock FROM products WHERE current_stock < 50 ORDER BY current_stock ASC LIMIT 20"
      }

      Now, generate the response for the user's question. Return ONLY the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const responseJsonText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const responseJson = JSON.parse(responseJsonText);

      const thoughtProcess = responseJson.thought_process;
      // *** THIS IS THE FIX ***
      // Clean the SQL to remove any accidental semicolons before execution.
      const sql = (responseJson.sql || '').trim().replace(/;$/, '');

      // Execute the cleaned SQL
      const { data: queryData, error: queryError } = await this.supabase.rpc('execute_sql', { query: sql });

      // Format the final response for the user
      let responseText = `🧠 **Thought Process:**\n${thoughtProcess}\n\n`;
      responseText += `💻 **Executed SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;

      if (queryError) {
        responseText += `❌ **Execution Error:** ${queryError.message}\n\nThis might be because I made a mistake in the SQL query. Could you try rephrasing your question?`;
      } else if (queryData?.error) {
        responseText += `❌ **SQL Error:** ${queryData.error}\n\nThis usually means the generated query was invalid. I'm still learning the schema!`;
      } else {
        const resultData = Array.isArray(queryData) ? queryData : [];
        responseText += `📊 **Returned ${resultData.length} rows:**\n\n`;
        if (resultData.length > 0) {
          responseText += "```json\n" + JSON.stringify(resultData, null, 2) + "\n```";
        } else {
          responseText += "The query ran successfully, but returned no results.";
        }
      }
      return responseText;

    } catch (e) {
      console.error("Query generation/execution failed:", e);
      return `I'm sorry, I encountered an error while trying to answer your question. The AI model may have returned an invalid response. Details: ${e.message}`;
    }
  }
}

// --- MAIN FUNCTION ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, history } = await req.json();
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const classifier = new IntentClassifier();
    const intent = await classifier.classify(query, history);

    let responseText = "";

    if (intent === 'conversational') {
      const responder = new ConversationalResponder();
      responseText = await responder.generateResponse(query, history);
    } else {
      const engine = new DynamicQueryEngine(supabaseAdmin);
      responseText = await engine.generateAndExecute(query, history);
    }

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorResponse = `❌ **Critical Error:** ${error.message || 'Unknown error'}\n\n`;
    return new Response(JSON.stringify({ response: errorResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});