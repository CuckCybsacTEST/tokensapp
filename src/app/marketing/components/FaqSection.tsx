import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brand } from "../styles/brand";
import { SectionTitle } from "./ui/SectionTitle";

interface FaqSectionProps {
  faq: {
    q: string;
    a: string;
  }[];
}

export function FaqSection({ faq }: FaqSectionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [tallMobile, setTallMobile] = useState(false);
  const [shouldCenter, setShouldCenter] = useState(false);
  const [offsetMobile, setOffsetMobile] = useState(false);
  const [narrowMobile, setNarrowMobile] = useState(false); // <=360px padding superior extra

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      const h = window.innerHeight;
      const w = window.innerWidth;
      const isTall = w < 768 && h >= 780; // mismo umbral que otras secciones
      setTallMobile(isTall);
      setOffsetMobile(w < 768 && w <= 430 && h >= 730);
      setNarrowMobile(w <= 360);
      // Verificamos si el contenido cabe razonablemente para centrar
      const section = document.getElementById("faq");
      if (section) {
        const inner = section.querySelector("[data-faq-inner]") as HTMLElement | null;
        if (inner) {
          const total = inner.offsetHeight + 120; // margen superior/inferior estimado
          setShouldCenter(isTall && total < h);
        }
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <section
      id="faq"
      className={`relative overflow-hidden flex flex-col ${
        shouldCenter
          ? `justify-center ${offsetMobile ? (narrowMobile ? "pt-16" : "pt-12") : narrowMobile ? "pt-12" : "pt-8"}`
          : `justify-start ${offsetMobile ? (narrowMobile ? "pt-14" : "pt-10") : narrowMobile ? "pt-12" : "pt-6"}`
      }
        md:justify-center pb-16 md:pt-16 md:pb-20 transition-[justify-content,padding] duration-300`}
      style={{ minHeight: "100vh" }}
    >
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${brand.primary}11, ${brand.secondary}11)`,
        }}
      />
      <div data-faq-inner className="container mx-auto max-w-7xl px-4 md:px-8 relative z-10 w-full">
        <SectionTitle
          kicker="Preguntas frecuentes"
          title="Todo lo que necesitas saber"
          compact
          dense
          subtitle={
            <>
              <span className="hidden md:inline">
                Respuestas a las dudas más comunes de nuestros visitantes.
              </span>
              <span className="inline md:hidden text-sm">Respuestas rápidas a tus dudas.</span>
            </>
          }
        />
        <div className="mt-6 md:mt-10 space-y-4">
          {faq.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-lg"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="flex justify-between items-center w-full p-5 text-left"
              >
                <h3 className="font-medium text-sm md:text-base">{item.q}</h3>
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-transform"
                  style={{
                    background: expandedIndex === index ? brand.primary : "rgba(255,255,255,0.1)",
                    transform: expandedIndex === index ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  <span className="text-sm font-bold">+</span>
                </div>
              </button>
              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className="p-5 pt-0 text-sm md:text-base"
                      style={{ color: brand.text.secondary }}
                    >
                      {item.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
