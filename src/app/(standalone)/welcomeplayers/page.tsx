import { Metadata } from "next";
import WelcomePlayersClient from "./WelcomePlayersClient";

export const metadata: Metadata = {
  title: "Welcome Players",
  description: "Ruleta pública táctil para premios aleatorios en formato vertical 9:16.",
};

export default function WelcomePlayersPage() {
  return (
    <main
      className="m-0 h-[100vh] w-screen overflow-hidden p-0 text-white"
      style={{
        background:
          "radial-gradient(circle at top, rgba(245,158,11,0.22), transparent 28%), radial-gradient(circle at 20% 20%, rgba(96,165,250,0.14), transparent 22%), linear-gradient(180deg, #090B12 0%, #05070C 100%)",
      }}
    >
      <div className="flex h-full w-full">
        <WelcomePlayersClient />
      </div>
    </main>
  );
}
