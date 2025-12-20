"use client";

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { MENU_FOLDERS, type MenuFolder } from '../../lib/supabase';

interface MenuImageUploadProps {
  onImageUploaded: (url: string, storageKey: string) => void;
  onImageRemoved: () => void;
  currentImage?: string;
  currentStorageKey?: string;
  folder: MenuFolder;
  itemId: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function MenuImageUpload({
  onImageUploaded,
  onImageRemoved,
  currentImage,
  currentStorageKey,
  folder,
  itemId,
  disabled = false,
  className = '',
  label = 'Imagen',
  accept = 'image/*',
  maxSizeMB = 5
}: MenuImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB.`;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return 'Solo se permiten archivos de imagen.';
    }

    // Validar formato específico
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedFormats.includes(file.type)) {
      return 'Formato no permitido. Use JPEG, PNG o WebP.';
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 20, 90));
      }, 100);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);
      formData.append('itemId', itemId);

      const response = await fetch('/api/menu/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al subir la imagen');
      }

      const result = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onImageUploaded(result.url, result.storageKey);

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
  }, [folder, itemId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    handleFileSelect(e.dataTransfer.files);
  }, [disabled, isUploading, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleRemove = useCallback(async () => {
    if (currentStorageKey) {
      try {
        const response = await fetch(`/api/menu/upload?storageKey=${encodeURIComponent(currentStorageKey)}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.warn('Error deleting image from storage');
        }
      } catch (err) {
        console.warn('Error deleting image from storage:', err);
      }
    }

    setPreview(null);
    setError('');
    onImageRemoved();
  }, [currentStorageKey, onImageRemoved]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer
          ${isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 dark:hover:border-gray-500'}
          ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="relative w-full h-32 mx-auto">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-cover rounded-md"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            <div className="flex justify-center space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={disabled || isUploading}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                disabled={disabled || isUploading}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {isUploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Subiendo... {uploadProgress}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Arrastra una imagen aquí, o{' '}
                    <span className="text-blue-600 hover:text-blue-500">haz clic para seleccionar</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    JPEG, PNG, WebP hasta {maxSizeMB}MB
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}