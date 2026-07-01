import { WelcomePlayersRouletteConfig } from "./types";

export const WELCOME_PLAYERS_DEFAULT_CONFIG: WelcomePlayersRouletteConfig = {
  title: "Welcome Players",
  subtitle: "Toca la pantalla y deja que la ruleta decida tu premio",
  instructions: "Diseñada para uso táctil, en vertical 9:16 y lista para crecer a futuro.",
  aspectRatio: "9:16",
  prizes: [],
};

export const WELCOME_PLAYERS_FALLBACK_CONFIG: WelcomePlayersRouletteConfig = {
  ...WELCOME_PLAYERS_DEFAULT_CONFIG,
  prizes: [],
};
