import { Suspense } from "react";
import { ProduccionesClient } from "./ProduccionesClient";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default function ProduccionesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProduccionesClient />
    </Suspense>
  );
}
