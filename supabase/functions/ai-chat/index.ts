// DEBUG-ENABLED VERSION for supabase/functions/ai-chat/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

console.log('DEBUG: Top-level of the function script loaded.');

Deno.serve(async (req) => {
  console.log(`DEBUG: Function invoked with method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log('DEBUG: Responding to OPTIONS preflight request.');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log(`DEBUG: Received user query: "${query}"`);

    // --- Gemini and Supabase Client Initialization ---
    console.log('DEBUG: Initializing Supabase client...');
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'));
    console.log('DEBUG: Supabase client initialized.');

    console.log('DEBUG: Initializing Google AI client...');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set!');
      throw new Error('Server configuration error: Missing Gemini API Key.');
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('DEBUG: Google AI client initialized.');

    // --- Tool Definitions (omitted for brevity, they are not the issue) ---
    const getProductStock = async (productName) => { /* ... */ return { stock: 500 }; };

    console.log('DEBUG: Starting chat with Gemini model...');
    const chat = model.startChat({
      tools: [{ functionDeclarations: [{ name: 'getProductStock', description: 'Get stock of a product.', parameters: { type: 'OBJECT', properties: { productName: { type: 'STRING' } }, required: ['productName'] } }] }]
    });

    const system_prompt = `You are Stella, a helpful AI assistant.`;

    console.log('DEBUG: Sending first message to Gemini...');
    const result = await chat.sendMessage(`${system_prompt}\n\nUser query: "${query}"`);
    console.log('DEBUG: Received first response from Gemini.');

    const call = result.response.functionCalls()?.[0];

    if (call) {
      console.log(`DEBUG: Gemini wants to call tool: ${call.name}`);
      // Tool execution logic would go here
      const toolResult = await getProductStock(call.args.productName);

      console.log('DEBUG: Sending second message to Gemini with tool result...');
      const finalResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolResult } }]);
      console.log('DEBUG: Received final response from Gemini.');

      return new Response(JSON.stringify({ response: finalResult.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('DEBUG: No tool call needed. Returning direct response from Gemini.');
    return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('CRITICAL ERROR in function execution:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});