import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

// --- 1. INTENT CLASSIFICATION ---
// This is the single most important step. It MUST be accurate.
async function classifyIntent(query: string, history: any[]): Promise<'conversational' | 'data_query' | 'capability_query' | 'unsupported_query'> {
    const prompt = `
        You are a hyper-intelligent AI intent classifier. Your job is to categorize the user's request into one of four types. Be very strict.

        1.  **data_query**: A specific question that requires reading data from the database.
            - Examples: "What were our top selling items?", "Who logged in last?", "Show me all products with less than 10 stock."

        2.  **capability_query**: An open-ended question about your abilities related to the database.
            - Examples: "What can you do?", "What information do you have access to?", "help"

        3.  **unsupported_query**: A request to CHANGE, ADD, MODIFY, or DELETE data. This is for any write operation.
            - Examples: "add a new product", "update the stock for Coca-Cola", "delete the test user"

        4.  **conversational**: A general greeting, chat, or question not related to the database.
            - Examples: "hello", "thank you", "what is the capital of Nigeria?"

        Conversation History (for context):
        ${JSON.stringify(history.slice(-2), null, 2)}

        User Query: "${query}"

        Return ONLY ONE of the following classifications: 'data_query', 'capability_query', 'unsupported_query', 'conversational'.
    `;
    try {
        const result = await model.generateContent(prompt);
        const classification = result.response.text().trim();
        if (['data_query', 'capability_query', 'unsupported_query', 'conversational'].includes(classification)) {
            return classification as any;
        }
        // If the model returns something unexpected, default to a safe option.
        return 'conversational';
    } catch (e) {
        console.error("Critical Intent classification failed:", e);
        return 'conversational';
    }
}


// --- 2. RESPONSE GENERATORS ---

// For casual conversation
async function generateConversationalResponse(query: string): Promise<string> {
    const prompt = `You are Stella, a friendly and helpful AI business assistant. The user is having a general conversation with you. Respond naturally. The current time is ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}. The user is in Nigeria.

    User's message: "${query}"`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// For explaining what the AI can do
async function generateCapabilityResponse(supabase: SupabaseClient): Promise<string> {
    const { data, error } = await supabase.rpc('get_schema_info');
    if (error) {
        return "I can answer questions about our business data, but I'm having trouble accessing the details right now.";
    }
    const schemaSummary = data.map((t: any) => `- **${t.table_name.replace(/_/g, ' ')}**: I can answer questions about ${t.description || t.table_name.replace(/_/g, ' ')}.`).join('\n');

    const prompt = `You are Stella, an AI assistant. The user has asked what you can do regarding the database. Based on the following schema summary, provide a brief, user-friendly list of your capabilities. Do not show the raw schema. Be conversational.

    Schema Summary:
    ${schemaSummary}

    Example Response:
    "I can access our business database to help with a few things:
    - **Sales & Transactions**: I can find top-selling items, see recent transactions, or check sales figures.
    - **Product Information**: I can look up product details or check for low stock levels.
    - **User Activity**: I can see recent login activity from the access logs.

    What would you like to know?"

    Your Response (be helpful and conversational):`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

// For explaining limitations (like adding/deleting data)
function generateUnsupportedResponse(): string {
    return "I understand you want to make a change to the database. However, for security reasons, my capabilities are limited to reading and analyzing information. I cannot add, update, or delete any data. This type of action must be performed through the main application dashboard.";
}

// The main SQL generation engine
async function generateSqlAndExecute(query: string, supabase: SupabaseClient): Promise<string> {
    const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_info');
    if (schemaError) {
        return "I'm sorry, I'm having trouble connecting to the database to answer your question.";
    }
    const schema = schemaData.map((table: any) => {
        let tableInfo = `Table \`${table.table_name}\`:\n`;
        if (table.description) tableInfo += `  - Description: ${table.description}\n`;
        tableInfo += `  - Columns: ${table.columns.map((c: any) => `${c.column_name} (${c.data_type})`).join(', ')}\n`;
        if (table.relationships && table.relationships.length > 0) {
            tableInfo += `  - Relationships: ${table.relationships.map((r: any) => `\`${r.from_column}\` -> \`${r.to_table}\`.\`${r.to_column}\``).join(', ')}\n`;
        }
        return tableInfo;
    }).join('\n');

    const prompt = `
        You are a world-class data analyst AI. Your ONLY task is to answer the user's question by generating a valid PostgreSQL SELECT query based on the provided database schema.

        DATABASE SCHEMA:
        ---
        ${schema}
        ---

        USER'S QUESTION: "${query}"

        **MANDATORY RULES:**
        1.  ONLY use tables and columns listed in the schema.
        2.  JOIN tables using the "Relationships" info. The primary key for 'products' is 'id'.
        3.  To get unique users by last login, use \`SELECT DISTINCT ON (email) email, login_time FROM access_logs ORDER BY email, login_time DESC\`.
        4.  DO NOT include a semicolon (;) at the end of the query.
        5.  If you cannot answer the question with a SELECT query, you MUST NOT generate any SQL.

        **RESPONSE FORMAT (Strict JSON):**
        Your output MUST be a single, valid JSON object with "thought_process" and "sql" keys. If you cannot generate a query, the "sql" value must be an empty string.

        {
          "thought_process": "Your step-by-step reasoning on how you built the query, including a validation step.",
          "sql": "Your generated SELECT query here, or an empty string."
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseJson = JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim());

        const thoughtProcess = responseJson.thought_process;
        const sql = (responseJson.sql || '').trim().replace(/;$/, '');

        if (!sql) {
            return `I'm sorry, I wasn't able to construct a query to answer that question. It might be beyond my current capabilities.`;
        }

        const { data: queryData, error: queryError } = await supabase.rpc('execute_sql', { query: sql });

        let responseText = `🧠 **Thought Process:**\n${thoughtProcess}\n\n`;
        responseText += `💻 **Executed SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;

        if (queryError || queryData?.error) {
            const dbError = queryError ? queryError.message : queryData.error;
            responseText += `❌ **SQL Error:** ${dbError}`;
        } else {
            const resultData = Array.isArray(queryData) ? queryData : [];
            responseText += `📊 **Returned ${resultData.length} rows:**\n\n`;
            responseText += resultData.length > 0 ? "```json\n" + JSON.stringify(resultData, null, 2) + "\n```" : "The query ran successfully, but returned no results.";
        }
        return responseText;

    } catch (e) {
        console.error("SQL Generation/Execution failed:", e);
        return `I encountered an error trying to process your request. Details: ${e.message}`;
    }
}


// --- MAIN SERVER LOGIC ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { query, history } = await req.json();
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        const intent = await classifyIntent(query, history);

        let responseText = "";

        switch (intent) {
            case 'data_query':
                responseText = await generateSqlAndExecute(query, supabaseAdmin);
                break;
            case 'capability_query':
                responseText = await generateCapabilityResponse(supabaseAdmin);
                break;
            case 'unsupported_query':
                responseText = generateUnsupportedResponse();
                break;
            case 'conversational':
                responseText = await generateConversationalResponse(query);
                break;
            default:
                responseText = "I'm not sure how to handle that request.";
        }

        return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ response: `Critical Error: ${error.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});