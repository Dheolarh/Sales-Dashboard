import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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
      - **Data Query**: Questions about sales, products, customers, revenue, inventory, logins etc.

      Conversation History (for context):
      ${JSON.stringify(history.slice(-4), null, 2)}

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
      return 'data_query';
    }
  }
}

// --- 2. CONVERSATIONAL RESPONDER ---
class ConversationalResponder {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

<<<<<<< HEAD
  async generateResponse(query: string, history: any[]): Promise<string> {
    const prompt = `
      You are Stella, a friendly and helpful AI business assistant.
      The user is having a general conversation with you. Respond naturally and helpfully.
      DO NOT try to query a database or generate SQL.

      Conversation History:
      ${JSON.stringify(history.slice(-4), null, 2)}

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

// --- 3. DYNAMIC QUERY ENGINE (FINAL, STRICT VERSION) ---
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
    return data.map((table: any) => {
        let tableInfo = `Table \`${table.table_name}\`:\n`;
        if (table.description) tableInfo += `  - Description: ${table.description}\n`;
        tableInfo += `  - Columns: ${table.columns.map((c: any) => `${c.column_name} (${c.data_type})`).join(', ')}\n`;
        if (table.relationships && table.relationships.length > 0) {
            tableInfo += `  - Relationships: ${table.relationships.map((r: any) => `\`${r.from_column}\` -> \`${r.to_table}\`.\`${r.to_column}\``).join(', ')}\n`;
        }
        return tableInfo;
    }).join('\n');
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

      **MANDATORY RULES:**
      1.  **NEVER** use a table or column that is NOT explicitly listed in the DATABASE SCHEMA. Do not guess.
      2.  **EXPLICIT MAPPINGS**:
          - "logins" or "logged in" refers to the \`access_logs\` table.
          - "items", "goods", or "best selling" refers to the \`products\` table.
          - "sales" or "revenue" refers to the \`transactions\` table.
          - The primary key for \`products\` is \`id\`.
      3.  **JOINING**: Use the "Relationships" info from the schema to construct correct JOIN clauses. Example: to join products and transactions, use \`products.id = transactions.product_id\`.
      4.  **DATES**: For "last week", use: \`transaction_time >= date_trunc('week', NOW() - interval '1 week') AND transaction_time < date_trunc('week', NOW())\`.
      5.  **NO SEMICOLON**: You MUST NOT include a semicolon (;) at the end of your SQL query.
      6.  **LIMIT**: Always add a \`LIMIT 20\` to your query unless otherwise specified by the user.

      **RESPONSE FORMAT (Strict JSON):**
      Your output MUST be a single, valid JSON object with two keys: "thought_process" and "sql".

      **Thought Process Steps (Must be followed):**
      1.  **Analyze Request**: State what the user wants.
      2.  **Map to Schema**: Identify the exact tables, columns, and joins needed from the schema.
      3.  **Construct SQL**: Write the query.
      4.  **Validate SQL**: Critically review the generated SQL. Confirm that every table and column exists in the schema and that all JOIN conditions are correct based on the 'Relationships' section. This is the most important step.

      Return ONLY the JSON object.
    `;

=======
>>>>>>> parent of 070ecd1 (Add product fix)
    try {
      const result = await this.model.generateContent(prompt);
      const responseTextCleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const responseJson = JSON.parse(responseTextCleaned);

      const thoughtProcess = responseJson.thought_process;
      const sql = (responseJson.sql || '').trim().replace(/;$/, '');

<<<<<<< HEAD
      if (!sql) {
        return "I'm sorry, I was unable to construct a query for that request. Please try rephrasing.";
      }

      const { data: queryData, error: queryError } = await this.supabase.rpc('execute_sql', { query: sql });
=======
        const sql = postgres(supabaseDbUrl);
>>>>>>> parent of 070ecd1 (Add product fix)

      let responseText = `🧠 **Thought Process:**\n${thoughtProcess}\n\n`;
      responseText += `💻 **Executed SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;

      if (queryError || queryData?.error) {
        const dbError = queryError ? queryError.message : queryData.error;
        responseText += `❌ **SQL Error:** ${dbError}\n\nThis usually means the generated query was invalid. I'm still learning the schema!`;
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