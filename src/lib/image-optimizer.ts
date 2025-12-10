import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { randomBytes } from 'crypto';

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
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'qr-images');
  private static readonly ORIGINAL_DIR = path.join(this.UPLOAD_DIR, 'original');
  private static readonly OPTIMIZED_DIR = path.join(this.UPLOAD_DIR, 'optimized');
  private static readonly TEMP_DIR = path.join(this.UPLOAD_DIR, 'temp');

  static async initializeDirectories() {
    const dirs = [this.UPLOAD_DIR, this.ORIGINAL_DIR, this.OPTIMIZED_DIR, this.TEMP_DIR];
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
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
    type: 'original' | 'optimized' = 'optimized'
  ): Promise<string> {
    const dir = type === 'original' ? this.ORIGINAL_DIR : this.OPTIMIZED_DIR;
    const filepath = path.join(dir, filename);

    await fs.writeFile(filepath, new Uint8Array(buffer));

    // Retornar URL relativa
    return `/uploads/qr-images/${type}/${filename}`;
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

  static async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.TEMP_DIR);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      for (const file of files) {
        const filepath = path.join(this.TEMP_DIR, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      console.error('Error limpiando archivos temporales:', error);
    }
  }

  static getStorageStats(): Promise<{
    totalImages: number;
    totalSize: number;
    optimizedSize: number;
    originalSize: number;
  }> {
    // Implementar estadísticas de almacenamiento
    return Promise.resolve({
      totalImages: 0,
      totalSize: 0,
      optimizedSize: 0,
      originalSize: 0
    });
  }
}