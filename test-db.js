import { createClient } from '@supabase/supabase-js';

// --- IMPORTANT ---
// Replace with your NEW Supabase project's URL and Key.
const SUPABASE_URL = 'YOUR_NEW_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_NEW_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const runTest = async () => {
  // This is the admin user data we will test with
  const testUser = {
    id: '770e8400-e29b-41d4-a716-446655440001',
    email: 'admin@quickcart.com',
    username: 'admin_master',
    full_name: 'John Anderson',
    role: 'super_admin',
    is_active: true
  };

  console.log(`--- Testing Write/Read on new project for user: ${testUser.email} ---`);

  // To make this script re-runnable, we first delete the user if they exist.
  await supabase.from('admins').delete().eq('email', testUser.email);
  
  // 1. WRITE TEST: Attempt to INSERT the new admin.
  console.log('Attempting to INSERT the test user...');
  const { error: insertError } = await supabase.from('admins').insert(testUser);

  if (insertError) {
    console.error('\nWRITE FAILED: The INSERT operation failed. Please check your RLS policies for INSERT.', insertError);
    return;
  }
  console.log('WRITE SUCCESS: User was inserted successfully.');

  // 2. READ TEST: Attempt to SELECT the user we just inserted.
  console.log('\nAttempting to SELECT the test user back...');
  const { data, error: selectError } = await supabase
    .from('admins')
    .select('*')
    .eq('email', testUser.email);

  if (selectError) {
    console.error('\nREAD FAILED: The SELECT operation failed.', selectError);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('\nREAD SUCCESS: Found the user we just created.');
    console.log('Query Result:', data);
    console.log('\n--- TEST COMPLETE: Your database and policies are working correctly! ---');
  } else {
    console.log('\nREAD FAILED: The user was inserted but could not be retrieved. Check your RLS policies for SELECT.');
  }
};

runTest();