import { ProduccionesNav } from "./ProduccionesNav";

export default function ProduccionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <ProduccionesNav />
      {children}
    </div>
  );
}
