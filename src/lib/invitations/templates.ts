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
    left: 321,
    top: 1127,   // 621 + 460 + 46 = 1127
    width: 438,
    height: 74,
  },
  eventBar: {
    left: 321,
    top: 1247,   // 1127 + 74 + 46 = 1247
    width: 438,
    height: 74,
  },
} as const;
