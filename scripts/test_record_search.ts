// test_record_search.ts – script to verify recordSearch
const { recordSearch } = require('../lib/rate-limit');
const { getAdminSupabaseClient } = require('../lib/supabase-server');

async function main() {
  const ip = '127.0.0.1';
  const type: 'browse' = 'browse';
  const query = undefined;
  const country = 'Portugal';
  const userId = undefined;

  console.log('Calling recordSearch...');
  try {
    await recordSearch(ip, type, query, country, userId);
    console.log('recordSearch completed');
  } catch (e) {
    console.error('recordSearch threw:', e);
  }

  // fetch rows
  const supabase = getAdminSupabaseClient();
  const { data, error } = await supabase.from('search_usage').select('*');
  if (error) {
    console.error('Error fetching rows:', error);
  } else {
    console.log('Rows in search_usage:', data);
  }
}

main();
