"use client";
import React from "react";
import dynamic from "next/dynamic";
import type { ActionType, ActionComponentProps } from "./types";

const TriviaAction = dynamic(() => import("./TriviaAction"), { ssr: false });
const PhraseAction = dynamic(() => import("./PhraseAction"), { ssr: false });
const ChallengeAction = dynamic(() => import("./ChallengeAction"), { ssr: false });
const RaffleAction = dynamic(() => import("./RaffleAction"), { ssr: false });
const MessageAction = dynamic(() => import("./MessageAction"), { ssr: false });

const ACTION_COMPONENTS: Record<string, React.ComponentType<ActionComponentProps>> = {
  trivia: TriviaAction,
  phrase: PhraseAction,
  challenge: ChallengeAction,
  raffle: RaffleAction,
  message: MessageAction,
};

const ACTION_TITLES: Record<string, string> = {
  trivia: "🧩 Trivia Rápida",
  phrase: "💬 Tu Frase",
  challenge: "🎯 ¡Reto!",
  raffle: "🎰 Sorteo",
  message: "📢 Mensaje",
};

export default function DynamicTokenAction({
  actionType,
  payload,
  tokenId,
  prizeLabel,
  prizeColor,
}: {
  actionType: ActionType;
  payload: any;
  tokenId: string;
  prizeLabel: string;
  prizeColor: string | null;
}) {
  // 'prize' type = no special action, handled by the parent page
  if (!actionType || actionType === "prize") return null;

  const Component = ACTION_COMPONENTS[actionType];
  if (!Component) return null;

  return (
    <div className="w-full">
      <div className="text-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {ACTION_TITLES[actionType] || "Token"}
        </h1>
      </div>
      <Component
        payload={payload}
        tokenId={tokenId}
        prizeLabel={prizeLabel}
        prizeColor={prizeColor}
      />
    </div>
  );
}
