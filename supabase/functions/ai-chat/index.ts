// Final TEST CODE for supabase/functions/ai-chat/index.ts
import { corsHeaders } from '../_shared/cors.ts';

console.log("GET Request Test Function Initialized");

Deno.serve(async (req) => {
  // This handles the preflight 'OPTIONS' request browsers send first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log(`Request received at ${new Date().toISOString()}`);

  const responsePayload = {
    message: "SUCCESS: The Edge Function is deployed and reachable!",
    timestamp: new Date().toISOString()
  };

  // Return a success response to any type of request
  return new Response(JSON.stringify(responsePayload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});