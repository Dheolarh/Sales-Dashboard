import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Main function to serve requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Received request:", req.method, req.url);
    
    // Check for required environment variables
    const supabaseDbUrl = Deno.env.get("SUPABASE_DB_URL");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    console.log("Environment check:");
    console.log("SUPABASE_DB_URL exists:", !!supabaseDbUrl);
    console.log("GEMINI_API_KEY exists:", !!geminiApiKey);
    
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    const { query, history } = await req.json();
    if (!query) throw new Error("query is required");
    console.log("User query:", query);
    console.log("Chat history length:", history ? history.length : 0);

    // Initialize AI client
    console.log("Initializing AI client...");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Initialize chat with history if provided
    let chat;
    if (history && history.length > 0) {
      chat = model.startChat({
        history: history
      });
    } else {
      chat = model.startChat();
    }
    console.log("AI client initialized successfully.");

    // Get AI response
    const response = await chat.sendMessage(query);
    const aiResponse = response.response.text();

    return new Response(JSON.stringify({ 
      response: aiResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in function:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      error: message,
      details: "Function is testing AI integration"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});