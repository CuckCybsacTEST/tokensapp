import { UProduccionesNav } from "./UProduccionesNav";

export default function UProduccionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <UProduccionesNav />
      {children}
    </div>
  );
}
