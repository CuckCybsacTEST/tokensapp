import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

// Init Clients
const prisma = new PrismaClient();

// Create Supabase client only when needed and with validation
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase configuration missing. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files uploaded" }, { status: 400 });
    }

    // 1. Delete all existing images in DB
    // This is the "snapshot" strategy: replace everything
    await prisma.galleryImage.deleteMany();

    // 2. Clean Storage Bucket (Optional but recommended to save space)
    // We list all files in 'marketing-gallery' and delete them
    const supabase = getSupabaseClient();
    const { data: existingFiles } = await supabase.storage.from("marketing-gallery").list();
    if (existingFiles && existingFiles.length > 0) {
      const paths = existingFiles.map((f) => f.name);
      await supabase.storage.from("marketing-gallery").remove(paths);
    }

    const newImages = [];

    // 3. Process new files
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Optimize with Sharp
      // - Resize to max width/height 1200px (cover typical desktops)
      // - Convert to WebP ( efficient)
      // - Quality 80
      const optimizedBuffer = await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      
      const { width, height } = await sharp(optimizedBuffer).metadata();

      // Generate a tiny low-res blur placeholder
      const blurBuffer = await sharp(buffer)
        .resize({ width: 10, height: 10, fit: "inside" })
        .webp({ quality: 20 })
        .toBuffer();
      const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

      // Upload to Supabase
      const supabase = getSupabaseClient();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("marketing-gallery")
        .upload(fileName, optimizedBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("marketing-gallery")
        .getPublicUrl(fileName);

      // Save to Prisma
      const savedImage = await prisma.galleryImage.create({
        data: {
          src: publicUrl,
          alt: "Show Highlight", // Default alt
          width: width || 800,
          height: height || 600,
          blurDataUrl: blurDataUrl
        },
      });

      newImages.push(savedImage);
    }

    return NextResponse.json({ ok: true, count: newImages.length, images: newImages });

  } catch (e: any) {
    console.error("Gallery Upload Error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET() {
   try {
     const images = await prisma.galleryImage.findMany({
       orderBy: { createdAt: 'desc' }
     });
     return NextResponse.json({ ok: true, images });
   } catch (e: any) {
     return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
   }
}
