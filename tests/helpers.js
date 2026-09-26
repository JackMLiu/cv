// Scrolls a visitor's way through the whole page, then lets scrubbed animations settle.
export async function scrollThrough(page, { step = 400 } = {}) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += step) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(2500);
}
