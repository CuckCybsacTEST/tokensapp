/**
 * Brand palette and style variables for the music request page.
 * Based on the marketing landing page styles for consistency.
 */

// Core color palette (same as marketing)
export const brand = {
  // Primary colors
  primary: "#FF4D2E",
  secondary: "#FF7A3C",
  accent: "#FFD166",

  // Dark backgrounds
  darkA: "#0E0606",
  darkB: "#07070C",

  // Utility functions to generate variants
  withOpacity: (color: string, opacity: number) => {
    // Convert opacity (0-1) to hex (00-FF)
    const hex = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${hex}`;
  },

  // Common gradients
  gradients: {
    background: "linear-gradient(180deg, #0E0606, #07070C)",
    radialAccent:
      "radial-gradient(1200px 600px at 15% -10%, #FF4D2E10, transparent), radial-gradient(900px 500px at 110% 10%, #FF7A3C10, transparent)",
    buttonHover: "linear-gradient(135deg, #FF4D2E, #FF7A3C)",
    divider: "linear-gradient(90deg, transparent, #FF4D2E99, transparent)",
    cardBg: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
  },

  // Common shadows
  shadows: {
    primaryGlow: "0 0 24px #FF4D2E55",
    textGlow: "0 0 18px #FF4D2E88, 0 0 36px #FF7A3C55",
    buttonPrimary: "0 12px 32px -10px #FF4D2E99",
    buttonSecondary: "0 12px 32px -10px #FF7A3C99",
    subtle: "0 4px 12px rgba(0,0,0,0.1)",
  },

  // Border styles
  borders: {
    subtle: "1px solid rgba(255,255,255,0.08)",
    medium: "1px solid rgba(255,255,255,0.12)",
    accent: "1px solid #FF4D2E33",
  },

  // Typography
  typography: {
    heading: "font-bold text-white",
    subheading: "text-gray-300 font-medium",
    body: "text-gray-400",
    accent: "text-[#FF4D2E]",
  },

  // Component styles
  components: {
    card: "bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-2xl",
    input: "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF4D2E] focus:border-transparent transition-all",
    button: {
      primary: "w-full py-4 bg-gradient-to-r from-[#FF4D2E] to-[#FF7A3C] hover:from-[#FF4D2E]/90 hover:to-[#FF7A3C]/90 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-[#FF4D2E]/25",
      secondary: "w-full py-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl border border-white/20 transition-all duration-200",
      accent: "px-4 py-2 bg-[#FF4D2E]/20 hover:bg-[#FF4D2E]/30 text-[#FF4D2E] border border-[#FF4D2E]/30 rounded-lg transition-all duration-200",
    },
  },
};