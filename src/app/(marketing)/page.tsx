import { Hero } from './components/Hero';
import { Section, SectionTitle } from './components/Section';
import { FeaturesGrid } from './components/Features';
import { EventsList } from './components/Events';
import { GalleryGrid } from './components/Gallery';

export const metadata = {
  title: 'Marketing Landing | QR Platform',
  description: 'Página informativa de la plataforma QR',
};

export default function MarketingLandingPage() {
  const features = [
    { icon: '🔥', title: 'Experiencias únicas', description: 'Eventos temáticos que elevan cada momento.' },
    { icon: '⚡', title: 'Tecnología QR', description: 'Integramos códigos QR para interacción y dinamismo.' },
    { icon: '🎧', title: 'Música curada', description: 'Playlists y DJs seleccionados para cada ambiente.' },
    { icon: '🛰️', title: 'Conectividad', description: 'Infraestructura preparada para experiencias digitales.' },
    { icon: '💡', title: 'Innovación', description: 'A/B tests rápidos de conceptos para el público.' },
    { icon: '🛡️', title: 'Fiabilidad', description: 'Arquitectura estable y escalable.' },
  ];

  const events = [
    { title: 'Noche Retro', date: '12 OCT', description: 'Clásicos que nunca fallan, remixes y visuales vintage.' },
    { title: 'Electro Session', date: '19 OCT', description: 'Lineup emergente y experiencia inmersiva de luces.' },
    { title: 'Fiesta Temática', date: '26 OCT', description: 'Una narrativa distinta cada mes con interacción QR.' },
  ];

  const images = [
    { src: '#', alt: 'Ambiente' },
    { src: '#', alt: 'Luces' },
    { src: '#', alt: 'Pista' },
    { src: '#', alt: 'Bar' },
    { src: '#', alt: 'Escenario' },
    { src: '#', alt: 'Experiencia QR' },
  ];

  return (
    <main className="text-white min-h-screen" style={{ background: 'linear-gradient(180deg,#0E0606,#07070C)' }}>
      <Hero
        title="Experiencias que prenden la noche"
        subtitle="Un espacio donde tecnología y ambiente social se combinan para vivir algo distinto."
        ctaPrimary={{ label: 'Reservar', href: '#reservas' }}
        ctaSecondary={{ label: 'Próximos eventos', href: '#eventos' }}
      />

      <Section id="sobre">
        <SectionTitle title="Lo que ofrecemos" subtitle="Una propuesta cuidada y enfocada en la interacción" />
        <FeaturesGrid items={features} />
      </Section>

      <Section id="eventos" className="bg-gradient-to-br from-white/5 to-white/0">
        <SectionTitle title="Próximos eventos" subtitle="Agenda en constante evolución" />
        <EventsList items={events} />
      </Section>

      <Section id="galeria">
        <SectionTitle title="Galería" subtitle="Momentos capturados" />
        <GalleryGrid images={images} />
      </Section>

      <footer className="mt-24 py-10 text-center text-white/50 text-sm">
        <p>© {new Date().getFullYear()} QR Platform. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
