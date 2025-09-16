import { test, expect, Page } from '@playwright/test';

// Helpers
function getDayFromUrl(u: string): string | null {
  try { const url = new URL(u, 'http://localhost'); return url.searchParams.get('day'); } catch { return null; }
}

function ymdUtc(d: Date): string { return d.toISOString().slice(0, 10); }

async function adminLogin(page: Page) {
  await page.goto('/admin/login');
  await page.locator('input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin-admin');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin(\/|$)/);
}

async function userLogin(page: Page, { username, password }: { username: string; password: string }) {
  await page.goto('/u/login');
  await page.locator('input[type="text"]').first().fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  // Wait until the user session is established
  await page.waitForFunction(async () => {
    try { const r = await fetch('/api/user/me', { cache: 'no-store' }); return r.ok; } catch { return false; }
  }, null, { timeout: 10000 });
}

// Core measurable flow
// - Admin creates a task in Barra
// - User logs in, registers IN, goes to checklist (capture ?day)
// - Admin marks task as measurable (target 3, unit copas)
// - User increments stepper to reach 3, autosave
// - Admin sees Avance hoy 3 copas

test.describe('Checklist measurable flow', () => {
  test('user updates measurable and admin sees Avance hoy', async ({ page, context }) => {
    // Use pre-seeded measurable task in Barra from prisma/seed.ts
    const taskLabel = 'E2E Medible Barra';
    await adminLogin(page);
    await page.goto('/admin/tasks');

    // 2) User login and mark IN manually via UI
    // User flow: Ana already has IN for today via seed; go straight to checklist
    const userPage = await context.newPage();
    await userLogin(userPage, { username: 'ana', password: 'ana-ana' });
    const checklistDay = ymdUtc(new Date());
    await userPage.goto(`/u/checklist?day=${checklistDay}&mode=IN`);
    await expect(userPage).toHaveURL(new RegExp(`/u/checklist\\?day=${checklistDay}`));
  // Wait until the page reflects IN state (next action should be Registrar salida)
  await expect(userPage.getByText('Próxima acción: Registrar salida')).toBeVisible({ timeout: 10000 });

  // In user checklist, find the measurable task card and increment value
  const taskRow = userPage.locator('div.rounded-lg').filter({ hasText: taskLabel }).first();
    await expect(taskRow).toBeVisible();
  const plus = taskRow.getByRole('button', { name: 'Incrementar' });
    await plus.click(); await plus.click(); await plus.click();
  await expect(taskRow.getByText(/3\s*\/\s*3\s*copas/)).toBeVisible();

    // Poll admin API for sumValueToday >= 3
    let ok = false;
    for (let i = 0; i < 20; i++) {
      // Use UI: wait until the text shows 3/3 copas (autosave)
      try {
        await expect(taskRow.getByText(/3\s*\/\s*3\s*copas/)).toBeVisible({ timeout: 500 });
        ok = true; break;
      } catch {}
      await page.waitForTimeout(500);
    }
    expect(ok).toBeTruthy();

    // Visual confirmation in admin UI
    await page.bringToFront();
    await page.goto('/admin/tasks');
  const adminCard = page.locator('div').filter({ hasText: taskLabel }).filter({ hasText: 'Avance hoy:' }).first();
    await expect(adminCard.getByText(/Avance hoy:\s*3\s*copas/)).toBeVisible({ timeout: 15000 });
  });
});
