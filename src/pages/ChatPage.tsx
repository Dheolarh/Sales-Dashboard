import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

// --- 1. INTENT CLASSIFIER ---
// Determines if the user's query is conversational or data-related.
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
      // Default to data_query on failure to be safe
      return 'data_query';
    }
  }
}


// --- 2. CONVERSATIONAL RESPONDER ---
// Handles non-data related parts of the conversation.
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


// --- 3. DYNAMIC QUERY ENGINE ---
// Dynamically generates and executes SQL based on a deep analysis of the user query and schema.
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
    // Simplified schema string for the prompt
    return data.map((table: any) => `Table \`${table.table_name}\`: Columns: ${table.columns.map((c: any) => c.column_name).join(', ')}`).join('\n');
  }

  async generateAndExecute(query: string, history: any[]): Promise<string> {
    const schema = await this.getSchema();
    const prompt = `
      You are a world-class data analyst who can write perfect PostgreSQL queries.
      Your task is to answer the user's question by generating a single, valid PostgreSQL query based on the provided database schema.

      DATABASE SCHEMA:
      ---
      ${schema}
      ---

      CONVERSATION HISTORY:
      ---
      ${JSON.stringify(history, null, 2)}
      ---

      USER'S QUESTION: "${query}"

      Follow these steps to generate the response:
      1.  **Analyze the Request**: Understand what the user is asking for. Identify key metrics, dimensions, and filters.
      2.  **Map to Schema**: Map the user's request to the available tables and columns in the schema. Think about synonyms (e.g., "items" -> "products", "sales" -> "transactions", "revenue" -> "total_amount").
      3.  **Construct SQL**: Write a single, valid PostgreSQL SELECT query to answer the question.
          - Use \`ilike\` for case-insensitive text matching.
          - For dates, use functions like \`NOW()\` and \`INTERVAL\`. For "last week", use a construction like \`transaction_time >= date_trunc('week', NOW() - interval '1 week') AND transaction_time < date_trunc('week', NOW())\`.
          - Always join tables when necessary (e.g., \`transactions\` to \`products\`).
          - Add a \`LIMIT 20\` to your query unless the user asks for a different limit.
      4.  **Final Response**: Format your final output as a single JSON object containing two keys: "thought_process" and "sql".
          - "thought_process": A brief, step-by-step explanation of how you understood the request and constructed the query.
          - "sql": The complete, valid PostgreSQL query string.

      Return ONLY the JSON object.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const responseJsonText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const responseJson = JSON.parse(responseJsonText);

      const sql = responseJson.sql;
      const thoughtProcess = responseJson.thought_process;

      // Execute the generated SQL
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

    // 1. Classify intent
    const classifier = new IntentClassifier();
    const intent = await classifier.classify(query, history);

    let responseText = "";

    if (intent === 'conversational') {
      // 2. Handle conversation
      const responder = new ConversationalResponder();
      responseText = await responder.generateResponse(query, history);
    } else {
      // 3. Handle data query
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