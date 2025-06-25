// FINAL UPGRADED VERSION 2.0: supabase/functions/ai-chat/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Tool Implementations ---
// (These are the functions that perform actions on your database)

async function getProductStock(supabase, productName) { /* ... same as before ... */ }
async function getProductSales(supabase, productName) { /* ... same as before ... */ }
async function addProduct(supabase, productName, stock, selling_price) { /* ... same as before ... */ }
async function updateStock(supabase, productName, newStock) { /* ... same as before ... */ }
async function getOverallStats(supabase, timeRange) { /* ... same as before ... */ }

// *** NEW TOOL: Get a specific admin's recent activity ***
async function getUserActivity(supabase, adminName) {
  console.log(`Tool called: getUserActivity for ${adminName}`);

  // Find the admin by name to get their ID
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, full_name')
    .ilike('full_name', `%${adminName}%`)
    .single();

  if (adminError || !admin) {
    return { error: `Admin '${adminName}' not found.` };
  }

  // Fetch the last 5 login events for this admin
  const { data: logins, error: loginError } = await supabase
    .from('access_logs') // Fetches from the access_logs table
    .select('login_time, location, ip_address, success')
    .eq('admin_id', admin.id)
    .order('login_time', { ascending: false })
    .limit(5);

  // Fetch the last 5 inventory changes made by this admin
  const { data: inventoryChanges, error: inventoryError } = await supabase
    .from('inventory_logs') // Fetches from the inventory_logs table
    .select('created_at, change_type, quantity_change, reason, product:products(name)')
    .eq('admin_id', admin.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (loginError || inventoryError) {
    return { error: 'Failed to retrieve activity logs.' };
  }

  return {
    adminName: admin.full_name,
    recentLogins: logins,
    recentInventoryActivity: inventoryChanges,
  };
}

// --- Main Request Handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, user } = await req.json();

    // Initialize clients
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // *** ADVANCED: Provide database schema context to the AI ***
    const dbSchemaContext = `
      The following tables are available:
      - products: Contains product information like name, sku, company_id, category_id, cost_price, selling_price, current_stock.
      - transactions: Contains sales records with product_id, quantity, total_amount, customer_location, transaction_time.
      - admins: Contains administrator details like email, username, full_name, role.
      - access_logs: Tracks admin login events (admin_id, login_time, success).
      - inventory_logs: Tracks changes to stock (product_id, admin_id, change_type, quantity_change, reason).
    `;

    // *** UPGRADED: All tools, including the new getUserActivity tool ***
    const tools = [
      {
        functionDeclarations: [
          { name: 'getProductStock', description: 'Get the current stock quantity of a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
          { name: 'getProductSales', description: 'Get the total units sold and revenue for a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
          { name: 'addProduct', description: 'Add a new product to the inventory and store.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, stock: { type: 'NUMBER' }, selling_price: { type: 'NUMBER' } }, required: ['productName', 'stock', 'selling_price'] } },
          { name: 'updateStock', description: 'Update the stock quantity for an existing product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, newStock: { type: 'NUMBER' } }, required: ['productName', 'newStock'] } },
          { name: 'getOverallStats', description: 'Get overall statistics like total revenue and total number of transactions for a given time range like "today", "last month", or "all time".', parameters: { type: 'OBJECT', properties: { timeRange: { type: 'STRING', enum: ["today", "last month", "all time"] } }, required: ['timeRange'] } },
          { name: 'getUserActivity', description: "Get the recent login history and inventory-related activity for a specific administrator.", parameters: { type: 'OBJECT', properties: { adminName: { type: 'STRING' } }, required: ['adminName'] } },
        ]
      }
    ];

    const chat = model.startChat({ tools });

    // *** UPGRADED: A much more detailed system prompt for smarter behavior ***
    const userName = user?.name || 'the current user';
    const system_prompt = `You are Stella, an extremely intelligent AI assistant for the QuickCart dashboard.
    - Your primary role is to provide information and perform actions by using the tools you have available.
    - You are currently speaking with an admin named ${userName}. Address them by their name occasionally and naturally.
    - **NLU Excellence**: You are smart enough to understand user intent from minimal information. Handle typos, different casing, and synonyms. If a user says "Milo" or "milo classic", you should know they likely mean the product containing "Milo".
    - **Proactive Assistance**: If a user's query is vague (e.g., "show sales"), do not fail. Instead, ask a clarifying question based on the tools you have (e.g., "Certainly, ${userName}. Are you interested in the overall sales stats for a period like 'today' or 'last month', or sales for a specific product?").
    - **Formatting**: Keep responses concise. Do not use markdown like asterisks for bolding. Use bullet points only for lists where it improves readability.
    - **Database Context**: You have knowledge of the database schema to help you understand what's possible. The schema is: ${dbSchemaContext}
    - The current date is ${new Date().toDateString()}. The user's location is Nigeria.`;

    const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      let toolResult;
      // The switch statement determines which tool to run based on the AI's decision
      switch (call.name) {
        case "getProductStock": toolResult = await getProductStock(supabase, call.args.productName); break;
        case "getProductSales": toolResult = await getProductSales(supabase, call.args.productName); break;
        case "addProduct": toolResult = await addProduct(supabase, call.args.productName, call.args.stock, call.args.selling_price); break;
        case "updateStock": toolResult = await updateStock(supabase, call.args.productName, call.args.newStock); break;
        case "getOverallStats": toolResult = await getOverallStats(supabase, call.args.timeRange); break;
        case "getUserActivity": toolResult = await getUserActivity(supabase, call.args.adminName); break; // Handle the new tool
        default: toolResult = { error: "Unknown function call" };
      }

      // Send the tool's result back to the AI to generate a final response
      const finalResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
      return new Response(JSON.stringify({ response: finalResult.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If no tool is called, return the direct conversational response
    return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('CRITICAL ERROR in function execution:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});