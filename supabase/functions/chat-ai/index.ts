// supabase/functions/chat-ai/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

// Get the Gemini API key from the Supabase secrets
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  try {
    const { query } = await req.json()
    if (!query) {
      throw new Error('Missing query in request body')
    }

    // Initialize Supabase client with the service_role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Fetch fresh business context from the database
    const [
      { data: products }, 
      { data: transactions }, 
      { data: errorLogs }
    ] = await Promise.all([
      supabaseClient.from('products').select('*'),
      supabaseClient.from('transactions').select('*, product:products(name, sku)').limit(100),
      supabaseClient.from('error_logs').select('*').limit(50)
    ]);
    
    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Construct a detailed prompt for the AI model
    const prompt = `
      You are Stella, an expert business analyst AI for a company called QuickCart.
      Your tone is helpful, professional, and concise.
      Your task is to answer the user's question based on the provided business data.
      The data is provided in JSON format below.

      **CRITICAL INSTRUCTION: You MUST format your entire response as plain text. Do not use any Markdown formatting. Do not use asterisks for bolding. Do not use bullet points like '•' or '-'. Use line breaks to structure your response where appropriate.**

      Here is the business data context:
      Products: ${JSON.stringify(products?.slice(0, 20))}
      Recent Transactions: ${JSON.stringify(transactions?.slice(0, 20))}
      Error Logs: ${JSON.stringify(errorLogs?.slice(0, 10))}

      Based on this data, please answer the following user question:
      "${query}"
    `;

    // Generate the content using the Gemini model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponseText = response.text();
    
    return new Response(JSON.stringify({ response: aiResponseText }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})