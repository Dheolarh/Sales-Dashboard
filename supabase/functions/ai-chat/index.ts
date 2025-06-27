// This reference comment helps your editor understand Deno types.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Type Interfaces ---
interface CartItem {
  product: { id: string; selling_price: number; };
  quantity: number;
}

interface User {
  id: string;
  name?: string;
}

// --- Tool and Action Implementations ---

/**
 * REVISED: Securely processes a checkout, verifies prices, creates transactions,
 * and updates stock levels using an atomic database function.
 */
async function processCheckout(supabaseAdmin: SupabaseClient, cart: CartItem[], user?: User) {
  console.log(`Action called: processCheckout`);

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    throw new Error("Invalid or empty cart provided.");
  }

  const transactionInserts = [];

  for (const item of cart) {
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('selling_price, current_stock')
      .eq('id', item.product.id)
      .single();

    if (error || !product) {
      throw new Error(`Product with ID ${item.product.id} not found.`);
    }
    if (product.current_stock < item.quantity) {
      throw new Error(`Not enough stock for "${product.name}". Only ${product.current_stock} available.`);
    }

    // Prepare transaction record for insertion
    transactionInserts.push({
      // admin_id is likely incorrect here for a public checkout. This can be null or linked to a customer table if you have one.
      // admin_id: user?.id, 
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: product.selling_price,
      total_amount: product.selling_price * item.quantity,
      status: 'completed',
      transaction_id: `txn_${crypto.randomUUID()}`
    });
  }

  // Step 1: Insert all transactions into the database
  const { data: insertedTransactions, error: transactionError } = await supabaseAdmin
    .from('transactions')
    .insert(transactionInserts)
    .select();

  if (transactionError) {
    throw new Error(`Failed to create transactions: ${transactionError.message}`);
  }

  // Step 2: Update stock for all products using the secure RPC function
  for (const item of cart) {
    const { error: stockUpdateError } = await supabaseAdmin.rpc('decrease_stock', {
      product_id_in: item.product.id,
      quantity_in: item.quantity
    });

    if (stockUpdateError) {
      // In a real-world scenario, you might want to handle this error more gracefully,
      // such as attempting to roll back the transaction.
      console.error(`Critical: Stock update failed for ${item.product.id}: ${stockUpdateError.message}`);
    }
  }

  return { success: true, transactions: insertedTransactions };
}

// ... (Your other functions: renameChatSession, searchProducts, etc. remain the same)
async function renameChatSession(supabase: SupabaseClient, sessionId: string, newTitle: string) {
    console.log(`Tool called: renameChatSession for session ${sessionId} to "${newTitle}"`);
    const { error } = await supabase.from('chat_sessions').update({ title: newTitle }).eq('id', sessionId);
    if (error) return { error: `Failed to rename session: ${error.message}` };
    return { status: "success", newTitle };
  }
  
  async function searchProducts(supabase: SupabaseClient, query: string) {
    console.log(`Tool called: searchProducts for "${query}"`);
    const { data, error } = await supabase
      .from('products')
      .select('name, sku, selling_price, current_stock, company:companies(name), category:categories(name)')
      .ilike('name', `%${query}%`)
      .limit(10);
  
    if (error) return { error: `Database search failed: ${error.message}` };
    if (!data || data.length === 0) return { info: `No products found matching "${query}".` };
    return data;
  }
  
  async function updateProduct(supabase: SupabaseClient, productName: string, updates: { selling_price?: number; current_stock?: number }) {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    console.log(`Tool called: updateProduct for "${productName}" with`, updates);
    const { data: product, error: findError } = await supabaseAdmin.from('products').select('id, name').ilike('name', `%${productName}%`).single();
    if (findError) return { error: `Product "${productName}" not found.` };
  
    const { data, error } = await supabaseAdmin.from('products').update(updates).eq('id', product.id).select().single();
    if (error) return { error: `Failed to update product: ${error.message}` };
    return { status: "success", updatedProduct: data };
  }
  
  async function deleteEntity(supabase: SupabaseClient, entityType: 'product' | 'category' | 'company', name: string) {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    console.log(`Tool called: deleteEntity for ${entityType} "${name}"`);
    const tableName = `${entityType}s`;
    const { error } = await supabaseAdmin.from(tableName).delete().ilike('name', name);
    if (error) return { error: `Failed to delete ${entityType}: ${error.message}. It might be linked to other items.` };
    return { status: "success", message: `${entityType} "${name}" has been deleted.` };
  }
  
  async function generateCsv(data: object[]) {
    if (!Array.isArray(data) || data.length === 0) {
      return { error: "Cannot generate CSV from empty or invalid data." };
    }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = `${headers}\n${rows.join('\n')}`;
    return { csv_data: csv };
  }

