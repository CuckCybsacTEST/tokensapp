"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface GalleryImage {
  id: string;
  src: string;
  alt: string | null;
  width: number;
  height: number;
}

export default function GalleryAdminPage() {
  const [currentImages, setCurrentImages] = useState<GalleryImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch current images
  useEffect(() => {
    fetch("/api/admin/gallery/upload")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.images) {
          setCurrentImages(data.images);
        }
      })
      .catch((err) => console.error("Failed to load gallery:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (!confirm("⚠️ ATENCIÓN: Esta acción eliminará TODAS las fotos anteriores y las reemplazará por las nuevas seleccionadas. ¿Deseas continuar?")) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/admin/gallery/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.ok) {
        alert("¡Galería actualizada correctamente!");
        // Reload images
        setCurrentImages(data.images);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert("Error al subir: " + data.error);
      }
    } catch (e) {
      alert("Error de conexión");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Galería de Marketing</h1>
          <p className="text-slate-500 text-sm">Gestiona las fotos que aparecen en la sección "Snapshot" de la web pública.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">Subir Nuevas Fotos (Modo Snapshot)</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <p className="text-amber-800 text-sm flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <strong>Importante:</strong> Al subir nuevas fotos, <u>se eliminarán todas las fotos existentes</u>. 
            El sistema está diseñado para reemplazar el lote completo ("Snapshot") para mantener la frescura y evitar acumulación de basura.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100
            "
          />
          
          {selectedFiles.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded border dark:border-slate-700">
              <p className="font-medium mb-2 dark:text-slate-200">{selectedFiles.length} archivos seleccionados:</p>
              <ul className="text-xs text-slate-500 max-h-32 overflow-y-auto list-disc pl-5">
                {selectedFiles.map((f, i) => <li key={i}>{f.name} ({(f.size / 1024).toFixed(0)} KB)</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className={`px-6 py-2 rounded-md font-bold text-white transition-all
                ${uploading || selectedFiles.length === 0 
                  ? "bg-slate-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30"
                }
              `}
            >
              {uploading ? "Procesando & Optimizando..." : "🚀 Reemplazar Galería"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-4 dark:text-white">
          Vista Actual ({currentImages.length} fotos)
        </h2>
        
        {loading ? (
          <p className="text-slate-500">Cargando galería actual...</p>
        ) : currentImages.length === 0 ? (
          <p className="text-slate-400 italic">No hay fotos en la galería dinámica (se muestran las default del código).</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {currentImages.map((img) => (
              <div key={img.id} className="aspect-square relative group rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 border dark:border-slate-700">
                 <Image 
                   src={img.src} 
                   alt={img.alt || "Gallery Image"} 
                   fill 
                   className="object-cover"
                   sizes="200px" 
                 />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
