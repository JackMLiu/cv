import { test, expect } from '@playwright/test';
import { findDisclosures, localTerms } from './disclosure.js';

async function pdfText(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((item) => item.str + (item.hasEOL ? '\n' : '')).join('') + '\n';
  }
  return { pages: doc.numPages, text };
}

test.describe('public resume', () => {
  test('both download buttons point at a PDF that exists', async ({ page, request }) => {
    await page.goto('./');
    const links = page.locator('a[href="Jack-Liu-Resume.pdf"]');
    await expect(links).toHaveCount(2);
    const res = await request.get('./Jack-Liu-Resume.pdf');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  });

  test('the PDF is selectable text on at most two pages', async ({ request }) => {
    const { pages, text } = await pdfText(await (await request.get('./Jack-Liu-Resume.pdf')).body());
    expect(pages).toBeLessThanOrEqual(2);
    expect(text).toContain('Jack Liu');
    expect(text).toMatch(/FP&A/);
    expect(text).toContain('jack.mu.liu@gmail.com');
    // ATS parsers need section headings as whole words, not letter-spaced glyphs.
    for (const heading of ['SUMMARY', 'EXPERIENCE', 'EDUCATION']) expect(text.toUpperCase()).toContain(heading);
  });

  test('the source also fits two A4 pages', async ({ page }) => {
    await page.goto('./resume.html');
    const { pages } = await pdfText(await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: false }));
    expect(pages).toBeLessThanOrEqual(2);
  });

  test('neither the source nor the PDF publishes anything sensitive', async ({ page, request }) => {
    expect(localTerms, 'tests/disclosure.local.json is missing; the guard needs the local sensitive-term list').not.toBeNull();
    await page.goto('./resume.html');
    const source = await page.locator('body').innerText();
    const { text } = await pdfText(await (await request.get('./Jack-Liu-Resume.pdf')).body());
    expect(findDisclosures(source)).toEqual([]);
    expect(findDisclosures(text)).toEqual([]);
  });
});
