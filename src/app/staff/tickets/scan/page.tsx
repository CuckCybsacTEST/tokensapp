'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';

interface ValidationResult {
  valid: boolean;
  message: string;
  reason?: string;
  ticket?: {
    id: string;
    customerName: string;
    customerDni: string;
    ticketType: string;
    show: string;
    usedAt?: string;
  };
}

export default function TicketScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingControlsRef = useRef<any>(null);
  const router = useRouter();

  // Verificar si hay cámara disponible
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false));
  }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try {
      setError(null);
      setValidationResult(null);
      setIsScanning(true);

      // Usar ZXing como fallback (igual que en scannerClient)
      const mod = await import('@zxing/browser');
      const Reader = (mod as any).BrowserMultiFormatReader;
      const codeReader = new Reader();

      // decodeFromVideoDevice abre su propio stream
      zxingControlsRef.current = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result: any, error: any) => {
          if (result) {
            handleQRCode(result.getText());
          }
          // Ignorar errores NotFound (normal cuando no hay código en el frame)
        }
      );
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la cámara');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRCode = async (qrData: string) => {
    try {
      stopScanning();

      const response = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrData }),
      });

      const result = await response.json();

      if (!response.ok) {
        setValidationResult({
          valid: false,
          message: result.error || 'Error al validar el ticket',
        });
        return;
      }

      setValidationResult(result);

      // Auto-reset después de 5 segundos para el siguiente scan
      setTimeout(() => {
        setValidationResult(null);
      }, 5000);

    } catch (err: any) {
      setValidationResult({
        valid: false,
        message: 'Error de conexión al validar el ticket',
      });
    }
  };

  const resetScanner = () => {
    setValidationResult(null);
    setError(null);
  };

  if (hasCamera === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Cámara no disponible
          </h2>
          <p className="text-gray-600 mb-4">
            No se pudo acceder a la cámara. Verifica que tengas permisos y que tu dispositivo tenga cámara.
          </p>
          <Button onClick={() => router.push('/staff')} className="w-full">
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Escáner de Tickets
          </h1>
          <p className="text-gray-600">
            Escanea el código QR del ticket para validar el ingreso
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Escáner */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Cámara</h3>

            <div className="aspect-square bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white text-center">
                    <div className="text-4xl mb-2">📷</div>
                    <p>Cámara inactiva</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  className="flex-1"
                  disabled={hasCamera !== true}
                >
                  📷 Iniciar escaneo
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1"
                >
                  ⏹️ Detener
                </Button>
              )}

              <Button
                onClick={resetScanner}
                variant="outline"
              >
                🔄 Limpiar
              </Button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Resultado de validación */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Resultado de validación</h3>

            {validationResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-md border ${
                  validationResult.valid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {validationResult.valid ? '✅' : '❌'}
                    </span>
                    <p className={`font-medium ${
                      validationResult.valid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResult.message}
                    </p>
                  </div>
                </div>

                {validationResult.ticket && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Cliente:</span> {validationResult.ticket.customerName}
                    </div>
                    <div>
                      <span className="font-medium">DNI:</span> {validationResult.ticket.customerDni}
                    </div>
                    <div>
                      <span className="font-medium">Ticket:</span> {validationResult.ticket.ticketType}
                    </div>
                    <div>
                      <span className="font-medium">Show:</span> {validationResult.ticket.show}
                    </div>
                    {validationResult.ticket.usedAt && (
                      <div>
                        <span className="font-medium">Usado:</span> {new Date(validationResult.ticket.usedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {validationResult.reason && (
                  <div className="text-xs text-gray-500">
                    Razón: {validationResult.reason}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                {isScanning ? (
                  <div>
                    <div className="animate-spin text-2xl mb-2">⏳</div>
                    <p>Escaneando código QR...</p>
                  </div>
                ) : (
                  <p>Escanea un código QR para validar</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Button
            onClick={() => router.push('/staff')}
            variant="outline"
          >
            Volver al panel de staff
          </Button>
        </div>
      </div>
    </div>
  );
}