import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ramxfayfzsvkxogqrlwk.supabase.co';
const supabaseKey = 'sb_publishable_gIiS1mV7-GEP4mBbwpVLdw_yuGGM7nY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  try {
    console.log('Testing storage buckets...');

    // First, list all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.log('Error listing buckets:', listError.message);
    } else {
      console.log('Available buckets:', buckets.map(b => b.name));
    }

    const bucketsToTry = ['arquiv-files', 'Arquiv', 'arquiv', 'documents', 'public', 'uploads'];

    for (const bucket of bucketsToTry) {
      try {
        console.log(`Checking bucket: ${bucket}`);
        const { data, error } = await supabase.storage.from(bucket).list();
        if (error) {
          console.log(`Bucket ${bucket} error:`, error.message);
        } else {
          console.log(`Bucket ${bucket} exists, files:`, data?.length || 0);
        }
      } catch (err) {
        console.log(`Exception for bucket ${bucket}:`, err.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStorage();