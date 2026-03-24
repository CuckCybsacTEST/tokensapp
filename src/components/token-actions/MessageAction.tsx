"use client";
import React from "react";
import type { ActionComponentProps, MessagePayload } from "./types";

export default function MessageAction({ payload }: ActionComponentProps) {
  const data = payload as MessagePayload;

  if (!data?.htmlContent) {
    return (
      <div className="text-center p-4">
        <div className="text-4xl mb-3">📢</div>
        <p className="text-white/60 text-sm">No hay mensaje configurado.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-4xl mb-4">📢</div>
      <div
        className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4 text-left prose prose-invert prose-sm max-w-none
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-2
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2
          [&_p]:text-white/80 [&_p]:mb-2 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
          [&_li]:text-white/80 [&_li]:mb-1
          [&_strong]:text-white [&_strong]:font-bold
          [&_em]:italic
          [&_a]:text-[#FF4D2E] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: data.htmlContent }}
      />
      {data.ctaLabel && data.ctaUrl && (
        <a
          href={data.ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-[#FF4D2E] hover:bg-[#FF6542] text-white font-bold rounded-xl transition-colors"
        >
          {data.ctaLabel}
        </a>
      )}
    </div>
  );
}
