// Home pública ahora muestra la landing de marketing mediante redirección
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirección inmediata a la página de marketing
  // Esta redirección es a nivel de cliente y funciona con el App Router
  redirect('/marketing');
}
