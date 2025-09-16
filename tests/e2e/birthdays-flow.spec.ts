import { test, expect } from '@playwright/test';

// Helpers to pick a date string yyyy-mm-dd (today + 7 days)
function futureDate(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

test.describe('Birthdays public flow', () => {
  test('marketing → reservar → crea → tokens → QRs host+guest', async ({ page, baseURL }) => {
    // Ensure public layer is enabled (server should read env at boot)
    // If needed in CI, set env: BIRTHDAYS_PUBLIC=1 NEXT_PUBLIC_BIRTHDAYS_ENABLED=1

    // 1) Open marketing page
    await page.goto('/marketing');

    // 2) Click any pack CTA (use basic key testid)
    const cta = page.getByTestId('birthday-pack-cta-basic');
    await expect(cta).toBeVisible();
    await cta.click();

    // 3) Should navigate to reservar with preselected pack
    await expect(page).toHaveURL(/\/marketing\/birthdays\/reservar\?packId=/);

    // Wait for packs to load and the pack select to have a value
    const packSelect = page.getByTestId('input-pack');
    await expect(packSelect).toBeVisible();
    // Select first available pack (skip placeholder)
    const firstValue = await packSelect.locator('option').nth(1).getAttribute('value');
    if (firstValue) {
      await packSelect.selectOption(firstValue);
    }

    // 4) Fill the form
    await page.getByTestId('input-name').fill('E2E Tester');
    await page.getByTestId('input-whatsapp').fill('+5491112345678');
    await page.getByTestId('input-documento').fill('12345678');
    await page.getByTestId('input-date').fill(futureDate());
    // timeSlot select already has default 20:00

    // 5) Submit and wait phases
    await page.getByTestId('submit-reservation').click();

    // Creating state then generating state appear
    await expect(page.getByTestId('state-creating')).toBeVisible({ timeout: 10000 });
    // generating may replace creating; wait for either to disappear on navigation

    // 6) Expect redirect to QRs page with cs param
    await page.waitForURL(/\/marketing\/birthdays\/[^/]+\/qrs\?cs=/, { timeout: 30000 });

    // 7) Verify host and guest QR blocks render
    const host = page.getByTestId('qr-host');
    const guest = page.getByTestId('qr-guest');
    await expect(host).toBeVisible();
    await expect(guest).toBeVisible();

    // Optionally ensure images are loaded (data URLs rendered)
    await expect(page.getByTestId('qr-host-img')).toBeVisible();
    await expect(page.getByTestId('qr-guest-img')).toBeVisible();
  });
});
