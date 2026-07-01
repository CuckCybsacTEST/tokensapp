import { WelcomePlayersRouletteConfig } from "./types";

export const WELCOME_PLAYERS_SEED_PRIZES: WelcomePlayersRouletteConfig["prizes"] = [
  {
    id: "drink",
    label: "Drink",
    description: "Una cortesía simple para abrir el juego.",
    color: "#F59E0B",
    status: "active",
    weight: 1,
    order: 1,
  },
  {
    id: "shot",
    label: "Shot",
    description: "Premio rápido, directo y fácil de entregar.",
    color: "#F97316",
    status: "active",
    weight: 1,
    order: 2,
  },
  {
    id: "2x1",
    label: "2x1",
    description: "Base visual para futuras campañas y pesos variables.",
    color: "#22C55E",
    status: "active",
    weight: 1,
    order: 3,
  },
  {
    id: "vip",
    label: "VIP",
    description: "Un premio de mayor impacto para el pool escalable.",
    color: "#60A5FA",
    status: "active",
    weight: 1,
    order: 4,
  },
];

export const WELCOME_PLAYERS_DEFAULT_CONFIG: WelcomePlayersRouletteConfig = {
  title: "Welcome Players",
  subtitle: "Toca la pantalla y deja que la ruleta decida tu premio",
  instructions: "Diseñada para uso táctil, en vertical 9:16 y lista para crecer a futuro.",
  aspectRatio: "9:16",
  prizes: [],
};

export const WELCOME_PLAYERS_FALLBACK_CONFIG: WelcomePlayersRouletteConfig = {
  ...WELCOME_PLAYERS_DEFAULT_CONFIG,
  prizes: WELCOME_PLAYERS_SEED_PRIZES,
};
