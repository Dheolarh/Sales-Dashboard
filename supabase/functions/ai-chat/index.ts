import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres from "postgres";

// --- NEW KEYWORD-DRIVEN SQL QUERY MAP ---
// This map connects user-friendly keywords to specific SQL queries.
const KEYWORD_SQL_MAP = new Map<string[], string>([
  [['total products', 'how many products'], 'SELECT COUNT(*) as count FROM products WHERE is_active = true'],
  [['products in stock', 'show stock'], 'SELECT name, current_stock FROM products WHERE current_stock > 0 AND is_active = true ORDER BY current_stock DESC LIMIT 15'],
  [['out of stock', 'zero stock'], 'SELECT name, sku FROM products WHERE current_stock = 0 AND is_active = true'],
  [['low stock', 'low inventory'], 'SELECT name, current_stock FROM products WHERE current_stock > 0 AND current_stock <= 50 AND is_active = true ORDER BY current_stock ASC'],
  [['top products', 'best selling'], 'SELECT p.name, SUM(t.quantity) as total_sold, SUM(t.total_amount) as revenue FROM products p JOIN transactions t ON p.id = t.product_id WHERE t.status = \'completed\' GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 10'],
  
  [['total revenue', 'all time revenue'], 'SELECT SUM(total_amount) as revenue FROM transactions WHERE status = \'completed\''],
  [['revenue today', 'sales today'], 'SELECT SUM(total_amount) as revenue FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\''],
  [['revenue this week', 'sales this week'], 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'week\', CURRENT_DATE) AND status = \'completed\''],
  [['revenue this month', 'sales this month'], 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'month\', CURRENT_DATE) AND status = \'completed\''],
  [['sales by category', 'revenue by category'], 'SELECT c.name, SUM(t.total_amount) as revenue FROM transactions t JOIN products p ON t.product_id = p.id JOIN categories c ON p.category_id = c.id WHERE t.status = \'completed\' GROUP BY c.name ORDER BY revenue DESC'],
  
  [['all companies', 'list companies'], 'SELECT name, country FROM companies ORDER BY name'],
  [['all categories', 'list categories'], 'SELECT name, description FROM categories ORDER BY name'],
  [['products by company', 'company products'], 'SELECT c.name as company, COUNT(p.id) as product_count FROM companies c JOIN products p ON c.id = p.company_id GROUP BY c.id, c.name ORDER BY product_count DESC'],

  [['recent transactions', 'latest sales'], 'SELECT t.transaction_id, p.name as product, t.quantity, t.total_amount, t.transaction_time FROM transactions t JOIN products p ON t.product_id = p.id ORDER BY t.transaction_time DESC LIMIT 10'],
  [['total transactions', 'how many sales'], 'SELECT COUNT(*) as count FROM transactions WHERE status = \'completed\''],
  [['transactions today', 'number of sales today'], 'SELECT COUNT(*) as count FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\''],

  [['total admins', 'how many admins'], 'SELECT COUNT(*) as count FROM admins WHERE is_active = true'],
  [['recent logins', 'who logged in'], 'SELECT username, last_login, location FROM admins WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 5'],
  [['access logs', 'login history'], 'SELECT email, login_time, location, success FROM access_logs ORDER BY login_time DESC LIMIT 15'],
  
  [['unresolved errors', 'open errors'], 'SELECT error_type, description, severity, created_at FROM error_logs WHERE resolved = false ORDER BY created_at DESC'],
  [['recent errors', 'latest errors'], 'SELECT error_type, description, severity, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5'],
  [['unread notifications', 'new notifications'], 'SELECT title, message, created_at FROM notifications WHERE is_read = false ORDER BY created_at DESC']
]);

// --- NEW FUNCTION TO FIND A MATCHING SQL QUERY ---
function findMatchingSQL(userQuery: string): string | null {
  const query = userQuery.toLowerCase().trim();
  for (const [keywords, sql] of KEYWORD_SQL_MAP.entries()) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return sql;
    }
  }
  return null;
}

// --- NEW LIST OF POTENTIAL DATABASE-RELATED TERMS ---
// Used to provide helpful suggestions to the user.
const DATABASE_HINTS = [
  'sale', 'sales', 'revenue', 'product', 'stock', 'inventory', 'transaction', 
  'company', 'category', 'admin', 'user', 'login', 'error', 'profit', 'cost'
];

// --- MAIN REQUEST HANDLER ---
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, history } = await req.json();
    if (!query) throw new Error("query is required");

    const supabaseDbUrl = Deno.env.get("SUPABASE_DB_URL");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey || !supabaseDbUrl) {
      throw new Error("Missing environment variables: GEMINI_API_KEY or SUPABASE_DB_URL");
    }

    // --- 1. KEYWORD-BASED DATABASE QUERY ---
    const matchingSQL = findMatchingSQL(query);

    if (matchingSQL) {
      console.log("Found matching SQL for query:", query, "->", matchingSQL);
      let sql;
      try {
        sql = postgres(supabaseDbUrl);
        const data = await sql.unsafe(matchingSQL);
        await sql.end();

        if (!data || (Array.isArray(data) && data.length === 0)) {
          return new Response(JSON.stringify({ response: "I ran the query, but no data was found for your request." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        
        // Use Gemini to format the data into a friendly response
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const formatPrompt = `The user asked: "${query}". The database returned this data: ${JSON.stringify(data, null, 2)}. Please provide a clear, friendly summary of this data.`;
        const result = await model.generateContent(formatPrompt);
        
        return new Response(JSON.stringify({ response: result.response.text() }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      } catch (sqlError) {
        if (sql) await sql.end();
        console.error("SQL execution error:", sqlError);
        return new Response(JSON.stringify({ response: `Sorry, I encountered a database error: ${sqlError.message}.` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    // --- 2. CONVERSATIONAL FALLBACK & HINTS ---
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: `You are Stella, a helpful AI assistant for the QuickCart sales dashboard. 
      - Your primary role is to answer questions based on a database.
      - If a user asks how to do something you cannot do (like add, edit, or delete data), you MUST refer them to the correct page on the dashboard. For example, to add a product, you should say "You can add new products on the [Products page](/products)."
      - For general conversation, be friendly and helpful.
      - Do not invent data or make up answers about database contents. If you don't know, say you don't know.`
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(query);
    let aiResponse = result.response.text();

    // --- Add helpful hint if the query seems database-related but didn't match a keyword ---
    const seemsDatabaseRelated = DATABASE_HINTS.some(hint => query.toLowerCase().includes(hint));
    if (seemsDatabaseRelated) {
      aiResponse += `\n\n*P.S. If you were trying to query the database, try using specific keywords. You can see a list of available keywords in the chat interface.*`;
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});