import { corsHeaders } from '../_shared/cors.ts';

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
    
    if (!supabaseDbUrl) {
      throw new Error("SUPABASE_DB_URL environment variable is not set");
    }
    
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    
    const { query } = await req.json();
    if (!query) throw new Error("query is required");
    console.log("User query:", query);

    // Simple response for now
    return new Response(JSON.stringify({ 
      response: `Hello! You asked: "${query}". This is a test response to debug the function.` 
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
      details: "Function is in debug mode"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});