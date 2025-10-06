import React from "react";
import { motion } from "framer-motion";

export function DynamicTitle() {
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const styles = `
        @keyframes dynamicColor {
          0% { color: #ffffff; }
          25% { color: #f8e16b; }
          50% { color: #e65353; }
          75% { color: #4fa6ff; }
          100% { color: #ffffff; }
        }
      `;

      const styleSheet = document.createElement("style");
      styleSheet.type = "text/css";
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-[40px] md:text-[72px] font-black leading-[0.95] tracking-tight animate-color-change"
        style={{ textShadow: "0 0 14px #FFFFFF70, 0 0 28px #FFFFFF40" }}
      >
        EL LOUNGE
      </motion.h1>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="text-sm md:text-base font-medium opacity-80"
        style={{ color: "#FFFFFFB8" }}
      >
        by ktdral
      </motion.span>
    </div>
  );
}
