import { test, expect, Page } from '@playwright/test';

async function seed(page: Page, prizes: any[]) {
  const res = await page.request.post('/api/test/seed-prizes', { data: { prizes } });
  expect(res.ok()).toBeTruthy();
}

test.describe('Auto batch badges', () => {
  test('badges switch to Emitido after generation', async ({ page }) => {
    await seed(page, [
      { id: 'e2e1', key: 'e2k1', label: 'E2E Prize 1', stock: 2 },
      { id: 'e2e2', key: 'e2k2', label: 'E2E Prize 2', stock: 3 },
    ]);

    await page.goto('/admin/prizes');
    await expect(page.getByText('Pendiente (2)')).toBeVisible();
    await expect(page.getByText('Pendiente (3)')).toBeVisible();

    await page.getByRole('button', { name: 'Generar Automático' }).click();
    await page.getByRole('button', { name: 'Generar' }).click();

    await expect(page.getByText(/Lote generado/)).toBeVisible();

    await expect(page.getByText('Emitido')).toHaveCount(2);
  });
});
