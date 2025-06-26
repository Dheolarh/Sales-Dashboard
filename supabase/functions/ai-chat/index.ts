import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Tool Implementations ---
// Each function now accepts the supabase client as its first argument.

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
  console.log(`Tool called: updateProduct for "${productName}" with`, updates);
  const { data: product, error: findError } = await supabase.from('products').select('id, name').ilike('name', `%${productName}%`).single();
  if (findError) return { error: `Product "${productName}" not found.` };

  const { data, error } = await supabase.from('products').update(updates).eq('id', product.id).select().single();
  if (error) return { error: `Failed to update product: ${error.message}` };
  return { status: "success", updatedProduct: data };
}

async function deleteEntity(supabase: SupabaseClient, entityType: 'product' | 'category' | 'company', name: string) {
  console.log(`Tool called: deleteEntity for ${entityType} "${name}"`);
  const tableName = `${entityType}s`;
  const { error } = await supabase.from(tableName).delete().ilike('name', name);
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
    const { query, history, user } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'));
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

    const tools = [{
      functionDeclarations: [
        {
          name: 'searchProducts',
          description: "Search for products by name. Handles partial matches and misspellings.",
          parameters: { type: FunctionDeclarationSchemaType.OBJECT, properties: { query: { type: FunctionDeclarationSchemaType.STRING } }, required: ['query'] }
        },
        {
          name: 'updateProduct',
          description: "Update a product's details, such as its price or stock level.",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              productName: { type: FunctionDeclarationSchemaType.STRING },
              updates: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  selling_price: { type: FunctionDeclarationSchemaType.NUMBER },
                  current_stock: { type: FunctionDeclarationSchemaType.NUMBER }
                }
              }
            },
            required: ['productName', 'updates']
          }
        },
        {
          name: 'deleteEntity',
          description: "Delete an entity (product, category, or company) by its name.",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              entityType: { type: FunctionDeclarationSchemaType.STRING, enum: ['product', 'category', 'company'] },
              name: { type: FunctionDeclarationSchemaType.STRING }
            },
            required: ['entityType', 'name']
          }
        },
        {
          name: 'generateCsv',
          description: "Generates CSV data from a JSON array of objects. Useful for creating tables or exportable data.",
          parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
              data: {
                type: FunctionDeclarationSchemaType.ARRAY,
                items: { type: FunctionDeclarationSchemaType.OBJECT }
              }
            },
            required: ['data']
          }
        }
      ]
    }];

    const chat = model.startChat({ tools, history });
    const userName = user?.name || 'the current user';

    // This system prompt is more advanced
    const system_prompt = `You are Stella, a hyper-intelligent AI business assistant for the QuickCart dashboard. Your purpose is to provide precise information and perform actions by using your available tools. You are speaking with ${userName}.

    **Core Directives:**
    1.  **Analyze and Disambiguate:** Deeply analyze the user's prompt. If a term is ambiguous (e.g., "cola"), use a search tool first to find matching items, then present the user with options.
    2.  **Tool-First Approach:** Your primary method of answering questions or performing actions is by using tools. If a query can be addressed with a tool, use it. Do not guess. If a user asks to delete something, use the 'deleteEntity' tool. If they ask to change a price, use 'updateProduct'.
    3.  **Data-Driven Responses:** When you get data from a tool, present it clearly. For tabular data, use Markdown tables. For lists, use bullet points.
    4.  **Handle CRUD:** For any Create, Read, Update, or Delete request, confirm the action with the user before executing the tool. For 'add' requests, inform the user that this action must be done via the UI forms for data integrity.
    5.  **Calculations & Data Generation:** If asked to perform a calculation or create a table/sheet, use your own reasoning and the 'generateCsv' tool to format the output.
    6.  **Context:** The current date is ${new Date().toDateString()}.`;

    const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
    let response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls) {
      console.log('Function call detected:', functionCalls[0]);
      const call = functionCalls[0];
      let toolResult;

      // Execute the correct tool based on the function call name
      switch (call.name) {
        case "searchProducts":
          toolResult = await searchProducts(supabase, call.args.query);
          break;
        case "updateProduct":
          toolResult = await updateProduct(supabase, call.args.productName, call.args.updates);
          break;
        case "deleteEntity":
          toolResult = await deleteEntity(supabase, call.args.entityType, call.args.name);
          break;
        case "generateCsv":
          toolResult = await generateCsv(call.args.data);
          break;
        default:
          toolResult = { error: "Unknown function call" };
      }

      console.log('Tool result:', toolResult);

      const finalResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
      response = finalResult.response;
    }

    return new Response(JSON.stringify({ response: response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('CRITICAL ERROR in function execution:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});