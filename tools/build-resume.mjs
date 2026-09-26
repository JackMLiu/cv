// Renders resume.html to Jack-Liu-Resume.pdf (US Letter). Run: npm run resume
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const server = spawn(process.execPath, ['tools/serve.mjs'], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 600));
try {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4173/cv/resume.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: 'Jack-Liu-Resume.pdf', format: 'Letter', printBackground: true });
  await browser.close();
  console.log('Wrote Jack-Liu-Resume.pdf');
} finally {
  server.kill();
}
