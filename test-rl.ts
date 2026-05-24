import { checkRateLimit } from './lib/rate-limit';

async function main() {
  const result = await checkRateLimit('::1', 'semantic', undefined, undefined);
  console.log('Result:', result);
}

main().catch(console.error);
