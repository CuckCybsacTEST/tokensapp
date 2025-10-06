/**
 * Brand palette and style variables for the marketing landing page.
 * Centralized configuration for consistent styling across components.
 */

// Core color palette
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

  // Text colors
  text: {
    primary: "#FFFFFF",
    secondary: "#FFFFFFCC", // 80% white
    tertiary: "#FFFFFF99", // 60% white
    accent: "#FFD166",
  },
};

// Reusable style snippets
export const styleUtils = {
  glassPanel: {
    background: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
    boxShadow: `0 0 0 1px ${brand.primary}22 inset, 0 0 50px ${brand.primary}11 inset`,
    backdropFilter: "blur(10px)",
  },

  badge: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: `0 0 0 1px ${brand.primary}22 inset, 0 0 20px ${brand.primary}22`,
  },

  scrollableArea: {
    WebkitMaskImage:
      "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
    maskImage:
      "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
  },

  animatedGlow: {
    position: "absolute" as const,
    inset: "-20%",
    background: `conic-gradient(from 90deg at 50% 50%, ${brand.primary}22, ${brand.secondary}22, ${brand.accent}11, ${brand.primary}22)`,
    filter: "blur(60px)",
    zIndex: 0,
  },
};

export default brand;
