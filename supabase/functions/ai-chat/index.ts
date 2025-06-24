import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// --- Define Tools (Functions the AI can call) ---

// Tool to get stock for a product
const getProductStock = async (productName) => {
  console.log(`Tool called: getProductStock for ${productName}`);
  const { data, error } = await supabase.from('products').select('name, current_stock').ilike('name', `%${productName}%`).single();
  if (error || !data) return { error: `Product '${productName}' not found.` };
  return { productName: data.name, stock: data.current_stock };
};

// Tool to get sales data for a product
const getProductSales = async (productName) => {
  console.log(`Tool called: getProductSales for ${productName}`);
  const { data: product, error: pError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (pError || !product) return { error: `Product '${productName}' not found.` };
  
  const { data: sales, error: sError } = await supabase.from('transactions').select('quantity, total_amount').eq('product_id', product.id);
  if (sError) return { error: 'Could not retrieve sales data.' };

  const totalQuantity = sales.reduce((sum, t) => sum + t.quantity, 0);
  const totalRevenue = sales.reduce((sum, t) => sum + t.total_amount, 0);
  
  return { productName: product.name, unitsSold: totalQuantity, revenue: totalRevenue };
};

// Tool to add a new product
const addProduct = async (productName, stock, selling_price, cost_price = 0, company_id, category_id) => {
    console.log(`Tool called: addProduct for ${productName}`);
    // A real app would need to resolve company/category IDs or ask the user. We'll use defaults for now.
    const defaultCompanyId = company_id || '550e8400-e29b-41d4-a716-446655440001'; // Default to Nestlé
    const defaultCategoryId = category_id || '660e8400-e29b-41d4-a716-446655440001'; // Default to Food & Beverages

    const sku = `${productName.toUpperCase().substring(0, 3)}-${Date.now()}`;
    const { data, error } = await supabase.from('products').insert({
        name: productName,
        sku,
        current_stock: stock,
        selling_price,
        cost_price,
        company_id: defaultCompanyId,
        category_id: defaultCategoryId,
    }).select().single();

    if(error) return { error: `Failed to add product: ${error.message}`};
    return { success: true, product: data };
};

// Tool to update product stock
const updateStock = async (productName, newStock) => {
    console.log(`Tool called: updateStock for ${productName}`);
    const { data: product, error: pError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
    if (pError || !product) return { error: `Product '${productName}' not found.` };

    const { data, error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id).select().single();
    if(error) return { error: `Failed to update stock: ${error.message}`};
    return { success: true, productName: data.name, newStock: data.current_stock };
}

// --- Main Request Handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { query } = await req.json();

  const chat = model.startChat({
    tools: [
      { functionDeclarations: [
        { name: 'getProductStock', description: 'Get the current stock quantity of a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'getProductSales', description: 'Get the total units sold and revenue for a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
        { name: 'addProduct', description: 'Add a new product to the inventory.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, stock: { type: 'NUMBER' }, selling_price: { type: 'NUMBER' } }, required: ['productName', 'stock', 'selling_price'] } },
        { name: 'updateStock', description: 'Update the stock quantity for an existing product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, newStock: { type: 'NUMBER' } }, required: ['productName', 'newStock'] } },
      ]}
    ],
  });

  // The main prompt for the AI
  const system_prompt = `You are Stella, a helpful AI assistant for the QuickCart dashboard. You are friendly, conversational, and precise.
  Your primary role is to help users query the database and perform actions.
  - Do not use markdown like asterisks or bullet points unless it's for a list. Keep responses clean.
  - When a user asks to perform an action (add, update, delete), confirm the action was completed successfully.
  - If you need more information to call a tool, ask the user for it.
  - The current date is ${new Date().toLocaleDateString()}.`;

  const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
  const call = result.response.functionCalls()?.[0];

  if (call) {
    console.log("AI wants to call a tool:", call);
    let toolResult;
    switch(call.name) {
        case "getProductStock":
            toolResult = await getProductStock(call.args.productName);
            break;
        case "getProductSales":
            toolResult = await getProductSales(call.args.productName);
            break;
        case "addProduct":
            toolResult = await addProduct(call.args.productName, call.args.stock, call.args.selling_price);
            break;
        case "updateStock":
            toolResult = await updateStock(call.args.productName, call.args.newStock);
            break;
        default:
            toolResult = { error: "Unknown function call" };
    }

    const finalResult = await chat.sendMessage([{
      functionResponse: { name: call.name, response: toolResult }
    }]);

    return new Response(JSON.stringify({ response: finalResult.response.text() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // If no tool is called, return the direct response
  return new Response(JSON.stringify({ response: result.response.text() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});