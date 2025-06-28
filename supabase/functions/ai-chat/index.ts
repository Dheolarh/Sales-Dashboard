import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize the AI models
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
const textEmbeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- STEP 1: INTENT CLASSIFICATION ---
// This function determines what the user wants to do.
async function classifyIntent(query: string, history: any[]): Promise<'semantic_search' | 'write_operation' | 'capability_query' | 'conversational'> {
    const prompt = `
        You are a master AI intent classifier. Your job is to categorize the user's request into one of four strict types.

        1.  **semantic_search**: A question that requires LOOKING UP or FINDING information in the database. This is for reading data.
            - Examples: "are there any gaming consoles?", "top selling items", "who logged in?", "is ps5 in stock?"

        2.  **write_operation**: A request to ADD, UPDATE, DELETE, CHANGE, or REMOVE data. This is for changing data.
            - Examples: "add a new product", "update the stock for Coca-Cola", "remove the test user"

        3.  **capability_query**: An open-ended question about your abilities.
            - Examples: "what can you do?", "what actions can you perform?", "help"

        4.  **conversational**: General chat.
            - Examples: "hello", "thank you", "what time is it?"

        Conversation History (for context):
        ${JSON.stringify(history.slice(-2), null, 2)}

        User Query: "${query}"

        Return ONLY ONE of the following classifications: 'semantic_search', 'write_operation', 'capability_query', 'conversational'.
    `;
    try {
        const result = await model.generateContent(prompt);
        const classification = result.response.text().trim();
        if (['semantic_search', 'write_operation', 'capability_query', 'conversational'].includes(classification)) {
            return classification as any;
        }
        return 'conversational';
    } catch (e) {
        console.error("Intent classification failed:", e);
        return 'conversational';
    }
}

// --- STEP 2: RESPONSE GENERATION FUNCTIONS ---

// Function for when the user wants to search for something.
async function handleSemanticSearch(query: string, supabase: SupabaseClient): Promise<string> {
    try {
        // Create a vector embedding from the user's query
        const embeddingResult = await textEmbeddingModel.embedContent(query);
        const embedding = embeddingResult.embedding.values;

        // Use the vector to search the database for similar products
        const { data: searchData, error: searchError } = await supabase.rpc('search_products', {
            query_embedding: embedding,
            similarity_threshold: 0.4, // We can adjust this for broader or narrower matches
            match_count: 5
        });

        if (searchError) throw searchError;

        if (!searchData || searchData.length === 0) {
            return "I couldn't find any products in stock that match your description. You could try being more specific.";
        }

        return `I found a few products that seem related to your search:\n\n` + "```json\n" + JSON.stringify(searchData, null, 2) + "\n```";

    } catch (e) {
        console.error("Semantic search failed:", e);
        return "I'm sorry, I had trouble performing a search. Please try rephrasing your question.";
    }
}

// Function for when the user wants to change data.
async function handleWriteOperation(query: string): Promise<string> {
    const prompt = `
        You are an AI assistant starting an interactive workflow. The user wants to add, update, or delete data.
        Your task is to analyze their request and ask a clear, concise follow-up question to get the information you need.

        User request: "${query}"

        Analyze the request and determine the user's goal (e.g., 'add a product', 'update a company', 'delete a category').
        Then, formulate the question you need to ask to proceed.

        - If they want to ADD a product, ask for the necessary details (name, sku, price, stock, etc.).
        - If they want to UPDATE something, ask for what to identify it and what fields to change.
        - If they want to DELETE something, ask for the specific item to confirm.

        Example Response for "I want to add a product":
        "I can help with that. To add a new product, please provide me with the following details: Name, SKU, Cost Price, Selling Price, and Current Stock."

        Your response should be ONLY the follow-up question.
     `;
     try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
     } catch (e) {
         console.error("Write operation handling failed:", e);
         return "I understand you want to modify the database, but I had trouble figuring out the next step. Could you please specify exactly what you want to do?";
     }
}

// Function for explaining the AI's capabilities
function handleCapabilityQuery(): string {
    return `I can help with several tasks related to our database:
- **Search for Information**: I can find products, transactions, or user logs based on your description. For example, you can ask 'are there any fizzy drinks in stock?' or 'who logged in yesterday?'.
- **Guide Data Modification**: If you want to add, update, or delete an item, I can walk you through the process by asking for the information needed to perform the action.`
}

// --- STEP 3: MAIN SERVER ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const { query, history = [] } = await req.json();
        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

        // 1. Determine the user's intent
        const intent = await classifyIntent(query, history);

        let responseText = "";

        // 2. Route to the correct handler based on intent
        switch (intent) {
            case 'semantic_search':
                responseText = await handleSemanticSearch(query, supabaseAdmin);
                break;
            case 'write_operation':
                responseText = await handleWriteOperation(query);
                break;
            case 'capability_query':
                responseText = handleCapabilityQuery();
                break;
            case 'conversational':
                responseText = "I'm here to help with your business data. How can I assist you with products, sales, or user information?";
                break;
            default:
                responseText = "I'm not sure how to handle that request. Please try rephrasing.";
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