// Server component wrapper to make the route dynamic (accepts server action POST)
import { headers } from 'next/headers';
import HomePage from './HomePage';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await headers();
  return <HomePage />;
}
