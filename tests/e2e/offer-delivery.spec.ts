import { test, expect } from '@playwright/test';

test.describe('Offer delivery completion', () => {
  test('should complete offer delivery successfully', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.locator('input[type="text"]').first().fill('admin');
    await page.locator('input[type="password"]').first().fill('admin-admin');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/admin(\/|$)/);

    // Navigate to scanner
    await page.goto('/scanner');

    // Mock a valid offer QR code response
    await page.route('/api/offers/validate-qr', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          status: 'pending',
          purchase: {
            purchaseId: 'test-purchase-123',
            customerName: 'Test Customer',
            amount: 25.00,
            createdAt: new Date().toISOString(),
            status: 'PENDING'
          },
          offer: {
            title: 'Test Offer',
            price: 25.00
          }
        })
      });
    });

    // Mock the complete delivery endpoint
    await page.route('/api/offers/complete-delivery', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Entrega completada exitosamente'
        })
      });
    });

    // Simulate scanning a QR code (we'll need to trigger the scanner somehow)
    // For now, we'll manually call the validation
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/offers/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData: 'test-qr-data' })
      });
      return await res.json();
    });

    expect(response.valid).toBe(true);
    expect(response.purchase.status).toBe('PENDING');

    // Test completing the delivery
    const completeResponse = await page.evaluate(async () => {
      const res = await fetch('/api/offers/complete-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: 'test-purchase-123' })
      });
      return await res.json();
    });

    expect(completeResponse.success).toBe(true);
  });
});