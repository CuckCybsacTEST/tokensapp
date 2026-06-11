import StaffMundial2026RedeemClient from "./StaffMundial2026RedeemClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function StaffMundial2026ScanPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <StaffMundial2026RedeemClient />
      </div>
    </div>
  );
}