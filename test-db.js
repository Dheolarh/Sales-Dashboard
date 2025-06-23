import { createClient } from '@supabase/supabase-js';

// --- IMPORTANT ---
// Manually copy your Supabase URL and Anon Key here.
// This bypasses any .env file issues.
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your actual Supabase URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your actual Anon Key

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const runTest = async () => {
  console.log('Attempting to connect and fetch from the "admins" table...');

  const { data, error } = await supabase
    .from('admins')
    .select('email, is_active')
    .eq('email', 'admin@quickcart.com');

  if (error) {
    console.error('Test Failed. An error occurred:', error);
    return;
  }

  console.log('Test Succeeded. Query Result:');
  console.log(data);

  if (data && data.length > 0) {
    console.log('\nSUCCESS: The admin@quickcart.com user was found!');
  } else {
    console.log('\nFAILURE: The admin@quickcart.com user was NOT found.');
  }
};

runTest();