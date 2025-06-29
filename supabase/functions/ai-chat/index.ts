import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SqlDatabase } from "langchain/sql_db";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { AgentExecutor } from "langchain/agents";
import postgres from "postgres";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { question } = await req.json();

    const llm = new ChatGoogleGenerativeAI({
      apiKey: Deno.env.get('GOOGLE_API_KEY'),
      model: 'gemini-1.5-pro',
      temperature: 0,
    });

    // Use the postgres library to create a database client
    const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, {
      // You can add SSL options here if needed, but the URL should handle it.
    });

    // Create the SqlDatabase instance from the postgres client
    const db = await SqlDatabase.fromExecutor(sql);
    
    const toolkit = new SqlToolkit(db, llm);
    const agentExecutor: AgentExecutor = createSqlAgent(llm, toolkit);

    console.log(`Executing with input: "${question}"`);
    const result = await agentExecutor.invoke({ input: question });
    console.log(`Got agent output: ${result.output}`);

    return new Response(JSON.stringify({ response: result.output }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      status: 500,
    });
  }
});