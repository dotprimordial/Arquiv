const adminEmail = 'seantomasytbr@gmail.com';

console.log('📋 Follow these steps to set admin-only upload permissions:');
console.log('\n1. Go to your Supabase Dashboard: https://app.supabase.com');
console.log('2. Select your project');
console.log('3. Go to SQL Editor and run this query:');
console.log(`
-- Get admin user ID (run first to get the ID)
SELECT id, email FROM auth.users WHERE email = '${adminEmail}';
`);
console.log('\n4. Copy the ID result and run this policy setup (replace ADMIN_USER_ID):');
console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin deletes" ON storage.objects;

-- Policy 1: Only admin can upload
CREATE POLICY "Allow admin uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.uid() = 'ADMIN_USER_ID'::uuid
);

-- Policy 2: Anyone can read public files
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
USING (true);

-- Policy 3: Only admin can update files
CREATE POLICY "Allow admin updates"
ON storage.objects
FOR UPDATE
USING (auth.uid() = 'ADMIN_USER_ID'::uuid)
WITH CHECK (auth.uid() = 'ADMIN_USER_ID'::uuid);

-- Policy 4: Only admin can delete files
CREATE POLICY "Allow admin deletes"
ON storage.objects
FOR DELETE
USING (auth.uid() = 'ADMIN_USER_ID'::uuid);
`);

console.log('\n5. Make sure all storage buckets have policies enabled:')
console.log('   - Go to Storage > Policies');
console.log('   - Verify policies are attached to each bucket');
console.log('\nDone! Only the admin user will be able to upload files.');
