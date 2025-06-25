import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Tool Implementations ---
// Note: All functions now default 'args' to an empty object {} to prevent crashes
// when the AI calls a function without parameters.

// --- Product & Inventory Management ---

async function getProductDetails(supabase, args = {}) {
  const { productName } = args;
  if (!productName) return { error: "Product name is required." };
  console.log(`Tool called: getProductDetails for ${productName}`);
  const { data: product, error } = await supabase
    .from('products')
    .select('name, sku, description, selling_price, current_stock, company:companies(name), category:categories(name)')
    .ilike('name', `%${productName}%`)
    .single();
  if (error || !product) {
    return { error: `Product '${productName}' not found.` };
  }
  return product;
}

async function listProducts(supabase, args = {}) {
  const { page = 1, limit = 10, category, company } = args;
  console.log(`Tool called: listProducts with page=${page}, limit=${limit}, category=${category}, company=${company}`);
  let query = supabase.from('products').select('name, current_stock, selling_price', { count: 'exact' });

  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').ilike('name', `%${category}%`).single();
    if (cat) query = query.eq('category_id', cat.id);
  }
  if (company) {
    const { data: comp } = await supabase.from('companies').select('id').ilike('name', `%${company}%`).single();
    if (comp) query = query.eq('company_id', comp.id);
  }

  const { data, error, count } = await query.range((page - 1) * limit, page * limit - 1);
  if (error) {
    return { error: 'Failed to retrieve products.' };
  }
  return { totalProducts: count, showing: data.length, products: data };
}


async function findProducts(supabase, args = {}) {
  const { searchTerm } = args;
  if (!searchTerm) return { error: "A search term is required." };
  console.log(`Tool called: findProducts for ${searchTerm}`);
  const { data, error } = await supabase
    .from('products')
    .select('name, sku, current_stock')
    .ilike('name', `%${searchTerm}%`)
    .limit(10);
  if (error) {
    return { error: `Failed to find products.` };
  }
  return { productCount: data.length, products: data };
}

