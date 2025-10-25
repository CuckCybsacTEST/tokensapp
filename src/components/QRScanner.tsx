"use client";

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/browser';
import { X, Camera, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    startScanning();
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setScanning(true);
      setError(null);

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      // Configurar hints para mejor detección de QR
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No se encontraron cámaras');
      }

      // Usar la primera cámara disponible
      const selectedDeviceId = videoInputDevices[0].deviceId;

      if (videoRef.current) {
        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result: any, err: any) => {
            if (result) {
              const qrData = result.getText();
              setScanResult(qrData);
              setScanning(false);
              onScan(qrData);
              stopScanning();
            }
            if (err && err.name !== 'NotFoundException') {
              console.warn('Error scanning:', err);
            }
          }
        );
      }
    } catch (err) {
      setError('Error al acceder a la cámara. Verifica los permisos.');
      console.error('Error scanning QR:', err);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    setScanning(false);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    // Cleanup video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRetry = () => {
    setScanResult(null);
    setError(null);
    startScanning();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Escanear Código QR</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {!scanResult && !error && (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                playsInline
                muted
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 rounded-lg p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-white text-sm">Escaneando...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {scanResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-green-700 text-sm">Código QR detectado correctamente</p>
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
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}