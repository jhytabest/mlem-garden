import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Pages', () => {
	test('homepage loads and shows welcome content', async ({ page }) => {
		await page.goto('/');

		// Check main heading
		await expect(page.getByRole('heading', { name: /welcome to mlem garden/i })).toBeVisible();

		// Check key features are displayed
		await expect(page.getByText(/create your shober/i)).toBeVisible();
		await expect(page.getByText(/join the garden/i)).toBeVisible();
		await expect(page.getByText(/make friends/i)).toBeVisible();

		// Login CTA should be present
		await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
	});

	test('homepage has working navigation to login', async ({ page }) => {
		await page.goto('/');

		// Click login button
		await page.getByRole('link', { name: /sign in/i }).click();

		// Should navigate to login page
		await expect(page).toHaveURL(/\/login/);
	});

	test('login page loads', async ({ page }) => {
		await page.goto('/login');

		// Page should load without errors
		await expect(page).toHaveURL(/\/login/);
	});

	test('marketplace page loads', async ({ page }) => {
		await page.goto('/marketplace');

		// Page should load (may show login prompt or marketplace content)
		await expect(page).toHaveURL(/\/marketplace/);
	});

	test('portfolio page loads', async ({ page }) => {
		await page.goto('/portfolio');

		// Page should load
		await expect(page).toHaveURL(/\/portfolio/);
	});

	test('breeding page loads', async ({ page }) => {
		await page.goto('/breeding');

		// Page should load
		await expect(page).toHaveURL(/\/breeding/);
	});
});

test.describe('Smoke Tests - Page Performance', () => {
	test('homepage loads within acceptable time', async ({ page }) => {
		const start = Date.now();
		await page.goto('/');
		const loadTime = Date.now() - start;

		// Should load within 5 seconds
		expect(loadTime).toBeLessThan(5000);
	});
});

test.describe('Smoke Tests - Responsive Design', () => {
	test('homepage is responsive on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Main content should still be visible
		await expect(page.getByRole('heading', { name: /welcome to mlem garden/i })).toBeVisible();
		await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
	});

	test('homepage is responsive on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/');

		await expect(page.getByRole('heading', { name: /welcome to mlem garden/i })).toBeVisible();
	});
});

test.describe('Smoke Tests - Accessibility', () => {
	test('homepage has proper heading structure', async ({ page }) => {
		await page.goto('/');

		// Should have an h1
		const h1 = page.locator('h1');
		await expect(h1).toHaveCount(1);
	});

	test('login link is keyboard accessible', async ({ page }) => {
		await page.goto('/');

		// Tab to login button and verify it's focusable
		await page.keyboard.press('Tab');

		// Eventually we should be able to reach the login link
		let found = false;
		for (let i = 0; i < 10; i++) {
			const focused = page.locator(':focus');
			const text = await focused.textContent();
			if (text?.toLowerCase().includes('sign in')) {
				found = true;
				break;
			}
			await page.keyboard.press('Tab');
		}

		expect(found).toBe(true);
	});
});