async function getProductStock(supabase, args = {}) {
  const { productName } = args;
  if (!productName) return { error: "Product name is required." };
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

async function updateStock(supabase, args = {}) {
  const { productName, newStock } = args;
  if (!productName || newStock === undefined) return { error: "Product name and new stock quantity are required." };
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

async function getOutOfStockProducts(supabase) {
  console.log(`Tool called: getOutOfStockProducts`);
  const { data, error } = await supabase
    .from('products')
    .select('name, sku, company:companies(name)')
    .eq('current_stock', 0);
  if (error) {
    return { error: 'Failed to retrieve out of stock products.' };
  }
  return { productCount: data.length, products: data };
}

async function getRecentDeletions(supabase, args = {}) {
  const { timeRange } = args;
  if (!timeRange) return { error: "A time range ('today' or 'last 7 days') is required." };
  console.log(`Tool called: getRecentDeletions for ${timeRange}`);
  let startDate = new Date();
  if (timeRange === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (timeRange === 'last 7 days') {
    startDate.setDate(startDate.getDate() - 7);
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select('details, created_at, admin:admins(full_name)')
    .eq('action_type', 'DELETE_PRODUCT')
    .gte('created_at', startDate.toISOString());

  if (error) {
    return { error: 'Failed to retrieve deletion logs.' };
  }
  return { deletionCount: data.length, deletions: data };
}

async function listAvailableProducts(supabase, args = {}) {
  const { limit = 10 } = args;
  console.log(`Tool called: listAvailableProducts with limit ${limit}`);
  const { data, error } = await supabase
    .from('products')
    .select('name, sku, current_stock')
    .gt('current_stock', 0)
    .order('current_stock', { ascending: false })
    .limit(limit);

  if (error) {
    return { error: 'Failed to retrieve product list.' };
  }
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).gt('current_stock', 0);
  return { totalAvailable: count, showing: data.length, products: data };
}


// --- Sales & Revenue Analysis ---

async function getSalesSummary(supabase, args = {}) {
  const { startDate, endDate } = args;
  console.log(`Tool called: getSalesSummary from ${startDate} to ${endDate}`);
  let query = supabase.from('transactions').select('total_amount, quantity');

  if (startDate) query = query.gte('transaction_time', startDate);
  if (endDate) query = query.lte('transaction_time', endDate);

  const { data, error } = await query;
  if (error) return { error: "Failed to retrieve sales data." };

  const totalRevenue = data.reduce((sum, t) => sum + t.total_amount, 0);
  const totalItemsSold = data.reduce((sum, t) => sum + t.quantity, 0);
  const totalTransactions = data.length;

  return { totalRevenue, totalItemsSold, totalTransactions };
}

async function getBestSellingProducts(supabase, args = {}) {
  const { limit = 5, timePeriod = 'last 30 days' } = args;
  console.log(`Tool called: getBestSellingProducts for ${timePeriod} with limit ${limit}`);
  let startDate = new Date();

  if (timePeriod === 'last 7 days') {
    startDate.setDate(startDate.getDate() - 7);
  } else { // Default to 30 days
    startDate.setDate(startDate.getDate() - 30);
  }

  const { data, error } = await supabase.rpc('get_best_selling_products', {
    start_date: startDate.toISOString(),
    limit_count: limit
  });

  if (error) {
    console.error("RPC Error:", error);
    return { error: 'Failed to get best selling products. Make sure the RPC function exists and permissions are correct.' };
  }
  return { bestSellers: data };
}


async function getProductSales(supabase, args = {}) {
  const { productName, startDate, endDate } = args;
  if (!productName) return { error: "Product name is required." };
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

// --- Transaction & Order Management ---

async function lookupTransaction(supabase, args = {}) {
  const { transactionId } = args;
  if (!transactionId) return { error: "Transaction ID is required." };
  console.log(`Tool called: lookupTransaction for ${transactionId}`);
  const { data, error } = await supabase
    .from('transactions')
    .select('*, product:products(name)')
    .eq('transaction_id', transactionId)
    .single();
  if (error) return { error: `Transaction ${transactionId} not found.` };
  return data;
}

// --- User & Access Management ---

async function getUserActivity(supabase, args = {}) {
  const { adminName } = args;
  if (!adminName) return { error: "Admin name is required." };
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

async function listAdmins(supabase) {
  console.log(`Tool called: listAdmins`);
  const { data, error } = await supabase.from('admins').select('full_name, role, email, last_login');
  if (error) return { error: 'Failed to retrieve admins.' };
  return { adminCount: data.length, admins: data };
}

// --- AI, Health & Monitoring ---
async function getUnresolvedAnomalies(supabase) {
  console.log(`Tool called: getUnresolvedAnomalies`);
  const { data, error } = await supabase
    .from('error_logs')
    .select('id, error_type, description, severity, created_at')
    .eq('resolved', false)
    .order('created_at', { ascending: false });
  if (error) return { error: 'Failed to retrieve anomalies.' };
  return { anomalyCount: data.length, anomalies: data };
}

async function getSystemHealthSummary(supabase) {
  console.log(`Tool called: getSystemHealthSummary`);
  // This is a mock function. In a real scenario, this would check database connections, API latency, etc.
  const { count } = await supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('resolved', false);
  return {
    status: "All Systems Operational",
    databaseConnection: "Healthy",
    apiLatency: "120ms",
    unresolvedAnomalies: count || 0,
    uptime: "99.98%"
  };
}


// --- Category & Company Management ---
async function listCategories(supabase) {
  console.log(`Tool called: listCategories`);
  const { data, error } = await supabase.from('categories').select('name, description');
  if (error) return { error: 'Failed to retrieve categories.' };
  return { categoryCount: data.length, categories: data };
}

async function listCompanies(supabase) {
  console.log(`Tool called: listCompanies`);
  const { data, error } = await supabase.from('companies').select('name, country');
  if (error) return { error: 'Failed to retrieve companies.' };
  return { companyCount: data.length, companies: data };
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
      - transactions: Sales records. Columns: transaction_id, product_id, quantity, total_amount, customer_location, transaction_time.
      - admins: Administrator users. Columns: id, full_name, role, location.
      - activity_logs: Detailed log of user actions. Columns: admin_id, action_type, details (jsonb), created_at.
      - error_logs: AI-detected anomalies and system errors.
      - companies: Supplier/manufacturer information.
      - categories: Product categories.
    `;

    const tools = [{
      functionDeclarations: [
        // Product & Inventory
        { name: 'getProductDetails', description: 'Get detailed information about a single product, including its company and category.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'listProducts', description: 'Lists products in the inventory, with optional filters for category and company.', parameters: { type: 'OBJECT', properties: { page: { type: 'NUMBER' }, limit: { type: 'NUMBER' }, category: { type: 'STRING' }, company: { type: 'STRING' } } } },
        { name: 'findProducts', description: 'Searches for products by a search term.', parameters: { type: 'OBJECT', properties: { searchTerm: { type: 'STRING' } }, required: ['searchTerm'] } },
        { name: 'getProductStock', description: 'Get the current stock quantity of a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'updateStock', description: 'Update the stock quantity for an existing product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, newStock: { type: 'NUMBER' } }, required: ['productName', 'newStock'] } },
        { name: 'getOutOfStockProducts', description: 'Get a list of all products that are currently out of stock (stock is 0).', parameters: { type: 'OBJECT', properties: {} } },
        { name: 'getRecentDeletions', description: 'Find out which products were deleted and by whom within a given timeframe.', parameters: { type: 'OBJECT', properties: { timeRange: { type: 'STRING', enum: ["today", "last 7 days"] } }, required: ['timeRange'] } },
        { name: 'listAvailableProducts', description: 'Get a list of products that are currently in stock.', parameters: { type: 'OBJECT', properties: { limit: { type: 'NUMBER' } } } },
        // Sales & Revenue
        { name: 'getSalesSummary', description: 'Calculates total revenue, items sold, and number of transactions within a date range.', parameters: { type: 'OBJECT', properties: { startDate: { type: 'STRING', description: 'ISO 8601 format' }, endDate: { type: 'STRING', description: 'ISO 8601 format' } } } },
        { name: 'getBestSellingProducts', description: 'Finds the top-selling products based on revenue in a given period.', parameters: { type: 'OBJECT', properties: { limit: { type: 'NUMBER' }, timePeriod: { type: 'STRING', enum: ["last 7 days", "last 30 days"] } } } },
        { name: 'getProductSales', description: 'Get the total units sold and revenue for a product, optionally in a date range.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, startDate: { type: 'STRING' }, endDate: { type: 'STRING' } }, required: ['productName'] } },
        // Transaction & Order
        { name: 'lookupTransaction', description: 'Looks up a specific transaction by its unique ID.', parameters: { type: 'OBJECT', properties: { transactionId: { type: 'STRING' } }, required: ['transactionId'] } },
        // User & Access
        { name: 'getUserActivity', description: "Get recent dashboard actions for a specific administrator.", parameters: { type: 'OBJECT', properties: { adminName: { type: 'STRING' } }, required: ['adminName'] } },
        { name: 'listAdmins', description: 'Get a list of all administrator users in the system.', parameters: { type: 'OBJECT', properties: {} } },
        // AI, Health & Monitoring
        { name: 'getUnresolvedAnomalies', description: 'Retrieves a list of all system-detected anomalies that have not been resolved yet.', parameters: { type: 'OBJECT', properties: {} } },
        { name: 'getSystemHealthSummary', description: 'Provides a mock summary of the system health.', parameters: { type: 'OBJECT', properties: {} } },
        // Category & Company
        { name: 'listCategories', description: 'Retrieve a list of all product categories.', parameters: { type: 'OBJECT', properties: {} } },
        { name: 'listCompanies', description: 'Retrieves a list of all companies/suppliers.', parameters: { type: 'OBJECT', properties: {} } },
      ]
    }];

    const chat = model.startChat({
      tools,
      history: history || [] // Initialize with past conversation
    });

    const userName = user?.name || 'the current user';
    const system_prompt = `You are Stella, a highly intelligent AI business assistant for the QuickCart dashboard. Your purpose is to provide precise information and perform actions by using your available tools. You are speaking with ${userName}.
    **Core Directives:**
    1. **Tool-First Approach:** Your primary method of answering is by using your functions. If the user's query can be answered with a tool, use it. Do not guess.
    2. **Fallback to General Conversation:** If, and only if, a user's query CANNOT be answered using one of your available tools, you may answer it as a helpful, general-purpose conversational AI. For any and all questions about the dashboard, sales, products, or other business data, you MUST use your tools.
    3. **Analyze Intent Deeply:** Do not rely on keywords. Understand the user's true intent. Use semantic understanding to choose the right tool and parameters.
    4. **Use Conversation History:** You have access to the recent chat history. Use this context to understand follow-up questions. For example, if a user asks "how many?" after you've talked about a product, understand they are asking about that product.
    5. **Clarify and Guide:** If a prompt is ambiguous (e.g., "list products"), or a tool fails because of bad input, ask a clarifying question. Guide the user toward a query you can answer.
    6. **Concise & Professional:** Be direct and to the point. Do not use conversational filler, unless engaged in general conversation (see directive #2).
    7. **Schema Awareness:** You have profound knowledge of this database schema: ${dbSchemaContext}
    8. **Context:** The current date is ${new Date().toDateString()}. The user's location is Nigeria.`;

    // Use the system prompt only for the very first message in a conversation.
    const messageToSend = (history && history.length > 0)
      ? query
      : `${system_prompt}\n\nUser query: "${query}"`;

    const result = await chat.sendMessage(messageToSend);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      const toolMap = {
        getProductDetails,
        listProducts,
        findProducts,
        getProductStock,
        updateStock,
        getOutOfStockProducts,
        getRecentDeletions,
        listAvailableProducts,
        getSalesSummary,
        getBestSellingProducts,
        getProductSales,
        lookupTransaction,
        getUserActivity,
        listAdmins,
        getUnresolvedAnomalies,
        getSystemHealthSummary,
        listCategories,
        listCompanies,
      };

      let toolResult;
      if (toolMap[call.name]) {
        toolResult = await toolMap[call.name](supabase, call.args);
      } else {
        toolResult = { error: "Unknown function call" };
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
