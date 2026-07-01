export type WelcomePlayerPrizeStatus = "active" | "inactive";

export interface WelcomePlayerPrize {
  id: string;
  label: string;
  description?: string | null;
  color: string;
  status: WelcomePlayerPrizeStatus;
  weight: number;
  order: number;
}

export interface WelcomePlayersRouletteConfig {
  title: string;
  subtitle: string;
  instructions: string;
  aspectRatio: "9:16";
  prizes: WelcomePlayerPrize[];
}
