import { updateAllNormDescriptions } from '../app/actions/norm-actions';

async function main() {
  console.log('Starting to update all norm descriptions...');
  const result = await updateAllNormDescriptions();
  
  if (result.success) {
    console.log('✓ Success:', result);
  } else {
    console.error('✗ Failed:', result);
  }
}

main();
