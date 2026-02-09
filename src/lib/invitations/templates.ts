// Template definitions for special-event invitation QR composition.
// Based on the user-provided layout (1080×1920):
//   - QR area: 460×460px, positioned at (310, 621)
//   - Name bar 1: 438×74px at (321, 1127) — gap 46px below QR
//   - Name bar 2: 438×74px at (321, 1247) — gap 46px below bar 1
//   - Card total: 1080×1920

export type InvitationTemplateConfig = {
  /** Card final dimensions in pixels */
  width: number;
  height: number;
  /** URL or key of the default template */
  defaultUrl: string | null;
  /** QR placement (absolute pixels) */
  qr: { left: number; top: number; size: number };
  /** Guest-name bar placement (absolute pixels) */
  nameBar: { left: number; top: number; width: number; height: number };
  /** Event-name bar placement (absolute pixels) */
  eventBar: { left: number; top: number; width: number; height: number };
};

export const invitationTemplate: InvitationTemplateConfig = {
  width: 1080,
  height: 1920,
  defaultUrl: null, // admin can set per-event
  qr: {
    left: 310,   // px from left edge
    top: 621,    // px from top edge
    size: 460,   // 460×460 px
  },
  nameBar: {
    left: 140,     // (1080 − 800) / 2 = 140, centered
    top: 1121,     // 621 + 460 + 40 = 1121  (40px below QR)
    width: 800,    // wide enough for long names in StretchPro
    height: 120,   // tall bar for big bold name
  },
  eventBar: {
    left: 140,
    top: 1249,     // 1121 + 120 + 8 = 1249  (8px gap)
    width: 800,
    height: 60,
  },
} as const;
