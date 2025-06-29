import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres from "postgres";

// Predefined queries based on actual database schema
const QUERY_PATTERNS = {
  // Product queries
  'total products': 'SELECT COUNT(*) as count FROM products WHERE is_active = true',
  'products in stock': 'SELECT name, current_stock FROM products WHERE current_stock > 0 AND is_active = true ORDER BY current_stock DESC',
  'out of stock': 'SELECT name, sku FROM products WHERE current_stock = 0 AND is_active = true',
  'low stock': 'SELECT name, current_stock FROM products WHERE current_stock <= 10 AND is_active = true ORDER BY current_stock ASC',
  'top products': 'SELECT p.name, SUM(t.quantity) as total_sold FROM products p JOIN transactions t ON p.id = t.product_id GROUP BY p.id, p.name ORDER BY total_sold DESC LIMIT 10',
  
  // Sales and revenue queries
  'total revenue': 'SELECT SUM(total_amount) as revenue FROM transactions WHERE status = \'completed\'',
  'revenue today': 'SELECT SUM(total_amount) as revenue FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\'',
  'revenue this week': 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'week\', CURRENT_DATE) AND status = \'completed\'',
  'revenue this month': 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'month\', CURRENT_DATE) AND status = \'completed\'',
  'sales by category': 'SELECT c.name, SUM(t.total_amount) as revenue FROM transactions t JOIN products p ON t.product_id = p.id JOIN categories c ON p.category_id = c.id WHERE t.status = \'completed\' GROUP BY c.name ORDER BY revenue DESC',
  
  // Company and category queries
  'all companies': 'SELECT name, country FROM companies ORDER BY name',
  'all categories': 'SELECT name, description FROM categories ORDER BY name',
  'products by company': 'SELECT c.name as company, COUNT(p.id) as product_count FROM companies c LEFT JOIN products p ON c.id = p.company_id GROUP BY c.id, c.name ORDER BY product_count DESC',
  
  // Transaction queries
  'recent transactions': 'SELECT t.transaction_id, p.name as product, t.quantity, t.total_amount, t.transaction_time FROM transactions t JOIN products p ON t.product_id = p.id ORDER BY t.transaction_time DESC LIMIT 10',
  'total transactions': 'SELECT COUNT(*) as count FROM transactions WHERE status = \'completed\'',
  'transactions today': 'SELECT COUNT(*) as count FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\'',
  
  // Admin and access queries
  'total admins': 'SELECT COUNT(*) as count FROM admins WHERE is_active = true',
  'recent logins': 'SELECT username, last_login FROM admins WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 5',
  'access logs': 'SELECT email, login_time, location FROM access_logs ORDER BY login_time DESC LIMIT 10',
  
  // Error and notification queries
  'unresolved errors': 'SELECT COUNT(*) as count FROM error_logs WHERE resolved = false',
  'recent errors': 'SELECT error_type, description, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5',
  'unread notifications': 'SELECT COUNT(*) as count FROM notifications WHERE is_read = false'
};

// Function to find matching query pattern
function findQueryPattern(userQuery: string): string | null {
  const query = userQuery.toLowerCase().trim();
  
  for (const [pattern, sql] of Object.entries(QUERY_PATTERNS)) {
    if (query.includes(pattern)) {
      return sql;
    }
  }
  return null;
}

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

    // Special command to show available keywords
    if (query.toLowerCase().includes('help') || query.toLowerCase().includes('keywords') || query.toLowerCase().includes('commands')) {
      const helpMessage = `
📊 **Available Query Keywords:**

**PRODUCTS:**
• "total products" - Count all active products
• "products in stock" - Show products with stock
• "out of stock" - Show products with zero stock
• "low stock" - Show products with 10 or fewer items
• "top products" - Show best-selling products

**SALES & REVENUE:**
• "total revenue" - Show all-time revenue
• "revenue today" - Show today's revenue
• "revenue this week" - Show this week's revenue
• "revenue this month" - Show this month's revenue
• "sales by category" - Revenue by category

**COMPANIES & CATEGORIES:**
• "all companies" - List all companies
• "all categories" - List all categories
• "products by company" - Product count per company

**TRANSACTIONS:**
• "recent transactions" - Latest 10 transactions
• "total transactions" - Count all transactions
• "transactions today" - Today's transaction count

**ADMIN & ACCESS:**
• "total admins" - Count active administrators
• "recent logins" - Recent admin logins
• "access logs" - Recent access attempts

**ERRORS & NOTIFICATIONS:**
• "unresolved errors" - Unresolved system errors
• "recent errors" - Latest error logs
• "unread notifications" - Unread notifications

Simply type any of these keywords in your message!
      `;
      
      return new Response(JSON.stringify({ response: helpMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check if user query matches any predefined pattern
    const matchingSQL = findQueryPattern(query);
    
    if (matchingSQL && supabaseDbUrl) {
      console.log("Found matching query pattern:", matchingSQL);
      
      let sql;
      try {
        sql = postgres(supabaseDbUrl);
        console.log("Executing predefined SQL:", matchingSQL);
        const data = await sql.unsafe(matchingSQL);
        console.log("SQL execution successful, data:", data);
        
        await sql.end();
        
        // If no data found
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return new Response(JSON.stringify({ 
            response: "I executed the query successfully, but no data was found in the database." 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
        
        // Initialize AI to format the response
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const formatPrompt = `
          The user asked: "${query}"
          Here's the data from the database: ${JSON.stringify(data, null, 2)}
          
          Please provide a clear, friendly summary of this data in response to the user's question:
        `;
        
        const response = await model.generateContent(formatPrompt);
        const formattedResponse = response.response.text();
        
        return new Response(JSON.stringify({ 
          response: formattedResponse 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
        
      } catch (sqlError) {
        console.error("SQL execution error:", sqlError);
        if (sql) {
          try { 
            await sql.end(); 
          } catch (closeError) {
            console.error("Error closing connection:", closeError);
          }
        }
        const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
        return new Response(JSON.stringify({ 
          response: `I tried to run a query but got an error: ${errorMessage}. The database might be unavailable.` 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    }

    // If no matching pattern, use AI for general conversation or guidance
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      systemInstruction: `You are Insight, a helpful AI assistant for the QuickCart sales dashboard. For guidance on adding/editing data, direct users to appropriate pages like Products Page, Categories Page, etc. For general conversation, respond normally.`
    });
    
    let chat;
    if (history && history.length > 0) {
      chat = model.startChat({ history: history });
    } else {
      chat = model.startChat();
    }
    
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
      details: "Function error in keyword-based system"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});