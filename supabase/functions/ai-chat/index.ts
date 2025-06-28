import 'https://esm.sh/reflect-metadata';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SqlDatabase } from "langchain/sql_db";
import { SqlToolkit, createSqlAgent } from "langchain/agents/toolkits/sql";
import { AgentExecutor } from "langchain/agents";
import { DataSource } from "typeorm";

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
      model: 'gemini-2.5-pro',
      temperature: 0,
    });

    const datasource = new DataSource({
      type: 'postgres',
      host: Deno.env.get('DB_HOST'),
      port: parseInt(Deno.env.get('DB_PORT')!, 10),
      username: Deno.env.get('DB_USER'),
      password: Deno.env.get('DB_PASSWORD'),
      database: Deno.env.get('DB_NAME'),
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // THIS IS THE CORRECT METHOD
    // It takes an object with the datasource nested under the `appDataSource` key.
    const db = await SqlDatabase.fromDataSourceParams({
      appDataSource: datasource,
    });

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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      status: 500,
    });
  }
});