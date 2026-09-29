// Renders the social preview card (images/og.png, 1200×630) and the touch icon. Run: node tools/build-og.mjs
import { chromium } from '@playwright/test';
import sharp from 'sharp';

await sharp('images/icon.svg', { density: 600 }).resize(180, 180).png().toFile('images/apple-touch-icon.png');

const card = `<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #0B0B0C; color: #F4F2EC; font-family: 'Inter Tight'; position: relative; overflow: hidden; }
  body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 60px 60px; }
  .glow { position: absolute; width: 800px; height: 800px; right: -250px; top: -350px; background: radial-gradient(circle, rgba(198,244,50,.2), transparent 60%); }
  svg { position: absolute; left: 0; bottom: 0; width: 1200px; height: 220px; }
  .inner { position: absolute; left: 80px; top: 72px; }
  .eyebrow { font: 600 22px 'JetBrains Mono'; letter-spacing: .08em; text-transform: uppercase; opacity: .7; }
  h1 { margin: 24px 0 0; font-size: 104px; line-height: .92; font-weight: 800; letter-spacing: -.055em; }
  em { font-family: 'Instrument Serif'; font-weight: 400; color: #C6F432; letter-spacing: -.03em; }
  .stat { position: absolute; right: 80px; top: 80px; text-align: right; font: 600 88px 'JetBrains Mono'; color: #C6F432; }
  .stat span { display: block; margin-top: 8px; font: 500 22px 'Inter Tight'; color: rgba(244,242,236,.6); }
</style></head><body>
<div class="glow"></div>
<svg viewBox="0 0 1200 220" preserveAspectRatio="none"><path d="M0 190 C 200 170, 320 110, 480 140 S 760 60, 900 80 S 1100 20, 1200 10" fill="none" stroke="#C6F432" stroke-width="4" opacity=".7"/></svg>
<div class="inner"><div class="eyebrow">Jack Liu, MMA · Toronto</div><h1>Finance &amp;<br>Analytics<br><em>Leader</em></h1></div>
<div class="stat">$4B<span>product portfolio forecast</span></div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(card, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'images/og.png' });
await browser.close();
console.log('Wrote images/og.png and images/apple-touch-icon.png');
