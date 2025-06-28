import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

// --- 1. INTENT CLASSIFIER ---
class IntentClassifier {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

  async classify(query: string, history: any[]): Promise<'conversational' | 'data_query' | 'capability_query'> {
    const prompt = `
      You are an intent classifier for a business AI assistant.
      Your task is to classify the user's query into one of three categories:

      - **conversational**: Greetings, thank you, how are you, general chat.
      - **data_query**: Specific questions about sales, products, customers, revenue, inventory, logins etc.
      - **capability_query**: Vague or open-ended questions about the AI's abilities, like "what can you do?", "what do you know?", or "help".

      Conversation History (for context):
      ${JSON.stringify(history.slice(-4), null, 2)}

      User Query: "${query}"

      Based on the query and history, what is the user's intent?
      Return ONLY one of the following: 'conversational', 'data_query', or 'capability_query'.
    `;
    try {
      const result = await this.model.generateContent(prompt);
      const classification = result.response.text().trim().toLowerCase();
      if (['data_query', 'capability_query'].includes(classification)) {
        return classification as 'data_query' | 'capability_query';
      }
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

// --- 3. DYNAMIC QUERY ENGINE (FINAL, STRICTEST VERSION) ---
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

  private async getSchema(forSummary = false): Promise<string> {
    const { data, error } = await this.supabase.rpc('get_schema_info');
    if (error) {
      console.error('Schema analysis failed:', error);
      return 'Database schema information unavailable';
    }

    if (forSummary) {
        return data.map((table: any) => {
            const description = table.description || `Contains data about ${table.table_name.replace(/_/g, ' ')}.`;
            return `- **${table.table_name}**: ${description}`;
        }).join('\n');
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

  async generateCapabilitySummary(): Promise<string> {
      const schemaSummary = await this.getSchema(true);
      const prompt = `
        You are a helpful AI assistant. A user has asked what you can do.
        Based on the following summary of the database schema, provide a brief, user-friendly summary of your capabilities.
        Explain the kinds of questions you can answer. Do not show the schema directly.

        Schema Summary:
        ---
        ${schemaSummary}
        ---

        Example Response:
        "I can access our database to answer questions about several areas:
        - **Product Information**: I can check for low stock, find product details, and list items.
        - **Sales Data**: I can find top-selling items, calculate revenue over periods, and view transaction details.
        - **User Activity**: I can see recent login activity."

        Your Response:
      `;
      try {
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch(e) {
          return "I can answer questions about products, sales, and user access logs."
      }
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
          - "who logged in", "logins", "logged in" refers to the \`access_logs\` table.
          - "items", "goods", "best selling" refers to the \`products\` table.
          - "sales" or "revenue" refers to the \`transactions\` table.
          - The primary key for \`products\` is \`id\`.
      3.  **JOINING**: Use the "Relationships" info from the schema to construct correct JOIN clauses. Example: to join products and transactions, use \`products.id = transactions.product_id\`.
      4.  **DATES**: For "last week", use: \`transaction_time >= date_trunc('week', NOW() - interval '1 week') AND transaction_time < date_trunc('week', NOW())\`.
      5.  **DISTINCT USERS**: To get a list of unique users or emails ordered by time, you MUST use \`DISTINCT ON (email)\` and include both \`email\` and \`login_time\` in the SELECT list, ordering by \`login_time DESC\`.
      6.  **NO SEMICOLON**: You MUST NOT include a semicolon (;) at the end of your SQL query.
      7.  **LIMIT**: Always add a \`LIMIT 20\` to your query unless otherwise specified by the user.

      **RESPONSE FORMAT (Strict JSON):**
      Your output MUST be a single, valid JSON object with two keys: "thought_process" and "sql".

      **Thought Process Steps (Must be followed):**
      1.  **Analyze Request**: State what the user wants.
      2.  **Map to Schema**: Identify the exact tables, columns, and joins needed from the schema.
      3.  **Construct SQL**: Write the query, following all rules above.
      4.  **Validate SQL**: Critically review the generated SQL. Confirm that every table and column exists in the schema and that all rules (especially for DISTINCT and JOINs) have been followed. This is the most important step.

      Return ONLY the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const responseTextCleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const responseJson = JSON.parse(responseTextCleaned);

      const thoughtProcess = responseJson.thought_process;
      const sql = (responseJson.sql || '').trim().replace(/;$/, '');

      if (!sql) {
        return "I'm sorry, I was unable to construct a query for that request. Please try rephrasing.";
      }

      const { data: queryData, error: queryError } = await this.supabase.rpc('execute_sql', { query: sql });

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
    const engine = new DynamicQueryEngine(supabaseAdmin);

    let responseText = "";

    if (intent === 'conversational') {
      const responder = new ConversationalResponder();
      responseText = await responder.generateResponse(query, history);
    } else if (intent === 'capability_query') {
        responseText = await engine.generateCapabilitySummary();
    } else { // data_query
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