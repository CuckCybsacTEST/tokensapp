import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function RegulationsPage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session) {
    redirect('/u/login');
  }

  if (session.role === 'STAFF') {
    redirect('/u');
  }

  if (session.role !== 'ADMIN') {
    redirect('/u/login');
  }

  // Obtener el contenido del reglamento desde la base de datos
  const regulationSet = await prisma.triviaQuestionSet.findUnique({
    where: { id: 'cmkcqtdtl0001hfh8nvysntxz' },
    select: {
      id: true,
      name: true,
      regulationContent: true,
      createdAt: true
    }
  });

  if (!regulationSet || !regulationSet.regulationContent) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 md:p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Reglamento No Encontrado
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                No se pudo encontrar el contenido del reglamento interno.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {regulationSet.name}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Actualizado: {regulationSet.createdAt.toLocaleDateString('es-ES')}
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <div
              className="text-slate-700 dark:text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: regulationSet.regulationContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}