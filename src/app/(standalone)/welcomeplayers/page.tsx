import { Metadata } from "next";
import { WELCOME_PLAYERS_DEFAULT_CONFIG } from "@/lib/welcomeplayers/config";
import WelcomePlayersClient from "./WelcomePlayersClient";

export const metadata: Metadata = {
  title: "Welcome Players",
  description: "Ruleta pública táctil para premios aleatorios en formato vertical 9:16.",
};

export default function WelcomePlayersPage() {
  return (
    <main
      className="min-h-dvh w-full overflow-hidden px-3 py-3 text-white sm:px-4 sm:py-4"
      style={{
        background:
          "radial-gradient(circle at top, rgba(245,158,11,0.22), transparent 28%), radial-gradient(circle at 20% 20%, rgba(96,165,250,0.14), transparent 22%), linear-gradient(180deg, #090B12 0%, #05070C 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[560px]">
        <WelcomePlayersClient />
      </div>
    </main>
  );
}
