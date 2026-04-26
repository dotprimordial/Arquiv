-- Admin-Only Upload Policies for Arquiv Storage
-- Admin User ID: 033cc4d3-671c-4a34-ad02-a9ca4b39f174
-- Admin Email: seantomasytbr@gmail.com

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow admin uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin deletes" ON storage.objects;

-- Policy 1: Only admin can upload
CREATE POLICY "Allow admin uploads"
ON storage.objects
FOR INSERT
WITH CHECK (
  auth.uid() = '033cc4d3-671c-4a34-ad02-a9ca4b39f174'::uuid
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
USING (auth.uid() = '033cc4d3-671c-4a34-ad02-a9ca4b39f174'::uuid)
WITH CHECK (auth.uid() = '033cc4d3-671c-4a34-ad02-a9ca4b39f174'::uuid);

-- Policy 4: Only admin can delete files
CREATE POLICY "Allow admin deletes"
ON storage.objects
FOR DELETE
USING (auth.uid() = '033cc4d3-671c-4a34-ad02-a9ca4b39f174'::uuid);
