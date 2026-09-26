// Captures review screenshots of the running site (npm run serve first).
// Usage: node tools/screenshots.mjs <outDir> [sectionId@progress ...]
//   e.g. node tools/screenshots.mjs shots top machine@0.5 scene-forecast@0.3
import { chromium } from '@playwright/test';

const [outDir = 'shots', ...targets] = process.argv.slice(2);
const url = 'http://localhost:4173/cv/';
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

const browser = await chromium.launch();
for (const [label, viewport] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.waitForTimeout(2500);
  for (const target of targets.length ? targets : ['top']) {
    const [id, progress] = target.split('@');
    await page.evaluate(async ([id, progress]) => {
      const el = document.getElementById(id);
      const pin = window.ScrollTrigger?.getAll().find((t) => t.trigger === el && t.pin);
      const y = pin && progress ? pin.start + (pin.end - pin.start) * Number(progress) : el.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, y);
    }, [id, progress]);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${outDir}/${label}-${target.replace('@', '-')}.png` });
  }
  await page.close();
}
await browser.close();
console.log(`Screenshots written to ${outDir}/`);
