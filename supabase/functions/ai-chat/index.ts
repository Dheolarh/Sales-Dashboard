import { corsHeaders } from '../_shared/cors.ts';
import { GoogleGenerativeAI } from "@google/generative-ai";
import postgres, { Sql } from "postgres";

// --- THE COMPLETE & FINAL KEYWORD MAP ---
// Combines the original comprehensive list with regex for flexibility.
const KEYWORD_SQL_MAP = new Map<RegExp, () => string>([
    // Product Queries
    [/total\sproducts|how\smany\sproducts/i, () => 'SELECT COUNT(*) as count FROM products WHERE is_active = true'],
    [/products\sin\sstock|show\sstock/i, () => 'SELECT name, current_stock FROM products WHERE current_stock > 0 AND is_active = true ORDER BY current_stock DESC LIMIT 15'],
    [/out\sof\sstock|zero\sstock/i, () => 'SELECT name, sku FROM products WHERE current_stock = 0 AND is_active = true'],
    [/low\sstock|low\sinventory/i, () => 'SELECT name, current_stock FROM products WHERE current_stock > 0 AND current_stock <= 50 AND is_active = true ORDER BY current_stock ASC'],
    [/top\sproducts|best\sselling/i, () => 'SELECT p.name, SUM(t.quantity) as total_sold, SUM(t.total_amount) as revenue FROM products p JOIN transactions t ON p.id = t.product_id WHERE t.status = \'completed\' GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 10'],
    
    // Revenue & Sales Queries (non-specific dates)
    [/total\srevenue|all\stime\srevenue/i, () => 'SELECT SUM(total_amount) as revenue FROM transactions WHERE status = \'completed\''],
    [/revenue\stoday|sales\stoday/i, () => 'SELECT SUM(total_amount) as revenue FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\''],
    [/revenue\sthis\sweek|sales\sthis\sweek/i, () => 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'week\', CURRENT_DATE) AND status = \'completed\''],
    [/revenue\sthis\smonth|sales\sthis\smonth/i, () => 'SELECT SUM(total_amount) as revenue FROM transactions WHERE transaction_time >= DATE_TRUNC(\'month\', CURRENT_DATE) AND status = \'completed\''],
    [/sales\sby\scategory|revenue\sby\scategory/i, () => 'SELECT c.name, SUM(t.total_amount) as revenue FROM transactions t JOIN products p ON t.product_id = p.id JOIN categories c ON p.category_id = c.id WHERE t.status = \'completed\' GROUP BY c.name ORDER BY revenue DESC'],

    // Company & Category Queries
    [/all\scompanies|list\scompanies/i, () => 'SELECT name, country FROM companies ORDER BY name'],
    [/all\scategories|list\scategories/i, () => 'SELECT name, description FROM categories ORDER BY name'],
    [/products\sby\scompany|company\sproducts/i, () => 'SELECT c.name as company, COUNT(p.id) as product_count FROM companies c JOIN products p ON c.id = p.company_id GROUP BY c.id, c.name ORDER BY product_count DESC'],

    // Transaction Queries
    [/recent\stransactions|latest\ssales/i, () => 'SELECT t.transaction_id, p.name as product, t.quantity, t.total_amount, t.transaction_time FROM transactions t JOIN products p ON t.product_id = p.id ORDER BY t.transaction_time DESC LIMIT 10'],
    [/total\stransactions|how\smany\ssales/i, () => 'SELECT COUNT(*) as count FROM transactions WHERE status = \'completed\''],
    [/transactions\stoday|number\sof\ssales\stoday/i, () => 'SELECT COUNT(*) as count FROM transactions WHERE DATE(transaction_time) = CURRENT_DATE AND status = \'completed\''],

    // Admin & Access Queries
    [/total\sadmins|how\smany\sadmins/i, () => 'SELECT COUNT(*) as count FROM admins WHERE is_active = true'],
    [/recent\slogins|who\slogged\sin/i, () => 'SELECT username, last_login, location FROM admins WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 5'],
    [/access\slogs|login\shistory/i, () => 'SELECT email, login_time, location, success FROM access_logs ORDER BY login_time DESC LIMIT 15'],
    
    // Error & Notification Queries
    [/unresolved\serrors|open\serrors/i, () => 'SELECT error_type, description, severity, created_at FROM error_logs WHERE resolved = false ORDER BY created_at DESC'],
    [/recent\serrors|latest\serrors/i, () => 'SELECT error_type, description, severity, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5'],
    [/unread\snotifications|new\snotifications/i, () => 'SELECT title, message, created_at FROM notifications WHERE is_read = false ORDER BY created_at DESC']
]);

/*
 * @param sql - The PostgreSQL client instance.
 * @param cart - An array of items in the shopping cart.
 */
// Define CartItem type if not already imported
type CartItem = {
  product: {
    id: number;
    selling_price: number;
    // add other product fields if needed
  };
  quantity: number;
  // add other cart item fields if needed
};

