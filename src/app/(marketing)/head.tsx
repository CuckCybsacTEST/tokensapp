export default function Head() {
  return (
    <>
  <link rel="preload" as="image" href="/logo.png" fetchPriority="high" />
      <link rel="preload" as="audio" href="/win-sound.mp3" />
      {/* Opcional: icono y theme color para evitar repintados iniciales */}
      <meta name="theme-color" content="#111827" />
    </>
  );
}
