import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login');
  // return null; // Or some loading state if redirect takes time, though usually it's fast
}
