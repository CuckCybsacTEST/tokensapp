export type WelcomePlayersDisplayMode = "auto" | "compact" | "standard" | "kiosk";

export type WelcomePlayersLayoutProfile = {
  shellClassName: string;
  stageClassName: string;
  headerClassName: string;
  logoClassName: string;
  titleClassName: string;
  subtitleClassName: string;
  introClassName: string;
  wheelStageClassName: string;
  wheelClassName: string;
  arrowClassName: string;
  actionButtonClassName: string;
  statsCardClassName: string;
  footerClassName: string;
  modalClassName: string;
  modalTitleClassName: string;
  modalCopyClassName: string;
  modalButtonClassName: string;
};

export const WELCOME_PLAYERS_LAYOUT_PROFILES: Record<Exclude<WelcomePlayersDisplayMode, "auto">, WelcomePlayersLayoutProfile> = {
  kiosk: {
    shellClassName: "relative h-[100dvh] w-full bg-[#060816] text-white min-h-[100dvh] overflow-hidden rounded-none px-6 py-6",
    stageClassName: "relative mx-auto flex h-full w-full max-w-[72rem] flex-col gap-3",
    headerClassName: "flex flex-col items-center text-center gap-3 pt-1",
    logoClassName: "h-14 w-auto object-contain opacity-95",
    titleClassName: "font-black leading-[0.9] tracking-[-0.05em] text-white text-[clamp(3.6rem,5.2vw,5.8rem)]",
    subtitleClassName: "mt-2 leading-relaxed text-white/88 text-[clamp(1rem,1.4vw,1.45rem)]",
    introClassName: "max-w-[56rem]",
    wheelStageClassName: "relative mx-auto flex w-full flex-1 min-h-0 items-center justify-center max-w-none py-1",
    wheelClassName: "relative flex aspect-square touch-manipulation items-center justify-center overflow-visible rounded-full border border-white/10 bg-[#0A0D16] outline-none select-none ring-1 ring-white/5 w-[var(--wp-wheel-size)] max-w-full",
    arrowClassName: "h-0 w-0 border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_16px_rgba(0,0,0,0.28)] border-l-[22px] border-r-[22px] border-t-[36px]",
    actionButtonClassName: "w-full rounded-[1.65rem] border border-white/10 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-center font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(236,72,153,0.18)] transition-transform active:scale-[0.99] disabled:opacity-70 px-6 py-4 text-[1rem]",
    statsCardClassName: "rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-4 text-center backdrop-blur-sm",
    footerClassName: "text-center text-white/45 pb-1 pt-1 text-[0.95rem]",
    modalClassName: "relative z-[1] w-full rounded-[2rem] border border-white/10 bg-[#070A12] text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)] max-w-2xl p-8",
    modalTitleClassName: "mt-3 font-black leading-none tracking-[-0.05em] text-white text-[clamp(2.8rem,4.2vw,4.4rem)]",
    modalCopyClassName: "mx-auto mt-4 leading-relaxed text-white/78 max-w-xl text-[1.05rem]",
    modalButtonClassName: "mt-6 w-full rounded-[1.15rem] border border-amber-300/30 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(244,114,182,0.18)] transition-transform active:scale-[0.99] px-6 py-4 text-[1rem]",
  },
  compact: {
    shellClassName: "relative w-full bg-[#060816] text-white min-h-[100dvh] overflow-x-hidden overflow-y-visible rounded-[2rem] px-4 py-4",
    stageClassName: "relative mx-auto flex flex-col min-h-[calc(100dvh-2rem)] max-w-[34rem] gap-3 pb-6",
    headerClassName: "flex flex-col items-center text-center gap-2 pt-0.5",
    logoClassName: "h-9 w-auto object-contain opacity-95",
    titleClassName: "font-black leading-[0.9] tracking-[-0.05em] text-white text-[clamp(2.7rem,5vw,4rem)]",
    subtitleClassName: "mt-4 leading-relaxed text-white/88 text-[clamp(0.95rem,1.5vw,1.1rem)]",
    introClassName: "max-w-[30rem]",
    wheelStageClassName: "relative mx-auto flex w-full items-center justify-center max-w-[34rem] py-1",
    wheelClassName: "relative flex aspect-square touch-manipulation items-center justify-center overflow-visible rounded-full border border-white/10 bg-[#0A0D16] outline-none select-none ring-1 ring-white/5 w-[var(--wp-wheel-size)] max-w-full",
    arrowClassName: "h-0 w-0 border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_16px_rgba(0,0,0,0.28)] border-l-[18px] border-r-[18px] border-t-[30px]",
    actionButtonClassName: "w-full rounded-[1.65rem] border border-white/10 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-center font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(236,72,153,0.18)] transition-transform active:scale-[0.99] disabled:opacity-70 px-5 py-4 text-[0.95rem]",
    statsCardClassName: "rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-5 text-center backdrop-blur-sm",
    footerClassName: "text-center text-white/45 pb-1 pt-0 text-[0.8rem]",
    modalClassName: "relative z-[1] w-full rounded-[2rem] border border-white/10 bg-[#070A12] text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)] max-w-md p-6",
    modalTitleClassName: "mt-3 font-black leading-none tracking-[-0.05em] text-white text-[clamp(2.2rem,6.4vw,3.5rem)]",
    modalCopyClassName: "mx-auto mt-4 leading-relaxed text-white/78 max-w-sm text-[1rem]",
    modalButtonClassName: "mt-6 w-full rounded-[1.15rem] border border-amber-300/30 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(244,114,182,0.18)] transition-transform active:scale-[0.99] px-5 py-4 text-[0.92rem]",
  },
  standard: {
    shellClassName: "relative w-full bg-[#060816] text-white min-h-[100dvh] overflow-x-hidden overflow-y-visible rounded-[2rem] px-4 py-4",
    stageClassName: "relative mx-auto flex flex-col min-h-[calc(100dvh-2rem)] max-w-[34rem] gap-4 pb-6",
    headerClassName: "flex flex-col items-center text-center gap-4 pt-1",
    logoClassName: "h-12 w-auto object-contain opacity-95 sm:h-14",
    titleClassName: "font-black leading-[0.9] tracking-[-0.05em] text-white text-[clamp(3.4rem,8vw,5.6rem)]",
    subtitleClassName: "mt-4 leading-relaxed text-white/88 text-[clamp(1rem,2.7vw,1.4rem)]",
    introClassName: "max-w-[30rem]",
    wheelStageClassName: "relative mx-auto flex w-full items-center justify-center max-w-[34rem] py-2",
    wheelClassName: "relative flex aspect-square touch-manipulation items-center justify-center overflow-visible rounded-full border border-white/10 bg-[#0A0D16] outline-none select-none ring-1 ring-white/5 w-[var(--wp-wheel-size)] max-w-full",
    arrowClassName: "h-0 w-0 border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_16px_rgba(0,0,0,0.28)] border-l-[18px] border-r-[18px] border-t-[30px]",
    actionButtonClassName: "w-full rounded-[1.65rem] border border-white/10 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-400 text-center font-black uppercase tracking-[0.24em] text-white shadow-[0_16px_32px_rgba(236,72,153,0.18)] transition-transform active:scale-[0.99] disabled:opacity-70 px-5 py-5 text-[1.05rem]",
    statsCardClassName: "rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-5 text-center backdrop-blur-sm",
    footerClassName: "text-center text-white/45 pb-1 pt-1 text-[0.9rem]",
    modalClassName: "relative z-[1] w-full rounded-[2rem] border border-white/10 bg-[#070A12] text-center shadow-[0_28px_80px_rgba(0,0,0,0.45)] max-w-md p-6",
    modalTitleClassName: "mt-3 font-black leading-none tracking-[-0.05em] text-white text-[clamp(2.2rem,6.4vw,3.5rem)]",
    modalCopyClassName: "mx-auto mt-4 leading-relaxed text-white/78 max-w-sm text-[1rem]",
    modalButtonClassName: "mt-6 w-full rounded-[1.15rem] border border-amber-300/30 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_28px_rgba(244,114,182,0.18)] transition-transform active:scale-[0.99] px-5 py-4 text-[0.92rem]",
  },
};

export function normalizeWelcomePlayersDisplayMode(input: string | null): WelcomePlayersDisplayMode {
  if (!input) return "auto";
  const value = input.trim().toLowerCase();
  if (value === "kiosk" || value === "totem" || value === "portrait") return "kiosk";
  if (value === "compact" || value === "mobile") return "compact";
  if (value === "standard" || value === "desktop") return "standard";
  return "auto";
}

export function resolveWelcomePlayersDisplayMode(
  width: number,
  height: number,
  forcedMode: WelcomePlayersDisplayMode,
): Exclude<WelcomePlayersDisplayMode, "auto"> {
  if (forcedMode !== "auto") return forcedMode;
  if (height > width && height >= 1200 && width >= 720) return "kiosk";
  if (height > 0 && height < 1100) return "compact";
  return "standard";
}

export function getWelcomePlayersLayoutProfile(mode: Exclude<WelcomePlayersDisplayMode, "auto">) {
  return WELCOME_PLAYERS_LAYOUT_PROFILES[mode];
}
