// FINAL VERSION: supabase/functions/ai-chat/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Tool Implementations ---
// These are the actual functions that will interact with your database.

async function getProductStock(supabase, productName) {
  console.log(`Tool called: getProductStock for ${productName}`);
  const { data, error } = await supabase.from('products').select('name, current_stock').ilike('name', `%${productName}%`).single();
  if (error || !data) return { error: `Product '${productName}' not found.` };
  return { productName: data.name, stock: data.current_stock };
}

async function getProductSales(supabase, productName) {
  console.log(`Tool called: getProductSales for ${productName}`);
  const { data: product, error: pError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (pError || !product) return { error: `Product '${productName}' not found.` };

  const { data: sales, error: sError } = await supabase.from('transactions').select('quantity, total_amount').eq('product_id', product.id);
  if (sError) return { error: `Could not retrieve sales data: ${sError.message}` };

  const totalQuantity = sales.reduce((sum, t) => sum + t.quantity, 0);
  const totalRevenue = sales.reduce((sum, t) => sum + t.total_amount, 0);

  return { productName: product.name, unitsSold: totalQuantity, revenue: totalRevenue };
}

async function addProduct(supabase, productName, stock, selling_price) {
  console.log(`Tool called: addProduct for ${productName}`);
  // Using default IDs for company and category for simplicity.
  const defaultCompanyId = '550e8400-e29b-41d4-a716-446655440001'; // Nestlé S.A.
  const defaultCategoryId = '660e8400-e29b-41d4-a716-446655440001'; // Food & Beverages

  const sku = `${productName.toUpperCase().substring(0, 3)}-${Date.now().toString().slice(-5)}`;
  const { data, error } = await supabase.from('products').insert({
    name: productName,
    sku,
    current_stock: stock,
    selling_price,
    cost_price: selling_price * 0.7, // Assume a 30% margin
    company_id: defaultCompanyId,
    category_id: defaultCategoryId,
    is_active: true
  }).select().single();

  if (error) return { error: `Failed to add product: ${error.message}` };
  return { success: true, product: data };
}

async function updateStock(supabase, productName, newStock) {
  console.log(`Tool called: updateStock for ${productName}`);
  const { data: product, error: pError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (pError || !product) return { error: `Product '${productName}' not found.` };

  const { data, error } = await supabase.from('products').update({ current_stock: newStock }).eq('id', product.id).select().single();
  if (error) return { error: `Failed to update stock: ${error.message}` };
  return { success: true, productName: data.name, newStock: data.current_stock };
}

// --- Main Request Handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    // Initialize clients
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Define all available tools for Gemini
    const tools = [
      {
        functionDeclarations: [
          { name: 'getProductStock', description: 'Get the current stock quantity of a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
          { name: 'getProductSales', description: 'Get the total units sold and revenue for a specific product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } },
          { name: 'addProduct', description: 'Add a new product to the inventory and store.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, stock: { type: 'NUMBER' }, selling_price: { type: 'NUMBER' } }, required: ['productName', 'stock', 'selling_price'] } },
          { name: 'updateStock', description: 'Update the stock quantity for an existing product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' }, newStock: { type: 'NUMBER' } }, required: ['productName', 'newStock'] } },
        ]
      }
    ];

    const chat = model.startChat({ tools });
    const system_prompt = `You are Stella, a helpful AI assistant for the QuickCart dashboard. You are friendly, conversational, and precise.
    - Your primary role is to help users query the database and perform actions.
    - Do not use markdown like asterisks. Use bullet points only when necessary for lists.
    - When a user asks to perform an action (add, update), confirm the action was completed successfully and state the result.
    - If you need more information to call a tool, ask the user for it.
    - The current date is ${new Date().toDateString()}.`;

    const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
    const call = result.response.functionCalls()?.[0];

    if (call) {
      let toolResult;
      // The switch statement determines which tool to run based on the AI's decision
      switch (call.name) {
        case "getProductStock":
          toolResult = await getProductStock(supabase, call.args.productName);
          break;
        case "getProductSales":
          toolResult = await getProductSales(supabase, call.args.productName);
          break;
        case "addProduct":
          toolResult = await addProduct(supabase, call.args.productName, call.args.stock, call.args.selling_price);
          break;
        case "updateStock":
          toolResult = await updateStock(supabase, call.args.productName, call.args.newStock);
          break;
        default:
          toolResult = { error: "Unknown function call" };
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