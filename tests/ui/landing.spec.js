import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing has working navigation, honest sample data, and no accessibility violations', async ({ page }, testInfo) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Better SEO.');
  await expect(page.getByText('Illustrative data')).toBeVisible();
  await page.getByRole('link', { name: 'See how it works' }).click();
  await expect(page).toHaveURL(/#workflow$/);
  await expect(page.getByRole('heading', { name: 'From URL to a plan.' })).toBeInViewport();
  await expect(page.getByText('Start with real website audits', { exact: false })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  expect(runtimeErrors).toEqual([]);
  await page.screenshot({ path: `docs/screenshots/landing-${testInfo.project.name}.png`, fullPage: true });
});

test('navigation is keyboard accessible and the mobile menu closes with Escape', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const toggle = page.getByRole('button', { name: /^(Open|Close) navigation$/ });
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Why AI SEO', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.getByRole('link', { name: 'How it works', exact: true }).click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  }
});

test('layout fits narrow, tablet, desktop and wide viewports', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, `overflow at ${width}px`).toBe(false);
  }
});

test('reduced motion and text zoom preserve content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test('unknown page provides a route back home', async ({ page }) => {
  await page.goto('/missing');
  await expect(page.getByRole('heading', { name: 'Let’s find your way back.' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Better SEO.');
});

