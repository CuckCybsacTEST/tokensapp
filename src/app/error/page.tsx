import Link from 'next/link';

interface PageProps {
  searchParams: { message?: string; type?: string };
}

export default function ErrorPage({ searchParams }: PageProps) {
  const message = searchParams.message || 'Ha ocurrido un error';
  const type = searchParams.type || 'unknown';

  const getEmoji = () => {
    switch (type) {
      case 'expired': return '⏰';
      case 'disabled': return '🚫';
      case 'exhausted': return '🔄';
      case 'too_early': return '⏳';
      case 'outside_window': return '🕐';
      default: return '❌';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 text-center">
            <div className="text-6xl mb-2">{getEmoji()}</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Error
            </h1>
          </div>

          <div className="px-6 py-6 text-center">
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              {message}
            </p>
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 text-center">
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}