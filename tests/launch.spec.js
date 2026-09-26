import { test, expect } from '@playwright/test';
import { scrollThrough } from './helpers.js';

const site = 'https://jackmliu.github.io/cv/';

test.describe('sharing and search', () => {
  test('link previews and search engines get a proper card', async ({ page, request }) => {
    await page.goto('./');
    const meta = (sel) => page.locator(sel).getAttribute('content');
    await expect(page).toHaveTitle(/Jack Liu/);
    expect(await meta('meta[name="description"]')).toMatch(/FP&A/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site);
    expect(await meta('meta[property="og:title"]')).toMatch(/Jack Liu/);
    expect(await meta('meta[property="og:url"]')).toBe(site);
    expect(await meta('meta[name="twitter:card"]')).toBe('summary_large_image');
    const image = await meta('meta[property="og:image"]');
    expect(image).toMatch(new RegExp(`^${site}`));
    expect((await request.get(image.replace(site, './'))).status()).toBe(200);

    const person = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('Jack Liu');
    expect(person.sameAs).toContain('https://www.linkedin.com/in/jack-liu-5069b751/');
  });

  test('the tab shows the new icon', async ({ page, request }) => {
    await page.goto('./');
    const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href');
    expect((await request.get(icon)).status()).toBe(200);
    const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await request.get(touch)).status()).toBe(200);
  });
});

test.describe('health', () => {
  test('a full scroll-through has no errors or missing files', async ({ page }) => {
    const problems = [];
    page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));
    page.on('console', (msg) => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`); });
    page.on('response', (res) => { if (res.status() >= 400) problems.push(`${res.status()} ${res.url()}`); });
    await page.goto('./');
    await scrollThrough(page, { step: 500 });
    expect(problems).toEqual([]);
  });
});
