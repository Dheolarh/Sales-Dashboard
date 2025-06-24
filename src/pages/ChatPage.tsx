// TEMPORARY TEST CODE for supabase/functions/ai-chat/index.ts
import { corsHeaders } from '../_shared/cors.ts';

console.log("Simplified test function started!");

Deno.serve(async (req) => {
  // Always respond with a simple, hardcoded message
  const responsePayload = { response: "Hello! The test function is working!" };

  return new Response(JSON.stringify(responsePayload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});