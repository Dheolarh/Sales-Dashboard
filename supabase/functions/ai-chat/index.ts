// supabase/functions/ai-chat/index.ts

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Type Definitions (ensure these match your schema) ---
interface Product { id: string; name: string; sku: string; cost_price: number; selling_price: number; current_stock: number; }
interface AccessLog { id: string; admin_id: string; email: string; login_time: string; location: string; }

/**
 * =================================================================================
 * PREDEFINED FUNCTIONS (The AI's Initial Toolset)
 * =================================================================================
 */

async function getProductStock(supabase: SupabaseClient, productName: string): Promise<object> {
    console.log(`Tool called: getProductStock for "${productName}"`);
    const { data, error } = await supabase.from('products').select('name, current_stock').ilike('name', `%${productName}%`).single();
    if (error) return { error: `Product "${productName}" not found.` };
    return data;
}

async function getLastLogin(supabase: SupabaseClient): Promise<object> {
    console.log('Tool called: getLastLogin');
    const { data, error } = await supabase
        .from('access_logs')
        .select('*, admin:admins(full_name, email)')
        .order('login_time', { ascending: false })
        .limit(1)
        .single();
    if (error) return { error: `Could not retrieve last login: ${error.message}` };
    return data;
}

/**
 * =================================================================================
 * THE CORE AI AGENT LOGIC
 * =================================================================================
 */
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { query, history } = await req.json();
        // In a real app, you'd get this from the auth context
        const user = { id: '770e8400-e29b-41d4-a716-446655440001', name: 'John Anderson' }; 

        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);

        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-pro-latest',
            systemInstruction: `You are an autonomous AI Data Analyst and Super Admin with full read/write access to a Supabase-backed retail database.

Your capabilities go beyond static functions. You can:
1. Understand user prompts using natural language and fuzzy matching.
2. Search and analyze all tables dynamically.
3. Call predefined functions when available.
4. If a function doesn't exist to perform the task, you must:
   - Dynamically generate a new SQL function.
   - Immediately call the new function and return results.
5. Provide progress indicators like:
   - "Searching inventory database..."
   - "Calculating sales by region..."
   - "Generating exportable CSV..."
   - "Analyzing user access logs..."

You must ALWAYS respond with a complete and clear answer using reasoning, even if the user’s language is vague or incorrect.

### System Rules:
- Always call the simplest existing function if it handles the task.
- If no match exists, create a well-structured SQL query dynamically using the 'generateAndRunSql' tool.
- You can create multi-step function pipelines if needed.
- If generating a query, explain what it's doing and show a loading indicator.

### Existing Functions:
- getProductStock(productName)
- getLastLogin()
- generateAndRunSql({ task_description, sql_query })

Database schema includes:
- products(id, name, price, quantity, category)
- sales(id, product_id, amount, quantity, date, region)
- users(id, name, role)
- access_logs(id, admin_id, email, login_time, location, ip_address, success, user_agent)
- admins(id, email, username, full_name, role, location, is_active, last_login)

You are building toward becoming a fully self-adapting data analyst, replacing the need for a human analyst in reporting, querying, documentation, and decision support.`,
        });

        const tools = {
            functionDeclarations: [
                { name: 'getProductStock', description: "Get the current stock for a single product.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { productName: { type: FunctionDeclarationSchemaType.STRING } }, required: ["productName"] } },
                { name: 'getLastLogin', description: "Retrieves the most recent login record from the access logs, including admin details." },
                { name: 'generateAndRunSql', description: "Generates and executes a read-only SQL query when no other tool is suitable. Use this for any data retrieval, aggregation, or analytics not covered by other tools. The SQL query MUST be a SELECT statement.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { task_description: { type: FunctionDeclarationSchemaType.STRING, description: "A clear, natural language description of what data is needed." }, sql_query: { type: FunctionDeclarationSchemaType.STRING, description: "The precise, valid SQL query to execute." } }, required: ["task_description", "sql_query"] } },
            ]
        };

        const chat = model.startChat({ tools: [tools], history });
        const result = await chat.sendMessage(query);
        let response = result.response;

        // Agentic Loop
        while (response.functionCalls()) {
            const functionCalls = response.functionCalls();
            console.log(`AI is calling functions:`, functionCalls.map(c => c.name));

            const toolResponses = await Promise.all(functionCalls.map(async (call) => {
                let toolResult;
                console.log(`Executing: ${call.name} with args`, call.args);
                switch (call.name) {
                    case "getProductStock":
                        toolResult = await getProductStock(supabaseAdmin, call.args.productName);
                        break;
                    case "getLastLogin":
                        toolResult = await getLastLogin(supabaseAdmin);
                        break;
                    case "generateAndRunSql":
                        console.log(`AI is dynamically running SQL for task: ${call.args.task_description}`);
                        const { data, error } = await supabaseAdmin.rpc('execute_sql', { query: call.args.sql_query });
                        toolResult = error ? { error: error.message } : { data };
                        break;
                    default:
                        toolResult = { error: "Unknown function call" };
                }
                return { functionResponse: { name: call.name, response: toolResult } };
            }));

            // Send tool results back to the model
            const finalResult = await chat.sendMessage(JSON.stringify(toolResponses));
            response = finalResult.response;
        }

        return new Response(JSON.stringify({ response: response.text() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('CRITICAL ERROR in AI Agent execution:', error);
        return new Response(JSON.stringify({ error: `An internal error occurred: ${error.message}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});