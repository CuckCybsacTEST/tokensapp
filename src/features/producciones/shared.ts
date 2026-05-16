/**
 * Shared types and constants for the Production Multimedia system.
 * Used by both /admin/producciones and /u/producciones.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ProductionType =
  | "VIDEO_REEL" | "VIDEO_TIKTOK" | "VIDEO_PROMO" | "VIDEO_RECAP"
  | "PHOTO_SESSION" | "PHOTO_PRODUCT" | "PHOTO_STAFF"
  | "DESIGN_GRAPHIC" | "OTHER";

export type ProductionStatus =
  | "IDEA" | "BRIEFED" | "SCHEDULED" | "IN_PRODUCTION"
  | "IN_EDITING" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "CANCELLED";

export type ProductionPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProductionLinkType = "REFERENCE" | "DELIVERABLE" | "PUBLISHED";

export interface PersonRef {
  id: string;
  name: string;
  area?: string | null;
  jobTitle?: string | null;
}

export interface AssigneeRef {
  id: string;
  personId: string;
  person: PersonRef;
}

export interface UserRef {
  id: string;
  username: string;
  person?: { name: string } | null;
}

export interface ProductionLink {
  id: string;
  label: string;
  url: string;
  type: ProductionLinkType;
  createdAt: string;
}

export interface ProductionComment {
  id: string;
  content: string;
  createdAt: string;
  author: UserRef;
}

export interface Production {
  id: string;
  title: string;
  type: ProductionType;
  status: ProductionStatus;
  priority: ProductionPriority;
  objective?: string | null;
  context?: string | null;
  message?: string | null;
  references?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  format?: string | null;
  duration?: string | null;
  deliverables?: string | null;
  deadline?: string | null;
  scheduledDate?: string | null;
  completedAt?: string | null;
  publishedAt?: string | null;
  publishUrl?: string | null;
  requestedBy?: UserRef | null;
  requestedById?: string | null;
  assignedTo?: AssigneeRef[];
  notes?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
  comments?: ProductionComment[];
  links?: ProductionLink[];
  _count?: { comments: number; links: number };
}

// ── Label maps ──────────────────────────────────────────────────────────────

export const TYPE_LABELS: Record<ProductionType, string> = {
  VIDEO_REEL:    "Video / Reel",
  VIDEO_TIKTOK:  "TikTok",
  VIDEO_PROMO:   "Video Promo",
  VIDEO_RECAP:   "Video Recap",
  PHOTO_SESSION: "Sesión de Fotos",
  PHOTO_PRODUCT: "Foto Producto",
  PHOTO_STAFF:   "Foto Personal",
  DESIGN_GRAPHIC:"Diseño Gráfico",
  OTHER:         "Otro",
};

export const STATUS_LABELS: Record<ProductionStatus, string> = {
  IDEA:          "Idea",
  BRIEFED:       "Con Brief",
  SCHEDULED:     "Agendado",
  IN_PRODUCTION: "En Producción",
  IN_EDITING:    "En Edición",
  IN_REVIEW:     "En Revisión",
  APPROVED:      "Aprobado",
  PUBLISHED:     "Publicado",
  CANCELLED:     "Cancelado",
};

export const PRIORITY_LABELS: Record<ProductionPriority, string> = {
  LOW:    "Baja",
  MEDIUM: "Media",
  HIGH:   "Alta",
  URGENT: "Urgente",
};

export const PRIORITY_COLORS: Record<ProductionPriority, string> = {
  LOW:    "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH:   "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export const STATUS_COLORS: Record<ProductionStatus, string> = {
  IDEA:          "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
  BRIEFED:       "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
  SCHEDULED:     "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
  IN_PRODUCTION: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
  IN_EDITING:    "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  IN_REVIEW:     "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  APPROVED:      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  PUBLISHED:     "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
  CANCELLED:     "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
};

export const STATUS_DOT: Record<ProductionStatus, string> = {
  IDEA:          "bg-gray-400",
  BRIEFED:       "bg-indigo-400",
  SCHEDULED:     "bg-cyan-400",
  IN_PRODUCTION: "bg-yellow-500",
  IN_EDITING:    "bg-purple-500",
  IN_REVIEW:     "bg-amber-500",
  APPROVED:      "bg-green-500",
  PUBLISHED:     "bg-emerald-600",
  CANCELLED:     "bg-red-500",
};

export const LINK_TYPE_LABELS: Record<ProductionLinkType, string> = {
  REFERENCE:   "Referencia",
  DELIVERABLE: "Entregable",
  PUBLISHED:   "Publicado",
};

export const LINK_TYPE_COLORS: Record<ProductionLinkType, string> = {
  REFERENCE:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  DELIVERABLE: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  PUBLISHED:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

// ── Flow & column config ────────────────────────────────────────────────────

/** Ordered list of statuses for the progress timeline (excludes CANCELLED) */
export const STATUS_FLOW: ProductionStatus[] = [
  "IDEA", "BRIEFED", "SCHEDULED", "IN_PRODUCTION",
  "IN_EDITING", "IN_REVIEW", "APPROVED", "PUBLISHED",
];

/**
 * Role required to advance a production from each status to the next in STATUS_FLOW.
 * - "admin"  → only ADMIN or COORDINATOR can make this transition
 * - "staff"  → any staff member can make this transition (admins included)
 * Statuses absent from this map (PUBLISHED, CANCELLED) cannot be advanced further.
 */
export const STATUS_ADVANCE_ROLE: Partial<Record<ProductionStatus, "admin" | "staff">> = {
  IDEA:          "admin",  // → BRIEFED
  BRIEFED:       "admin",  // → SCHEDULED
  SCHEDULED:     "staff",  // → IN_PRODUCTION
  IN_PRODUCTION: "staff",  // → IN_EDITING
  IN_EDITING:    "staff",  // → IN_REVIEW
  IN_REVIEW:     "admin",  // → APPROVED
  APPROVED:      "staff",  // → PUBLISHED (admin and staff)
};

/** Columns shown in the Kanban board */
export const KANBAN_COLUMNS: ProductionStatus[] = [
  "IDEA", "BRIEFED", "SCHEDULED", "IN_PRODUCTION",
  "IN_EDITING", "IN_REVIEW", "APPROVED", "PUBLISHED",
];

// ── Misc constants ──────────────────────────────────────────────────────────

export const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Web", "WhatsApp"];

export const FORMATS = ["Stories", "Reels", "Feed", "Carrusel", "Short", "Video largo", "Live", "Miniatura", "Banner", "Flyer"];

export const ASPECT_RATIOS = ["9:16", "16:9", "1:1", "4:5", "4:3", "3:4", "21:9", "2:3"];

export const DURATION_UNITS = ["segundos", "minutos", "horas"] as const;
export type DurationUnit = typeof DURATION_UNITS[number];