async function processCheckout(sql: Sql, cart: CartItem[]) {
  // Using Promise.all to run database operations in parallel for efficiency
  await Promise.all(cart.map(item => {
    return Promise.all([
      // Decrease stock
      sql`SELECT decrease_stock(${item.product.id}, ${item.quantity})`,
      // Create transaction record
      sql`
        INSERT INTO transactions (transaction_id, product_id, quantity, unit_price, total_amount, customer_location, status)
        VALUES (
          'TXN-' || substr(md5(random()::text), 0, 10),
          ${item.product.id},
          ${item.quantity},
          ${item.product.selling_price},
          ${item.product.selling_price * item.quantity},
          'Unknown',
          'completed'
        )
      `
    ]);
  }));
}

function generateKeywordSQL(userQuery: string): string | null {
    const query = userQuery.toLowerCase().trim();
    for (const [regex, sqlGenerator] of KEYWORD_SQL_MAP.entries()) {
        if (regex.test(query)) {
            return sqlGenerator();
        }
    }
    return null;
}

// --- MAIN REQUEST HANDLER ---
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    let sql: Sql | null = null;

    try {
        const { query, history, cart, task } = await req.json(); // Added cart and task
        const supabaseDbUrl = Deno.env.get("SUPABASE_DB_URL");
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

        if (!supabaseDbUrl || !geminiApiKey) {
          throw new Error("Missing environment variables.");
        }

        sql = postgres(supabaseDbUrl, {
          // This configuration makes the library compatible with Deno's runtime
          transform: {
            undefined: null
          }
        });


        if (task === 'process_checkout') {
            if (!cart) throw new Error("Cart data is required for checkout.");
            await processCheckout(sql, cart);
            await sql.end();
            return new Response(JSON.stringify({ success: true, message: "Checkout successful!" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }


        if (!query) throw new Error("Missing query.");

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        let sqlQuery: string | null = null;

        // --- STEP 1: AI-POWERED DATE PARSING for complex date queries ---
        const dateHintRegex = /(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})|(\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|yesterday|last week|last month|quarter|st|nd|rd|th)\b)/i;
        if (dateHintRegex.test(query.toLowerCase())) {
            console.log("Date hint found, attempting AI date parsing for query:", query);
            const dateParsingPrompt = `Today's date is ${new Date().toISOString().split('T')[0]}. Analyze the user's query: "${query}". Extract a start date and an end date. If it's a single day, start and end dates are the same. For ranges (like weeks, months, quarters), calculate the correct start and end. Respond ONLY with a valid JSON object like {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}. If no specific date is found, respond with {"startDate": null, "endDate": null}.`;
            const dateResult = await model.generateContent(dateParsingPrompt);
            try {
                const { startDate, endDate } = JSON.parse(dateResult.response.text().trim());
                if (startDate && endDate) {
                    console.log(`AI parsed dates: startDate=${startDate}, endDate=${endDate}`);
                    const metric = query.toLowerCase().includes('how many') ? 'COUNT(*)' : 'SUM(total_amount)';
                    sqlQuery = `SELECT ${metric} as result FROM transactions WHERE status = 'completed' AND transaction_time >= '${startDate} 00:00:00' AND transaction_time <= '${endDate} 23:59:59'`;
                }
            } catch (e) {
                console.error("AI date parsing failed, will proceed to keyword matching. Error:", e);
            }
        }

        // --- STEP 2: COMPREHENSIVE KEYWORD MATCHING (if no date query was built) ---
        if (!sqlQuery) {
            sqlQuery = generateKeywordSQL(query);
        }

        // --- STEP 3: EXECUTE SQL or FALLBACK to CONVERSATION ---
        if (sqlQuery) {
             console.log(`Executing SQL: ${sqlQuery}`);
             let sql;
             try {
                sql = postgres(supabaseDbUrl);
                const data = await sql.unsafe(sqlQuery);
                await sql.end();
                const formatPrompt = `The user asked: "${query}". The database returned this JSON data: ${JSON.stringify(data, null, 2)}. Provide a clear, friendly, and direct summary of this data. Format tables and numbers nicely using markdown. Start with the direct answer.`;
                const result = await model.generateContent(formatPrompt);
                return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
             } catch (sqlError) {
                if (sql) await sql.end();
                console.error("SQL Execution Error:", sqlError);
                const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
                const errorPrompt = `I am a chatbot. When trying to answer the user's question "${query}", I ran an SQL query but it failed with this error: "${errorMessage}". Explain this error to a non-technical user in a simple, friendly way and apologize. Do not suggest code solutions or show them the SQL.`;
                const result = await model.generateContent(errorPrompt);
                return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
             }
        } else {
            // --- STEP 4: CONVERSATIONAL FALLBACK ---
            console.log("No SQL match found, falling back to conversational model.");
            const fallbackModel = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                systemInstruction: "You are Stella, a helpful AI assistant for a business dashboard. If you cannot answer a question directly, guide the user on how to rephrase it or refer them to the correct page on the dashboard (e.g., [Products Page](/products))."
            });
            const chat = fallbackModel.startChat({ history });
            const result = await chat.sendMessage(query);
            return new Response(JSON.stringify({ response: result.response.text() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }
    } catch (error) {
        console.error('Critical Error in AI chat function:', error);
        return new Response(JSON.stringify({ error: "A critical error occurred. Please check the function logs." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }
});