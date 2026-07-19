import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/token';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload) redirect('/dashboard');
  }

  redirect('/login');
}