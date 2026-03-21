// Fallback: middleware rewrites / → /marketing internamente.
// Si por alguna razón middleware no corre, esto redirige.
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/marketing');
}
