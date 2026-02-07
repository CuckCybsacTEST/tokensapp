import { NextRequest, NextResponse } from "next/server";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/apiError";
import sharp from "sharp";
import { uploadBufferToSupabase, INVITATION_TEMPLATES_BUCKET, supabaseAdmin } from "@/lib/supabase-server";

/**
 * POST /api/admin/invitations/upload-template
 * Sube una plantilla de tarjeta de invitación a Supabase Storage.
 * Optimiza la imagen internamente:
 *   - Re-codifica como PNG
 *   - Redimensiona a 1080×1920 si excede ese tamaño
 *   - Comprime la imagen para no saturar el sistema
 *
 * Body: FormData con campo "file" (imagen)
 * Returns: { url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = getUserSessionCookieFromRequest(req);
    if (!sessionCookie) return apiError("UNAUTHORIZED", "No autenticado", null, 401);
    const session = await verifyUserSessionCookie(sessionCookie);
    if (!session) return apiError("UNAUTHORIZED", "Sesión inválida", null, 401);
    if (session.role !== "ADMIN" && session.role !== "STAFF") {
      return apiError("FORBIDDEN", "No autorizado", null, 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.size) {
      return apiError("BAD_REQUEST", "No se envió archivo", null, 400);
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return apiError("BAD_REQUEST", "Formato no soportado. Usa PNG, JPG o WebP", null, 400);
    }

    // Max 10MB raw
    if (file.size > 10 * 1024 * 1024) {
      return apiError("BAD_REQUEST", "El archivo es demasiado grande (máx 10MB)", null, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize with sharp:
    // 1. Auto-rotate via EXIF
    // 2. Resize to exactly 1080×1920 (the card template size) using cover fit
    //    If the image is smaller, enlarge to fit
    // 3. Re-encode as PNG with compression level 9 (max compression)
    const optimized = await sharp(buffer)
      .rotate()
      .resize({
        width: 1080,
        height: 1920,
        fit: "cover",
        position: "center",
      })
      .png({ compressionLevel: 9, quality: 85 })
      .toBuffer();

    // Generate unique filename
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const storageKey = `templates/${ts}-${rand}.png`;

    // Ensure bucket exists (create if not)
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = buckets?.some((b: any) => b.name === INVITATION_TEMPLATES_BUCKET);
      if (!exists) {
        await supabaseAdmin.storage.createBucket(INVITATION_TEMPLATES_BUCKET, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024,
          allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        });
      }
    } catch {
      // Bucket may already exist, continue
    }

    // Upload to Supabase
    const publicUrl = await uploadBufferToSupabase(
      optimized,
      storageKey,
      "image/png",
      INVITATION_TEMPLATES_BUCKET
    );

    return apiOk({ url: publicUrl }, 200);
  } catch (e: any) {
    console.error("[upload-template] Error:", e);
    return apiError("INTERNAL_ERROR", e?.message || "Error subiendo plantilla", null, 500);
  }
}
