import { test, expect } from '@playwright/test';

/*
E2E: Verifica que /admin/login no produce 404 de layout.css obsoleto y que Tailwind funciona.
Notas:
 - En algunos entornos de producción /admin puede estar protegido; este test está pensado para DEV/STAGE.
 - Si el dev server mueve el puerto (ej. 3000 ocupado y usa 3001) hacemos fallback automático.
Ejecutar:
  npx playwright test tests/e2e/admin-login-css.spec.ts
Opcional:
  E2E_BASE_URL=http://localhost:3001 npx playwright test tests/e2e/admin-login-css.spec.ts
*/

test.describe('Admin login CSS integrity', () => {
  test('no missing layout css chunk & styles applied', async ({ page }) => {
    if (process.env.CI && process.env.PROD_LOCK === '1') {
      test.skip(true, 'Saltado en CI con PROD_LOCK=1 (entorno producción protegido)');
    }
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const responses404: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 404 && res.url().includes('/_next/static/css/')) {
        responses404.push(res.url());
      }
    });

    const candidates = [
      process.env.E2E_BASE_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ].filter(Boolean) as string[];

    let successBase: string | null = null;
    let lastErr: any;
    for (const base of candidates) {
      try {
        await page.goto(base.replace(/\/$/, '') + '/admin/login', { waitUntil: 'domcontentloaded' });
        successBase = base; break;
      } catch (e) {
        lastErr = e;
      }
    }
    expect(successBase, 'No se pudo acceder a /admin/login en ninguno de los puertos candidatos').not.toBeNull();

    // Asegurar que el formulario (o al menos un input password) esté presente incluso si el layout cambia.
    const hasForm = await page.locator('form').count();
    const hasPasswordInput = await page.locator('input[type="password"]').count();
    expect(hasForm + hasPasswordInput, 'Debe existir un formulario o un input password').toBeGreaterThan(0);

    const hasAntialiased = await page.evaluate(() => document.body.classList.contains('antialiased') || document.documentElement.classList.contains('antialiased'));
    const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily || '');

    expect(responses404, 'No debe haber CSS chunks 404').toHaveLength(0);
    expect(hasAntialiased, 'Clase antialiased esperada en body o html').toBeTruthy();
    expect(fontFamily.toLowerCase(), 'font-family debería estar aplicado').not.toBe('');

    const filtered = consoleErrors.filter(e => !/not implemented/i.test(e));
    expect(filtered, 'Errores de consola inesperados').toHaveLength(0);
  });
});
