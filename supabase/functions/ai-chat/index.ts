import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai@0.15.0';
import { corsHeaders } from '../_shared/cors.ts';

// DYNAMIC SCHEMA ANALYZER
class SchemaAnalyzer {
    constructor(private supabase: SupabaseClient) { }

    async analyzeSchema(): Promise<string> {
        // Fetch schema information directly from database
        const { data: tables, error } = await this.supabase.rpc('get_schema_info');

        if (error || !tables) {
            console.error('Schema analysis failed:', error);
            return 'Database schema information unavailable';
        }

        let schemaSummary = "Database Schema:\n";
        for (const table of tables) {
            schemaSummary += `\n## ${table.table_name}\n`;
            schemaSummary += `- Description: ${table.description || 'No description'}\n`;
            schemaSummary += "Columns:\n";

            if (table.columns) {
                for (const column of table.columns) {
                    schemaSummary += `  - ${column.column_name} (${column.data_type})`;
                    if (column.description) schemaSummary += `: ${column.description}`;
                    schemaSummary += "\n";
                }
            }

            if (table.relationships && table.relationships.length > 0) {
                schemaSummary += "Relationships:\n";
                for (const rel of table.relationships) {
                    schemaSummary += `  - ${rel.relationship_type} to ${rel.target_table} via ${rel.foreign_key}\n`;
                }
            }
        }

        return schemaSummary;
    }

    async generateSchemaMapping(query: string): Promise<string> {
        // Use Gemini to dynamically create schema mapping
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

        const prompt = `
You are a database schema mapping expert. Analyze the following query and database schema to create a semantic mapping:

Query: "${query}"

Database Schema:
${await this.analyzeSchema()}

Create a JSON mapping that connects natural language concepts in the query to database elements. Follow this format:
{
  "query_terms": {
    "term1": "schema_element",
    "term2": "schema_element"
  },
  "relationships": [
    "table1.column -> table2.column"
  ],
  "hypotheses": [
    "Possible interpretation 1",
    "Possible interpretation 2"
  ]
}

Focus on:
- Mapping nouns to tables
- Mapping verbs/actions to relationships or columns
- Mapping adjectives to column values or filters
- Identifying implied relationships

Return ONLY the JSON object with no additional text.
    `;

        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error('Mapping generation failed:', error);
            return '{}';
        }
    }
}

// QUERY EXECUTION ENGINE
class QueryEngine {
    constructor(private supabase: SupabaseClient) { }

    async executeDynamicQuery(query: string, mapping: any): Promise<any> {
        // Use Gemini to generate SQL based on dynamic mapping
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });

        const prompt = `
Based on the following query and schema mapping, generate a valid PostgreSQL SELECT query:

Query: "${query}"

Schema Mapping:
${JSON.stringify(mapping, null, 2)}

Rules:
1. Use only tables and columns that exist in the schema
2. Prefer explicit JOINs over implicit joins
3. Include only necessary columns
4. Add LIMIT 10 unless otherwise specified
5. Use current date functions where appropriate

Return ONLY the SQL query with no additional text or explanations.
    `;

        try {
            const result = await model.generateContent(prompt);
            let sql = result.response.text().trim();

            // Clean common artifacts
            sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();

            // Execute the generated SQL
            const { data, error } = await this.supabase.rpc('execute_sql', { query: sql });
            return { sql, data, error };

        } catch (error) {
            console.error('Query generation failed:', error);
            return {
                sql: '-- Failed to generate SQL',
                error: { message: 'AI query generation failed' }
            };
        }
    }
}

// MAIN FUNCTION
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { query, history } = await req.json();
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const analyzer = new SchemaAnalyzer(supabaseAdmin);
        const engine = new QueryEngine(supabaseAdmin);

        // Step 1: Generate dynamic schema mapping
        const rawMapping = await analyzer.generateSchemaMapping(query);
        let mapping = {};
        try {
            mapping = JSON.parse(rawMapping.match(/{[\s\S]*}/)?.[0] || '{}');
        } catch (e) {
            console.error('JSON parsing failed:', e);
        }

        // Step 2: Execute dynamic query
        const { sql, data, error } = await engine.executeDynamicQuery(query, mapping);

        // Step 3: Format response
        let responseText = `🔍 **Results for:** "${query}"\n\n`;

        if (error) {
            responseText += `❌ **Execution Error:** ${error.message}\n\n`;
        } else if (data?.error) {
            responseText += `❌ **SQL Error:** ${data.error}\n\n`;
        } else {
            const resultData = Array.isArray(data) ? data : [];
            responseText += `📊 **Returned ${resultData.length} rows**\n\n`;
            if (resultData.length > 0) {
                responseText += "```json\n" + JSON.stringify(resultData.slice(0, 5), null, 2) + "\n```\n\n";
            }
        }

        responseText += `💻 **Executed SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;
        responseText += `🧠 **Schema Mapping:**\n\`\`\`json\n${JSON.stringify(mapping, null, 2)}\n\`\`\``;

        return new Response(JSON.stringify({ response: responseText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorResponse = `❌ **Critical Error:** ${error.message || 'Unknown error'}\n\n`;
        return new Response(JSON.stringify({ response: errorResponse }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});