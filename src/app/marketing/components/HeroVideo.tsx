import React from "react";

type HeroVideoProps = {
  className?: string;
  poster?: string;
  sources?: {
    src: string;
    type?: string;
    media?: string;
  }[];
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  showOverlay?: boolean;
  overlayColor?: string;
  overlayBlur?: number; // px
};

/**
 * HeroVideo: video de fondo responsivo para el hero.
 * - Usa 1080p/720p/480p por media queries
 * - Acepta poster y className para cubrir el contenedor
 */
export function HeroVideo({
  className = "absolute inset-0 w-full h-full object-cover",
  poster,
  sources,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  showOverlay = true,
  overlayColor = "rgba(0,0,0,0.5)",
  overlayBlur = 12,
}: HeroVideoProps) {
  const defaultSources = [
    { src: "/videos/videohero-1080p.mp4", type: "video/mp4", media: "(min-width: 1280px)" },
    { src: "/videos/videohero-720p.mp4", type: "video/mp4", media: "(min-width: 768px)" },
    { src: "/videos/videohero-480p.mp4", type: "video/mp4", media: "(max-width: 767px)" },
  ];
  const list = sources && sources.length ? sources : defaultSources;
  return (
    <>
      <video
        className={`${className} z-0`}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        {...(poster ? { poster } : {})}
      >
        {list.map((s, i) => (
          <source key={i} src={s.src} type={s.type || "video/mp4"} media={s.media} />
        ))}
      </video>
      {showOverlay && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: overlayColor, backdropFilter: `blur(${overlayBlur}px)` }}
          aria-hidden
        />
      )}
      <style jsx>{`
        video { object-fit: cover; width: 100%; height: 100%; }
      `}</style>
    </>
  );
}

export default HeroVideo;
