export const metadata = {
  title: "Welcome Players",
};

export const dynamic = "force-dynamic";

import WelcomePlayersAdminClient from "./WelcomePlayersAdminClient";

export default function WelcomePlayersAdminPage() {
  return <WelcomePlayersAdminClient />;
}

