"use client";

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  onImageUploaded: (imageData: {
    imageUrl: string;
    originalImageUrl: string;
    filename: string;
    metadata: any;
  }) => void;
  onImageRemoved: () => void;
  policy: any;
  disabled?: boolean;
  currentImage?: string;
}

export function ImageUpload({
  onImageUploaded,
  onImageRemoved,
  policy,
  disabled = false,
  currentImage
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [metadata, setMetadata] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!policy?.allowImageUpload) {
      return 'La subida de imágenes no está permitida según la política actual.';
    }

    if (file.size > policy.maxImageSize) {
      const maxSizeMB = Math.round(policy.maxImageSize / 1024 / 1024);
      return `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB.`;
    }

    const allowedFormats = policy.allowedImageFormats.split(',').map((f: string) => f.trim().toLowerCase());
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedFormats.includes(fileExtension || '')) {
      return `Formato no permitido. Formatos aceptados: ${policy.allowedImageFormats}`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/upload/qr-image', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al subir la imagen');
      }

      const result = await response.json();

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setMetadata(result.metadata);
      onImageUploaded(result);

    } catch (err: any) {
      setError(err.message || 'Error desconocido al subir la imagen');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    await uploadFile(file);
  }, [policy]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setMetadata(null);
    setError('');
    setUploadProgress(0);
    onImageRemoved();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!policy?.allowImageUpload) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Sube tu foto
        </label>
        {preview && (
          <button
            onClick={handleRemove}
            className="text-red-600 hover:text-red-800 text-sm"
            disabled={disabled || isUploading}
          >
            ❌ Remover
          </button>
        )}
      </div>

      {/* Área de subida */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={policy.allowedImageFormats.split(',').map((f: string) => `image/${f.trim()}`).join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600">Subiendo imagen... {uploadProgress}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover rounded-lg"
              />
            </div>
            <p className="text-xs sm:text-sm text-green-600">✅ Imagen subida correctamente</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl sm:text-4xl">📷</div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 px-2">
                {isDragging ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-gray-500 mt-1 px-2">
                Formatos: {policy.allowedImageFormats} • Máx: {Math.round(policy.maxImageSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Información de la imagen */}
      {metadata && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs space-y-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
            <div>
              <span className="font-medium">Original:</span>
              <p>{metadata.originalWidth}×{metadata.originalHeight}px • {formatFileSize(metadata.originalSize)}</p>
            </div>
            <div>
              <span className="font-medium">Optimizada:</span>
              <p>{metadata.optimizedWidth}×{metadata.optimizedHeight}px • {formatFileSize(metadata.optimizedSize)}</p>
            </div>
            <div className="text-green-600 col-span-2 sm:col-span-3">
              💾 Ahorro: {metadata.compressionRatio.toFixed(1)}% • Calidad: {policy.imageQuality}%
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3">
          ❌ {error}
        </div>
      )}
    </div>
  );
}