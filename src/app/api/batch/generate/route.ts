// Endpoint de batch manual DEPRECATED.
// Referencia únicamente para devolver 410; el flujo soportado es auto batch en /api/batch/generate-all.
export async function POST() {
  return new Response(
    JSON.stringify({
      error: "MANUAL_MODE_DISABLED",
      message: "La generación manual ha sido deshabilitada. Usa /api/batch/generate-all.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
}
