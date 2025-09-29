"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Componente para el control centralizado de impresión
export function PrintControlClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);

  // Formatear nombre amigable para lotes en el selector
  function formatBatchLabel(batch: any): string {
    const desc = (batch?.description || batch?.name || '').toString().trim();
    if (desc) return desc;
    try {
      const d = new Date(batch?.createdAt);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `Batch ${dd}.${mm}.${yyyy}`;
      }
    } catch {}
    return String(batch?.id || 'lote');
  }

  // Función para generar un QR de ejemplo para previsualización
  const generatePreviewQR = async (templateId: string) => {
    try {
      console.log('Solicitando vista previa para templateId:', templateId);
      
      // Añadir parámetro anti-caché
      const timestamp = Date.now();
      
      // Llamar a un endpoint que genere una vista previa con un QR de ejemplo
      const res = await fetch(`/api/print/control/preview?templateId=${templateId}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Aumentamos el timeout para dar tiempo a la generación
        signal: AbortSignal.timeout(20000) // 20 segundos de timeout
      });
      
      if (!res.ok) {
        console.error('Error en la respuesta de vista previa:', res.status, res.statusText);
        let errorText = '';
        try {
          const errorData = await res.json();
          errorText = errorData.error || errorData.detail || '';
          console.error('Detalles del error:', errorData);
        } catch (e) {
          errorText = await res.text();
        }
        throw new Error(`Error al generar vista previa: ${res.status} ${errorText}`);
      }
      
      const contentType = res.headers.get('content-type');
      console.log('Tipo de contenido recibido:', contentType);
      
      const blob = await res.blob();
      console.log('Tamaño del blob recibido:', blob.size, 'bytes');
      
      if (blob.size === 0) {
        throw new Error('La respuesta está vacía');
      }
      
      // Crear URL y asegurarnos que sea válida
      const objectUrl = URL.createObjectURL(blob);
      console.log('URL de objeto creada:', objectUrl);
      return objectUrl;
    } catch (error) {
      console.error("Error al generar vista previa:", error);
      setError('Error al generar vista previa: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  };

  // Vista previa efímera eliminada: la UI se limita a plantillas persistentes

  // Cargar lotes y plantillas disponibles
  useEffect(() => {
    let mounted = true; // Para evitar actualizar el estado si el componente se desmonta
    
    const fetchData = async () => {
      try {
        // Verificar si hay un lote preseleccionado en la URL
        const url = new URL(window.location.href);
        const preselectedBatchId = url.searchParams.get('preselect');
        
        // Cargar batches
        const batchesRes = await fetch("/api/admin/batches", {
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!batchesRes.ok) throw new Error("Error al cargar los lotes");
        const batchesData = await batchesRes.json();
        if (!mounted) return;
        setBatches(batchesData);
        
        // Si hay un lote preseleccionado, establecerlo
        if (preselectedBatchId && batchesData.some((b: any) => b.id === preselectedBatchId)) {
          setSelectedBatchId(preselectedBatchId);
        }

        // Cargar plantillas de impresión con parámetro anti-caché
        const timestamp = Date.now();
        const templatesRes = await fetch(`/api/admin/print/templates?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!templatesRes.ok) throw new Error("Error al cargar las plantillas");
        const templatesData = await templatesRes.json();
        if (!mounted) return;
        setTemplates(templatesData);
        // Nota: No autoseleccionamos una plantilla por defecto para evitar spinners no deseados.
        // El usuario puede previsualizar sin guardar o subir y luego ver la vista previa.
        // Limpiamos cualquier preview residual.
        setSelectedTemplateId("");
        setTemplatePreview(null);
        
        if (mounted) setLoading(false);
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        if (mounted) {
          setError(`Error al cargar datos: ${err.message}`);
          setLoading(false);
        }
      }
    };

    fetchData();
    
    // Limpiar para evitar memory leaks
    return () => {
      mounted = false;
    };
  }, []);

  // Función para actualizar la vista previa con QR
  const updatePreviewWithQR = async (templateId: string) => {
    // No reseteamos la vista previa para evitar parpadeo
    // Mostramos indicador de carga
    setLoading(true);
    
    // Buscar la plantilla seleccionada
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (!selectedTemplate) {
      console.error('No se encontró la plantilla con ID:', templateId);
      console.log('Templates disponibles:', templates);
      setError('No se pudo encontrar la plantilla seleccionada');
      setLoading(false);
      return;
    }
    
    try {
      // Primero mostrar la imagen de la plantilla base mientras se genera la vista previa con QR
      const imagePath = selectedTemplate.filePath.replace(/^public\//, '/');
      console.log('Mostrando plantilla base en ruta:', imagePath);
      setTemplatePreview(imagePath);
      
      // Crear una imagen temporal para precarga
      const img = document.createElement('img') as HTMLImageElement;
      img.src = imagePath;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Seguimos incluso si hay error
        // Timeout de seguridad
        setTimeout(() => resolve(), 2000);
      });
      
      // Generar y mostrar vista previa con QR
      console.log('Generando vista previa con QR para templateId:', templateId);
      const previewWithQR = await generatePreviewQR(templateId);
      
      // Importante: verificamos que el usuario no haya cambiado de plantilla mientras generábamos la vista previa
      if (selectedTemplateId === templateId) {
        if (previewWithQR) {
          console.log('Vista previa con QR generada correctamente');
          setTemplatePreview(previewWithQR);
        } else {
          console.error('No se pudo generar la vista previa con QR');
          // No mostramos error, mantenemos la plantilla base visible
        }
      } else {
        console.log('El usuario cambió de plantilla, descartando vista previa');
        // Liberamos memoria
        if (previewWithQR && previewWithQR.startsWith('blob:')) {
          URL.revokeObjectURL(previewWithQR);
        }
      }
    } catch (err) {
      console.error('Error al actualizar la vista previa:', err);
      setError('Error al generar la vista previa: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir el diálogo de selección de archivo
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Selector efímero eliminado

  // Función para subir una nueva plantilla
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen (PNG, JPG, etc.)');
      return;
    }

    if (!templateName.trim()) {
      setError('Debe proporcionar un nombre para la plantilla');
      return;
    }

    setUploadingTemplate(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', templateName);

      const res = await fetch('/api/admin/print/templates/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al subir la plantilla');
      }

      const newTemplate = await res.json();
      console.log('Nueva plantilla subida:', newTemplate);
      
      // Actualizar el estado local inmediatamente para mostrar la nueva plantilla
      setTemplates(prevTemplates => [...prevTemplates, newTemplate]);
      setSelectedTemplateId(newTemplate.id);
      
      // Función para precargar la imagen de la plantilla base
      const preloadBasicTemplate = async (template: any): Promise<string> => {
        return new Promise((resolve) => {
          if (!template || !template.filePath) {
            resolve('');
            return;
          }
          
          const imagePath = template.filePath.replace(/^public\//, '/');
          console.log('Precargando plantilla base:', imagePath);
          
          const img = document.createElement('img');
          
          // Evento de carga exitosa
          img.onload = () => {
            console.log('Plantilla base cargada correctamente');
            resolve(imagePath);
          };
          
          // En caso de error, seguimos adelante
          img.onerror = () => {
            console.error('Error al precargar plantilla base');
            resolve('');
          };
          
          // Timeout de seguridad
          setTimeout(() => resolve(imagePath), 3000);
          
          // Iniciar la carga con cabeceras anti-caché
          const timestamp = Date.now();
          img.src = `${imagePath}?t=${timestamp}`;
        });
      };
      
      // Primero mostrar la plantilla base sin QR mientras se procesa
      const baseTemplatePath = await preloadBasicTemplate(newTemplate);
      if (baseTemplatePath) {
        setTemplatePreview(baseTemplatePath);
      }
      
  // Generar vista previa con QR ejemplo - esperamos a que termine
  console.log('Generando vista previa de QR para la nueva plantilla:', newTemplate.id);
  setPreviewing(true);
  const previewUrl = await generatePreviewQR(newTemplate.id);
      
      if (previewUrl) {
        console.log('Vista previa generada correctamente:', previewUrl);
        setTemplatePreview(previewUrl);
      } else {
        console.error('No se pudo generar la vista previa del QR');
        // Si falla la generación de QR, al menos mostramos la plantilla base
        if (baseTemplatePath && !templatePreview) {
          setTemplatePreview(baseTemplatePath);
        }
      }
      
      // Solo después de mostrar la vista previa, actualizamos la lista completa en segundo plano
      try {
        const timestamp = Date.now();
        const templatesRes = await fetch(`/api/admin/print/templates?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData);
        }
      } catch (refreshErr) {
        console.error('Error al refrescar la lista de plantillas:', refreshErr);
      }
      
      setTemplateName('');
      setUploadSuccess('Plantilla subida correctamente');
      
      // Limpiar el input de archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      } catch (err: any) {
      console.error("Error al subir la plantilla:", err);
      setError(`Error al subir la plantilla: ${err.message}`);
    } finally {
      setUploadingTemplate(false);
      setPreviewing(false);
    }
  };

  // Manejo de archivo efímero eliminado

  // Función para generar PDF
  const handleGeneratePdf = async () => {
    if (!selectedBatchId) {
      setError("Debe seleccionar un lote");
      return;
    }

    if (!selectedTemplateId) {
      setError("No se ha subido ninguna plantilla");
      return;
    }

    setError(null);
    setGeneratingPdf(true);

    try {
      // Redireccionar directamente a la API con la URL construida
      const url = `/api/print/control/pdf?batchId=${selectedBatchId}&templateId=${selectedTemplateId}`;
      
      // Abrir en una nueva pestaña para descarga directa
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("Error al generar PDF:", err);
      setError(`Error al generar PDF: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8 text-white">Cargando datos...</div>;
  }

  return (
  <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6 border border-slate-200 dark:border-slate-700 transition-colors">
      <div className="mb-8">
  <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white transition-colors">Control de Impresión Centralizado</h2>
        <p className="text-slate-400 mb-4">
          Este panel permite generar PDFs con códigos QR utilizando una plantilla consistente
          para cualquier lote seleccionado.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-green-900/30 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-400">{uploadSuccess}</p>
        </div>
      )}

      <div className="mb-6">
  <label htmlFor="batch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">
          Seleccionar Lote
        </label>
        <select
          id="batch"
          className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-brand-400 focus:border-brand-400 text-white"
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
        >
          <option value="">Seleccione un lote</option>
          {batches.map((batch) => {
            const label = formatBatchLabel(batch);
            const count = Number(batch?.tokens?.length || 0);
            return (
              <option key={batch.id} value={batch.id} title={`${label} — ${batch.id}`}>
                {label} ({count} tokens)
              </option>
            );
          })}
        </select>
      </div>

      {/* Formulario para subir nueva plantilla */}
  <div className="mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-300 transition-colors">Subir nueva plantilla</h3>
          {templates.length > 0 && (
            <button 
              onClick={async () => {
                if (!confirm("¿Está seguro que desea eliminar todas las plantillas?")) {
                  return;
                }
                
                try {
                  setLoading(true);
                  // Eliminar todas las plantillas a la vez
                  const response = await fetch('/api/admin/print/templates/deleteAll', {
                    method: 'DELETE',
                    headers: {
                      'Cache-Control': 'no-cache, no-store, must-revalidate',
                      'Pragma': 'no-cache',
                      'Expires': '0'
                    }
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error al eliminar las plantillas');
                  }
                  
                  // Limpiar estado
                  setTemplates([]);
                  setTemplatePreview(null);
                  setSelectedTemplateId("");
                  setUploadSuccess("Todas las plantillas han sido eliminadas");
                } catch (err: any) {
                  console.error("Error al eliminar todas las plantillas:", err);
                  setError(`Error: ${err.message}`);
                } finally {
                  setLoading(false);
                }
              }}
              className="text-red-400 hover:text-red-300 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar todas
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1 transition-colors">
              Nombre de la plantilla
            </label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full p-2 bg-slate-700 border border-slate-600 rounded-md focus:ring-brand-400 focus:border-brand-400 text-white"
              placeholder="Mi plantilla personalizada"
            />
          </div>
          <div className="flex items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleTemplateUpload}
              className="hidden"
            />
            <button
              onClick={handleUploadClick}
              disabled={uploadingTemplate || !templateName.trim()}
              className={`w-full p-2 rounded-md ${
                uploadingTemplate || !templateName.trim()
                  ? "bg-slate-600 cursor-not-allowed text-slate-400"
                  : "bg-brand-600 hover:bg-brand-700 text-white"
              }`}
            >
              {uploadingTemplate ? "Subiendo..." : "Seleccionar y subir archivo"}
            </button>
          </div>
        </div>
  <p className="text-xs text-slate-600 dark:text-slate-500 mt-2 transition-colors">
          Sube un archivo de imagen (PNG/JPG) que servirá como plantilla para los códigos QR.
          <br/>Las plantillas son temporales y se eliminarán automáticamente después de 24 horas.
        </p>
      </div>

      {/* Vista previa de la plantilla con QR */}
      {(templatePreview || selectedTemplateId) && (
  <div className="mb-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-300 transition-colors">Vista previa con QR de ejemplo</h3>
            {selectedTemplateId && (
              <button 
                onClick={async () => {
                  if (!selectedTemplateId) return;
                  
                  if (!confirm("¿Está seguro que desea eliminar esta plantilla?")) {
                    return;
                  }
                  
                  try {
                    const res = await fetch(`/api/admin/print/templates/delete?id=${selectedTemplateId}`, {
                      method: 'DELETE',
                      headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                      }
                    });
                    
                    if (!res.ok) {
                      throw new Error("Error al eliminar la plantilla");
                    }
                    
                    // Actualizar lista de plantillas localmente
                    setTemplates(templates.filter(t => t.id !== selectedTemplateId));
                    
                    // Recargar la lista de plantillas desde el servidor para asegurar consistencia
                    const timestamp = Date.now();
                    const templatesRes = await fetch(`/api/admin/print/templates?t=${timestamp}`, {
                      headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                      }
                    });
                    
                    if (templatesRes.ok) {
                      const templatesData = await templatesRes.json();
                      setTemplates(templatesData);
                    }
                    
                    setTemplatePreview(null);
                    setSelectedTemplateId("");
                    setUploadSuccess("Plantilla eliminada correctamente");
                  } catch (err: any) {
                    console.error("Error al eliminar plantilla:", err);
                    setError(`Error al eliminar plantilla: ${err.message}`);
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar plantilla
              </button>
            )}
          </div>
          <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-2 rounded-lg transition-colors">
            <div className="relative h-64 w-auto">
              {templatePreview ? (
                <img
                  key={templatePreview} /* Forzar recreación del componente cuando cambia la URL */
                  src={templatePreview}
                  alt="Vista previa de la plantilla con QR"
                  className="h-full object-contain"
                />
              ) : (
                <div className="h-full w-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
                </div>
              )}
              
              {/* Indicador de carga solo cuando estamos generando explícitamente una vista previa */}
              {previewing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50 transition-colors">
                  <div className="text-white flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500 mb-2"></div>
                    <span>Generando vista previa con QR...</span>
                  </div>
                </div>
              )}
              
              {/* Indicador de carga general */}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/30 transition-colors">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
                </div>
              )}
            </div>
          </div>
          {/* Controles efímeros eliminados para simplificar la UI */}
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-2 text-center transition-colors">
            La posición del QR en esta vista previa representa la ubicación exacta en la impresión final.
          </p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Link 
          href="/admin/batches" 
          className="px-4 py-2 bg-slate-700 text-slate-200 rounded hover:bg-slate-600"
        >
          Volver a Lotes
        </Link>
        
        <button
          onClick={handleGeneratePdf}
          disabled={generatingPdf || !selectedBatchId || !selectedTemplateId}
          className={`px-4 py-2 rounded ${
            generatingPdf || !selectedBatchId || !selectedTemplateId
              ? "bg-brand-800/50 cursor-not-allowed text-slate-400"
              : "bg-brand-600 hover:bg-brand-700 text-white"
          }`}
        >
          {generatingPdf ? "Generando..." : "Generar PDF"}
        </button>
      </div>
    </div>
  );
}
