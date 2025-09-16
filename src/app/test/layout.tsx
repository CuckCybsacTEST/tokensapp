export default function TestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mx-auto">
      {children}
    </div>
  );
}
