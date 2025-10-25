"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { X, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Verificar soporte de getUserMedia
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Solicitar permisos de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Preferir cámara trasera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);

      let errorMessage = 'Error al acceder a la cámara';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permiso de cámara denegado. Habilita el acceso en la configuración del navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró una cámara disponible.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      }

      setError(errorMessage);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setIsScanning(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      // Configurar canvas con las dimensiones del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Capturar frame del video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Obtener datos de imagen del canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Usar jsQR para decodificar el QR
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        const qrData = code.data.trim();
        setScanResult(qrData);
        setIsScanning(false);
        onScan(qrData);
        stopCamera();
      } else {
        setError('No se pudo detectar un código QR. Asegúrate de que esté bien iluminado y centrado.');
      }

    } catch (err) {
      console.error('Error processing image:', err);
      setError('Error al procesar la imagen. Inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onScan, stopCamera]);

  const handleRetry = useCallback(() => {
    setScanResult(null);
    setError(null);
    setIsProcessing(false);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Escanear Código QR</h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Canvas oculto para procesamiento */}
          <canvas ref={canvasRef} className="hidden" />

          {!scanResult && !error && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                playsInline
                muted
                autoPlay
              />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-center">
                    <div className="w-16 h-16 mx-auto mb-3 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-700 font-medium mb-2">Cámara activa</p>
                    <p className="text-gray-600 text-sm mb-3">Posiciona el código QR en el marco</p>
                    <button
                      onClick={captureAndScan}
                      disabled={isProcessing}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center mx-auto"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Capturar y Escanear
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-700 text-sm font-medium mb-1">Error de escaneo</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {scanResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-700 text-sm font-medium mb-1">¡Código QR detectado!</p>
                  <p className="text-green-600 text-sm">Escaneo completado correctamente</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {error && (
              <button
                onClick={handleRetry}
                className="flex-1 flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Camera className="w-4 h-4 mr-2" />
                Reintentar
              </button>
            )}

            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 disabled:text-gray-400 rounded-lg font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}