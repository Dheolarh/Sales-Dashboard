import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Tool Implementations ---

async function getProductStock(supabase, productName) {
  console.log(`Tool called: getProductStock for ${productName}`);
  const { data: product, error } = await supabase
    .from('products')
    .select('name, current_stock')
    .ilike('name', `%${productName}%`)
    .single();
  if (error || !product) {
    return { error: `Product '${productName}' not found.` };
  }
  return product;
}

async function getProductSales(supabase, productName, startDate, endDate) {
  console.log(`Tool called: getProductSales for ${productName} from ${startDate} to ${endDate}`);
  const { data: product, error: productError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (productError || !product) {
    return { error: `Product '${productName}' not found.` };
  }

  let query = supabase.from('transactions').select('quantity, total_amount').eq('product_id', product.id);
  if (startDate) query = query.gte('transaction_time', startDate);
  if (endDate) query = query.lte('transaction_time', endDate);

  const { data, error } = await query;
  if (error) {
    return { error: "Failed to retrieve sales data." };
  }

  const totalQuantity = data.reduce((sum, t) => sum + t.quantity, 0);
  const totalRevenue = data.reduce((sum, t) => sum + t.total_amount, 0);
  return { productName: product.name, totalQuantity, totalRevenue };
}

async function addProduct(supabase, productName, stock, selling_price) {
  console.log(`Tool called: addProduct ${productName}`);
  return { status: 'error', message: 'Adding products requires SKU, Company, and Category. Please use the "Add Product" form in the Products page.' };
}

async function updateStock(supabase, productName, newStock) {
  console.log(`Tool called: updateStock for ${productName} to ${newStock}`);
  const { data: product, error: productError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (productError || !product) {
    return { error: `Product '${productName}' not found.` };
  }
  const { data, error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id).select().single();
  if (error) {
    return { error: 'Failed to update stock.' };
  }
  return { status: 'success', productName: data.name, newStock: data.current_stock };
}

async function getOverallStats(supabase, timeRange) {
  console.log(`Tool called: getOverallStats for ${timeRange}`);
  // This is a simplified example.
  return { status: "success", totalRevenue: 15203.50, totalTransactions: 432, timeRange: timeRange };
}

async function getUserActivity(supabase, adminName) {
  console.log(`Tool called: getUserActivity for ${adminName}`);
  const { data: admin, error: adminError } = await supabase.from('admins').select('id, full_name').ilike('full_name', `%${adminName}%`).single();
  if (adminError || !admin) {
    return { error: `Admin '${adminName}' not found.` };
  }
  const { data: activities, error: activityError } = await supabase.from('activity_logs').select('action_type, details, created_at').eq('admin_id', admin.id).order('created_at', { ascending: false }).limit(10);
  if (activityError) {
    return { error: 'Failed to retrieve activity.' };
  }
  return { adminName: admin.full_name, recentActivity: activities };
}

async function listProductsByCategory(supabase, categoryName) {
  console.log(`Tool called: listProductsByCategory for ${categoryName}`);
  const { data: category, error: catError } = await supabase.from('categories').select('id, name').ilike('name', `%${categoryName}%`).single();
  if (catError || !category) {
    return { error: `Category '${categoryName}' not found.` };
  }
  const { data: products, error: prodError } = await supabase.from('products').select('name, sku, current_stock').eq('category_id', category.id);
  if (prodError) {
    return { error: 'Failed to retrieve products for that category.' };
  }
  // Return only top 10 to keep response concise, but mention the total count.
  return { categoryName: category.name, productCount: products.length, products: products.slice(0, 10) };
}


// --- Main Request Handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, history, user } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const dbSchemaContext = `
      - products: Product catalog. Columns: id, name, sku, company_id, category_id, cost_price, selling_price, current_stock, is_active.
      - transactions: Sales records. Columns: product_id, quantity, total_amount, customer_location, transaction_time.
      - admins: Administrator users. Columns: id, full_name, role, location.
      - access_logs: Admin login events. Columns: admin_id, login_time, success, location, ip_address.
      - inventory_logs: Audit trail for stock changes. Columns: product_id, admin_id, change_type ('sale', 'restock', 'adjustment'), quantity_change, reason.
      - activity_logs: Detailed log of user actions. Columns: admin_id, session_id, action_type, details (jsonb), timestamp.
    `;

    const tools = [{
      functionDeclarations: [
        { name: 'getProductStock', description: 'Get the current stock quantity of a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'getProductSales', description: 'Get the total units sold and revenue for a product, optionally in a date range.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, startDate: { type: 'STRING' }, endDate: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'updateStock', description: 'Update the stock quantity for an existing product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, newStock: { type: 'NUMBER' } }, required: ['productName', 'newStock'] } },
        { name: 'getUserActivity', description: "Get recent dashboard actions for a specific administrator.", parameters: { type: 'OBJECT', properties: { adminName: { type: 'STRING' } }, required: ['adminName'] } },
        { name: 'listProductsByCategory', description: 'Get a list of all products belonging to a specific category.', parameters: { type: 'OBJECT', properties: { categoryName: { type: 'STRING' } }, required: ['categoryName'] } },
        { name: 'addProduct', description: 'Add a new product to the inventory.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, stock: { type: 'NUMBER' }, selling_price: { type: 'NUMBER' } }, required: ['productName', 'stock', 'selling_price'] } },
        { name: 'getOverallStats', description: 'Get overall statistics like total revenue and transactions for a time range like "today", "last month", or "all time".', parameters: { type: 'OBJECT', properties: { timeRange: { type: 'STRING', enum: ["today", "last month", "all time"] } }, required: ['timeRange'] } },
      ]
    }];

    const chat = model.startChat({
      tools,
      history: history || [] // Initialize with past conversation
    });

    const userName = user?.name || 'the current user';
    const system_prompt = `You are Stella, a highly intelligent AI business assistant for the QuickCart dashboard. Your purpose is to provide precise information and perform actions by using your available tools. You are speaking with ${userName}.
    **Core Directives:**
    1. **Analyze Intent:** Do not rely on keywords. Deeply analyze the user's prompt to understand their true intent. Use semantic understanding.
    2. **Tool-First Approach:** Your primary method of answering is by using tools. Do not guess.
    3. **Deductive Reasoning:** If a user's query is ambiguous or a tool fails, deduce the user's goal and ask a clarifying question.
    4. **Concise & Professional:** Be direct. Do not use conversational filler. Do not address the user by their name in every response.
    5. **Schema Awareness:** You have profound knowledge of the database schema: ${dbSchemaContext}
    6. **Context:** The current date is ${new Date().toDateString()}. The user's location is Nigeria.`;

    const messageToSend = (history && history.length > 0)
      ? query
      : `${system_prompt}\n\nUser query: "${query}"`;

    const result = await chat.sendMessage(messageToSend);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      let toolResult;
      switch (call.name) {
        case "getProductStock": toolResult = await getProductStock(supabase, call.args.productName); break;
        case "getProductSales": toolResult = await getProductSales(supabase, call.args.productName, call.args.startDate, call.args.endDate); break;
        case "updateStock": toolResult = await updateStock(supabase, call.args.productName, call.args.newStock); break;
        case "getUserActivity": toolResult = await getUserActivity(supabase, call.args.adminName); break;
        case "listProductsByCategory": toolResult = await listProductsByCategory(supabase, call.args.categoryName); break;
        case "addProduct": toolResult = await addProduct(supabase, call.args.productName, call.args.stock, call.args.selling_price); break;
        case "getOverallStats": toolResult = await getOverallStats(supabase, call.args.timeRange); break;
        default: toolResult = { error: "Unknown function call" };
      }
      const finalResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
      return new Response(JSON.stringify({ response: finalResult.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('CRITICAL ERROR in function execution:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
