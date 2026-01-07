"use client";
import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { brand } from "../styles/brand";
import { SectionTitle } from "./ui/SectionTitle";

interface GallerySectionProps {
  gallery: {
    src: string;
    alt: string;
  }[];
}

interface GalleryImage {
  id: string;
  src: string;
  alt: string | null;
  blurDataUrl?: string | null;
}

interface DisplayImage {
  src: string;
  alt: string;
  blur?: string | null;
}

export function GallerySection({ gallery: initialGallery }: GallerySectionProps) {
  const [dbImages, setDbImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar imágenes dinámicas desde el API al montar
  useEffect(() => {
    async function loadImages() {
      try {
        const res = await fetch("/api/admin/gallery/upload");
        if (res.ok) {
          const data = await res.json();
          if (data.images && data.images.length > 0) {
            setDbImages(data.images);
          }
        }
      } catch (e) {
        console.error("Error loading gallery:", e);
      } finally {
        setLoading(false);
      }
    }
    loadImages();
  }, []);

  // Usar imágenes de DB si existen, sino usar las del prop (fallback/static)
  // Normalizar tipo para incluir blur opcional
  const displayImages: DisplayImage[] = dbImages.length > 0 
    ? dbImages.map(img => ({ src: img.src, alt: img.alt || "Show Highlight", blur: img.blurDataUrl }))
    : initialGallery.map(img => ({ ...img, blur: null }));

  // Normalizamos a mínimo 12 elementos (placeholder) para futuras expansiones.
  const padded = useMemo(() => {
    const arr: DisplayImage[] = [...displayImages];
    const filler: DisplayImage = { src: "#", alt: "Momento", blur: null }; 
    // Rellenar hasta 12 solo si no hay data real suficiente o para completar grid
    // Si tenemos > 8 imagenes reales, mejor mostrar solo reales o multiplo de 4
    if (arr.length > 0) {
       // Opcional: solo rellenar si son muy poquitas (< 4) para no romper layout
       while (arr.length < 8) arr.push(filler);
    } else {
       while (arr.length < 12) arr.push(filler); 
    }
    return arr;
  }, [displayImages]);

  const [tallMobile, setTallMobile] = useState(false);
  const [offsetMobile, setOffsetMobile] = useState(false);
  const [narrowMobile, setNarrowMobile] = useState(false); // <=360px para padding extra superior
  const [mobileCount, setMobileCount] = useState(8);
  const [mobileCols, setMobileCols] = useState<"grid-cols-2" | "grid-cols-3" | "grid-cols-4">(
    "grid-cols-4"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isMobile = w < 768;
      setNarrowMobile(w <= 360);
      setTallMobile(isMobile && h >= 780);
      setOffsetMobile(isMobile && w <= 430 && h >= 730);
      if (!isMobile) {
        setMobileCount(8);
        setMobileCols("grid-cols-4");
        return;
      }
      if (w < 370) {
        setMobileCount(4);
        setMobileCols("grid-cols-2");
      } else if (w < 450) {
        setMobileCount(6);
        setMobileCols("grid-cols-3");
      } else {
        setMobileCount(8);
        setMobileCols("grid-cols-4");
      }
    };
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);

  const items = useMemo(() => padded.slice(0, mobileCount), [padded, mobileCount]);

  return (
    <section
      id="galeria"
      className={`relative overflow-hidden flex flex-col ${
        tallMobile
          ? `justify-center ${offsetMobile ? (narrowMobile ? "pt-20" : "pt-14") : narrowMobile ? "pt-16" : "pt-10"}`
          : `justify-start ${offsetMobile ? (narrowMobile ? "pt-14" : "pt-10") : narrowMobile ? "pt-12" : "pt-8"}`
      }
        md:justify-center pb-14 md:pt-14 md:pb-20 transition-[justify-content,padding] duration-300`}
      style={{ minHeight: "100vh" }}
    >
      <div
        className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle, ${brand.primary}44, transparent)` }}
      />
      <div className="container mx-auto max-w-7xl px-4 md:px-8 pt-2 md:pt-6 pb-6 md:pb-10 relative z-10 w-full">
        <SectionTitle
          kicker="Galería de shows"
          title="Nuestros shows en fotos"
          compact
          dense
          subtitle={
            <>
              <span className="hidden md:inline">
                Luces inteligentes, pantallas, artistas y momentos. Así se vive la noche.
              </span>
              <span className="inline md:hidden text-sm">
                Luces, pantallas y artistas en acción.
              </span>
            </>
          }
        />
        <div className="mt-4 md:mt-8">
          <div className={`grid ${mobileCols} md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full`}>
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                viewport={{ once: true }}
                className="aspect-square rounded-md overflow-hidden relative group border"
              >
                {item.src && item.src !== "#" ? (
                  <Image
                    src={item.src}
                    alt={item.alt || "Show"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 280px"
                    priority={index < 4}
                    placeholder={item.blur ? "blur" : "empty"}
                    blurDataURL={item.blur || undefined}
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${brand.primary}22, ${brand.secondary}22)`,
                    }}
                  >
                    <span className="text-3xl md:text-4xl opacity-60">
                      {index % 2 === 0 ? "🎧" : "🎉"}
                    </span>
                  </div>
                )}
                <div
                  className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition duration-300"
                  style={{ background: "rgba(0,0,0,0.45)" }}
                >
                  <div className="p-3 md:p-4">
                    <h4 className="font-bold text-sm md:text-base">{item.alt}</h4>
                    <p className="text-[11px] md:text-sm" style={{ color: brand.text.secondary }}>
                      Highlights
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 md:mt-8 flex justify-center">
            <a
              href="#galeria-mas"
              className="rounded-full px-4 py-2 text-xs md:text-sm font-semibold tracking-wide backdrop-blur-sm border transition-colors"
              style={{
                background: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.15)",
                boxShadow: `0 4px 12px -6px ${brand.primary}55`,
              }}
            >
              Más fotos ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
