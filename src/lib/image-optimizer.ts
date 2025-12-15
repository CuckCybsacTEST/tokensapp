import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomBytes } from 'crypto';
// Lazy import to avoid build-time validation
let supabaseAdmin: any = null;
let STORAGE_BUCKET: string = '';
let STORAGE_FOLDERS: any = null;

const getSupabaseAdmin = async () => {
  if (!supabaseAdmin) {
    const supabaseModule = await import('./supabase');
    supabaseAdmin = supabaseModule.supabaseAdmin;
    STORAGE_BUCKET = supabaseModule.STORAGE_BUCKET;
    STORAGE_FOLDERS = supabaseModule.STORAGE_FOLDERS;
  }
  return supabaseAdmin;
};

export interface ImageOptimizationOptions {
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ImageMetadata {
  originalSize: number;
  optimizedSize: number;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  format: string;
  compressionRatio: number;
}

export class ImageOptimizer {
  private static readonly STORAGE_BUCKET = 'qr-images';
  private static readonly STORAGE_FOLDERS = {
    ORIGINAL: 'original',
    OPTIMIZED: 'optimized',
    THUMBNAIL: 'thumbnail',
    TEMP: 'temp'
  };

  static async initializeDirectories() {
    // No longer needed with Supabase - directories are virtual
    console.log('Supabase storage initialized - no local directories needed');
  }

  static generateFileName(extension: string): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `${timestamp}-${random}.${extension}`;
  }

  static async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions
  ): Promise<{ optimizedBuffer: Buffer; metadata: ImageMetadata }> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Calcular nuevas dimensiones manteniendo aspect ratio
    let { width, height } = metadata;
    if (width! > options.maxWidth || height! > options.maxHeight) {
      const aspectRatio = width! / height!;
      if (width! > height!) {
        width = options.maxWidth;
        height = Math.round(options.maxWidth / aspectRatio);
      } else {
        height = options.maxHeight;
        width = Math.round(options.maxHeight * aspectRatio);
      }
    }

    // Optimizar imagen
    let optimizedImage = image.resize(width, height, {
      withoutEnlargement: true,
      fit: 'inside'
    });

    // Aplicar optimizaciones según formato
    switch (options.format) {
      case 'jpeg':
        optimizedImage = optimizedImage.jpeg({
          quality: options.quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        optimizedImage = optimizedImage.png({
          quality: options.quality,
          progressive: true
        });
        break;
      case 'webp':
        optimizedImage = optimizedImage.webp({
          quality: options.quality,
          effort: 6
        });
        break;
    }

    const optimizedBuffer = await optimizedImage.toBuffer();
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();

    const imageMetadata: ImageMetadata = {
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      originalWidth: metadata.width!,
      originalHeight: metadata.height!,
      optimizedWidth: optimizedMetadata.width!,
      optimizedHeight: optimizedMetadata.height!,
      format: options.format,
      compressionRatio: ((buffer.length - optimizedBuffer.length) / buffer.length) * 100
    };

    return { optimizedBuffer, metadata: imageMetadata };
  }

  static async saveImage(
    buffer: Buffer,
    filename: string,
    type: 'original' | 'optimized' | 'thumbnail' = 'optimized'
  ): Promise<string> {
    const supabaseAdmin = await getSupabaseAdmin();
    const folder = type === 'original' ? this.STORAGE_FOLDERS.ORIGINAL : this.STORAGE_FOLDERS.OPTIMIZED;
    const filePath = `${folder}/${filename}`;

    console.log(`Uploading image to Supabase: ${filePath}`);

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, buffer, {
          contentType: type === 'original'
            ? 'image/jpeg' // Default, will be overridden by actual type
            : 'image/webp',
          upsert: false // Don't overwrite existing files
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log(`Image uploaded successfully: ${data.path}`);

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log(`Public URL: ${urlData.publicUrl}`);
      return urlData.publicUrl;

    } catch (error) {
      console.error(`Error uploading image to Supabase: ${filePath}`, error);
      throw error;
    }
  }

  static async validateImage(buffer: Buffer, policy: any): Promise<{ valid: boolean; error?: string }> {
    // Validar tamaño
    if (buffer.length > policy.maxImageSize) {
      return {
        valid: false,
        error: `Imagen demasiado grande. Máximo ${Math.round(policy.maxImageSize / 1024 / 1024)}MB permitido.`
      };
    }

    // Validar formato usando Sharp
    try {
      const metadata = await sharp(buffer).metadata();
      const allowedFormats = policy.allowedImageFormats.split(',').map((f: string) => f.trim().toLowerCase());

      if (!allowedFormats.includes(metadata.format?.toLowerCase() || '')) {
        return {
          valid: false,
          error: `Formato no permitido. Formatos aceptados: ${policy.allowedImageFormats}`
        };
      }

      // Validar dimensiones
      if (metadata.width! > policy.maxImageWidth || metadata.height! > policy.maxImageHeight) {
        return {
          valid: false,
          error: `Dimensiones demasiado grandes. Máximo ${policy.maxImageWidth}x${policy.maxImageHeight}px.`
        };
      }

    } catch (error) {
      return {
        valid: false,
        error: 'Imagen corrupta o formato no válido'
      };
    }

    return { valid: true };
  }

  static async createThumbnail(
    buffer: Buffer,
    maxWidth: number = 200
  ): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Calcular altura manteniendo aspect ratio
    const aspectRatio = metadata.width! / metadata.height!;
    const height = Math.round(maxWidth / aspectRatio);

    // Crear thumbnail
    const thumbnailBuffer = await image
      .resize(maxWidth, height, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 80, effort: 4 }) // WebP para thumbnails, calidad 80%
      .toBuffer();

    return thumbnailBuffer;
  }

  static async cleanupTempFiles(): Promise<void> {
    // No longer needed with Supabase - temp files are handled by Supabase
    console.log('Temp file cleanup not needed with Supabase storage');
  }

  static async getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    optimizedSize: number;
    originalSize: number;
  }> {
    try {
      // Get storage stats from Supabase
      const { data: optimizedFiles, error: optimizedError } = await supabaseAdmin.storage
        .from(this.STORAGE_BUCKET)
        .list(this.STORAGE_FOLDERS.OPTIMIZED);

      const { data: originalFiles, error: originalError } = await supabaseAdmin.storage
        .from(this.STORAGE_BUCKET)
        .list(this.STORAGE_FOLDERS.ORIGINAL);

      if (optimizedError || originalError) {
        console.error('Error getting storage stats:', optimizedError || originalError);
        return {
          totalImages: 0,
          totalSize: 0,
          optimizedSize: 0,
          originalSize: 0
        };
      }

      const optimizedSize = optimizedFiles?.reduce((total: number, file: any) => total + (file.metadata?.size || 0), 0) || 0;
      const originalSize = originalFiles?.reduce((total: number, file: any) => total + (file.metadata?.size || 0), 0) || 0;

      return {
        totalImages: (optimizedFiles?.length || 0) + (originalFiles?.length || 0),
        totalSize: optimizedSize + originalSize,
        optimizedSize,
        originalSize
      };
    } catch (error) {
      console.error('Error getting Supabase storage stats:', error);
      return {
        totalImages: 0,
        totalSize: 0,
        optimizedSize: 0,
        originalSize: 0
      };
    }
  }
}