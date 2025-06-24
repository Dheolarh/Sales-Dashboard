// supabase/functions/chat-ai/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

// Get the Gemini API key from the Supabase secrets
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

serve(async (req) => {
  try {
    const { query } = await req.json()
    if (!query) {
      throw new Error('Missing query in request body')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `You are Stella, a helpful and professional business analyst AI for a company called QuickCart. Your task is to answer the user's question using your general business and data analysis knowledge. Format your response as clean, plain text without Markdown. Do not use asterisks or bullet points. Use line breaks for structure. Question: "${query}"`;

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