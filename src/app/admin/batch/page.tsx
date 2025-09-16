// Página manual DEPRECATED. Se mantiene solo para evitar 404 y redirigir al flujo auto batch.
export const dynamic = "force-dynamic";

export default async function BatchPage() {
  return (
    <div className="prose dark:prose-invert max-w-lg">
      <h1>Generación manual deshabilitada</h1>
      <p>
        Esta vista ha sido deprecada. Usa la opción de generación automática desde{" "}
        <code>/admin/prizes</code>, que consume el stock actual y genera un lote único.
      </p>
      <p className="text-sm opacity-70">
        Endpoint antiguo: <code>/api/batch/generate</code> ahora responde 410 MANUAL_MODE_DISABLED.
      </p>
    </div>
  );
}
