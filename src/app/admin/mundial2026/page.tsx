import AdminMundial2026Client from "./AdminMundial2026Client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminMundial2026Page() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminMundial2026Client />
      </div>
    </div>
  );
}