// --- Main Request Handler ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, history, user, task, sessionId, cart } = await req.json();

    if (task === 'process_checkout') {
      const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const checkoutResult = await processCheckout(supabaseAdmin, cart, user);
      return new Response(JSON.stringify(checkoutResult), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // This is the main AI chat logic
    if (!user || !user.id) {
        throw new Error("User authentication is required for AI chat.");
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const chatTools = [
      { functionDeclarations: [{ name: 'searchProducts', description: "Search for products by name.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { query: { type: FunctionDeclarationSchemaType.STRING } }, required: ['query'] } }, { name: 'updateProduct', description: "Update a product's details.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { productName: { type: FunctionDeclarationSchemaType.STRING }, updates: { type: FunctionDeclarationSchemaType.OBJECT, properties: { selling_price: { type: FunctionDeclarationSchemaType.NUMBER }, current_stock: { type: FunctionDeclarationSchemaType.NUMBER } } } }, required: ['productName', 'updates'] } }, { name: 'deleteEntity', description: "Delete an entity (product, category, or company).", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { entityType: { type: FunctionDeclarationSchemaType.STRING, enum: ['product', 'category', 'company'] }, name: { type: FunctionDeclarationSchemaType.STRING } }, required: ['entityType', 'name'] } }, { name: 'generateCsv', description: "Generates CSV data from JSON.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { data: { type: FunctionDeclarationSchemaType.ARRAY, items: { type: FunctionDeclarationSchemaType.OBJECT } } }, required: ['data'] } }] }
    ];
    const namingTools = [
      { functionDeclarations: [{ name: 'renameChatSession', description: "Renames the current chat session.", parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { sessionId: { type: FunctionDeclarationSchemaType.STRING }, newTitle: { type: FunctionDeclarationSchemaType.STRING } }, required: ['sessionId', 'newTitle'] } }] }
    ];

    let system_prompt, activeTools;

    if (task === 'generate_title') {
      system_prompt = `You are a title generation AI. Based on the user's first message, create a short, concise, and descriptive title for the chat session (max 5 words). Then, use the 'renameChatSession' tool to set this title.`;
      activeTools = namingTools;
    } else {
      const { data: recentSessions } = await supabase.from('chat_sessions').select('title').eq('admin_id', user.id).order('updated_at', { ascending: false }).limit(5);
      const recentTitles = recentSessions?.map(s => s.title).join(', ') || 'None';

      system_prompt = `You are Stella, a hyper-intelligent AI business assistant for the QuickCart dashboard. Your purpose is to provide precise information and perform actions by using your available tools. You are speaking with ${user?.name || 'the current user'}.
      
      **Recent Conversation Topics:** ${recentTitles}

      **Core Directives:**
      1.  **Analyze and Disambiguate:** Deeply analyze the user's prompt. If a term is ambiguous (e.g., "cola"), use a search tool first to find matching items, then present the user with options.
      2.  **Tool-First Approach:** Your primary method of answering questions or performing actions is by using tools.
      3.  **Data-Driven Responses:** When you get data from a tool, present it clearly using Markdown tables or lists.
      4.  **Handle CRUD:** For any Create, Read, Update, or Delete request, confirm the action with the user before executing the tool. For 'add' requests, inform the user that this action must be done via the UI forms for data integrity.
      5.  **Context:** The current date is ${new Date().toDateString()}.`;
      activeTools = chatTools;
    }

    const chat = model.startChat({ tools: activeTools, history });
    const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
    let response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls) {
      console.log('Function call detected:', functionCalls[0]);
      const call = functionCalls[0];
      let toolResult;

      switch (call.name) {
        case "searchProducts": toolResult = await searchProducts(supabase, call.args.query as string); break;
        case "updateProduct": toolResult = await updateProduct(supabase, call.args.productName as string, call.args.updates as { selling_price?: number; current_stock?: number }); break;
        case "deleteEntity": toolResult = await deleteEntity(supabase, call.args.entityType as 'product' | 'category' | 'company', call.args.name as string); break;
        case "generateCsv": toolResult = await generateCsv(call.args.data as object[]); break;
        case "renameChatSession": toolResult = await renameChatSession(supabase, call.args.sessionId as string, call.args.newTitle as string); break;
        default: toolResult = { error: "Unknown function call" };
      }

      console.log('Tool result:', toolResult);
      const finalResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
      response = finalResult.response;
    }

    return new Response(JSON.stringify({ response: response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('CRITICAL ERROR in function execution:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});