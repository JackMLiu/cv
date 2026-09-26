import { test, expect } from '@playwright/test';
import { findDisclosures, localTerms } from './disclosure.js';
import { scrollThrough } from './helpers.js';

test.describe('disclosure guard', () => {
  test('the page publishes nothing sensitive', async ({ page, request }) => {
    expect(localTerms, 'tests/disclosure.local.json is missing; the guard needs the local sensitive-term list').not.toBeNull();
    const html = await (await request.get('./')).text();
    await page.goto('./');
    const text = await page.locator('body').innerText();
    expect(findDisclosures(html + '\n' + text)).toEqual([]);
  });
});

// Content a Recruiter must be able to read however the page is delivered.
const essentials = [
  '$4B',
  'Focus areas',
  'Finance transformation',
  '10+',
  '95%',
  '~85%',
  '200+',
  'Professional experience',
  'AI/ML & Automation',
  'Generali Global Health Services',
  'Manager, Financial Analysis',
  'Master of Management Analytics',
  'Muay Thai',
  'jack.mu.liu@gmail.com',
];

async function expectEssentialsVisible(page) {
  for (const text of essentials) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('main *, header *')]
      .filter((el) => el.closest('[aria-hidden="true"], dialog') === null && el.getClientRects().length > 0)
      // Stuck animation start states: effectively invisible.
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.05)
      .map((el) => el.outerHTML.slice(0, 80)));
  expect(hidden).toEqual([]);
  for (const chart of await page.locator('[data-scene] svg').all()) await expect(chart).toBeVisible();
}

// With motion, content off screen may be reset (waiting to replay). What must hold is that
// whatever is on screen settles fully visible. Chart internals are scroll-scrubbed, so the
// final-state test covers them instead.
async function expectEachSectionSettlesVisible(page, { order }) {
  const ids = await page.evaluate(() => [...document.querySelectorAll('header[id], main > section[id]')].map((s) => s.id));
  for (const id of order === 'up' ? ids.reverse() : ids) {
    await goToSection(page, id);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('main *, header *')]
        .filter((el) => el.closest('[aria-hidden="true"], dialog, svg') === null)
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // Reveals start as content rises past ~85% of the screen, so the bottom strip may still be waiting.
          return r.width > 0 && r.height > 0 && r.top < innerHeight * 0.85 && r.bottom > 0;
        })
        .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.05)
        .map((el) => el.outerHTML.slice(0, 80)));
    expect(hidden, `hidden on screen at #${id}`).toEqual([]);
  }
}

async function goToSection(page, id) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, id);
  await page.waitForTimeout(1600);
}

test.describe('resilience', () => {
  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('all content is readable', async ({ page }) => {
      await page.goto('./');
      await expectEssentialsVisible(page);
    });
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('content and counters show final values immediately', async ({ page }) => {
      await page.goto('./');
      await expect(page.locator('.hero [data-count]')).toHaveText('$4B', { timeout: 200 });
      await expectEssentialsVisible(page);
    });
  });

  test('with motion, every section settles fully visible, scrolling down and back up', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./');
    await scrollThrough(page);
    await expectEachSectionSettlesVisible(page, { order: 'up' });
    await expectEachSectionSettlesVisible(page, { order: 'down' });
  });

  test('no section holds the scroll: the page is as long as its content', async ({ page }) => {
    await page.goto('./');
    await page.waitForTimeout(500);
    const { pins, extra } = await page.evaluate(() => ({
      pins: window.ScrollTrigger.getAll().filter((t) => t.pin).length,
      extra: document.querySelectorAll('.pin-spacer').length,
    }));
    expect(pins).toBe(0);
    expect(extra).toBe(0);
  });

  test('case study charts animate to their final state once scrolled into view', async ({ page }) => {
    await page.goto('./');
    await goToSection(page, 'scene-forecast');
    await expect(page.locator('#scene-forecast [data-scene-text][data-count]')).toHaveText('~85%', { timeout: 4000 });
  });

  test('animations replay when you come back to a section', async ({ page }) => {
    await page.goto('./');
    const title = page.locator('#capabilities-title');
    const counter = page.locator('#proof [data-count="95"]');
    await goToSection(page, 'capabilities');
    await expect(title).toHaveCSS('opacity', '1');
    await goToSection(page, 'top');
    // Off screen, the section resets so it can play again…
    await expect(title).toHaveCSS('opacity', '0');
    await goToSection(page, 'capabilities');
    // …and plays again on the way back.
    await expect(title).toHaveCSS('opacity', '1');
    await goToSection(page, 'contact');
    await goToSection(page, 'proof');
    await expect(counter).toHaveText('95%');
  });

  test('each case study chart ends exactly at its authored final state', async ({ page, request }) => {
    const html = await (await request.get('./')).text();
    await page.goto('./');
    await scrollThrough(page);
    // Charts reset once off screen (ready to replay), so check each one while it is in view.
    const ids = await page.evaluate(() => [...document.querySelectorAll('[data-scene]')].map((s) => s.id));
    expect(ids.length).toBe(3);
    for (const id of ids) {
      await goToSection(page, id);
      await page.waitForTimeout(2500);
      const mismatches = await page.evaluate(([source, id]) => {
        const authored = new DOMParser().parseFromString(source, 'text/html');
        const shapes = (doc) => [...doc.querySelectorAll(`#${id} svg [d], #${id} svg rect`)]
          .map((el) => el.getAttribute('d') ?? `${el.getAttribute('y')}/${el.getAttribute('height')}/${el.getAttribute('width')}`);
        const want = shapes(authored), got = shapes(document);
        return want.length === 0 ? ['no chart shapes found'] : want.filter((w, i) => w !== got[i]);
      }, [html, id]);
      expect(mismatches, `#${id}`).toEqual([]);
    }
  });

  test.describe('on a tablet or small laptop', () => {
    test.use({ viewport: { width: 845, height: 1000 } });
    test('with motion, every section settles fully visible, scrolling down and back up', async ({ page }) => {
    test.setTimeout(120_000);
      await page.goto('./');
      await scrollThrough(page);
      await expectEachSectionSettlesVisible(page, { order: 'up' });
      await expectEachSectionSettlesVisible(page, { order: 'down' });
    });
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 812 } });
    test('nothing scrolls sideways', async ({ page }) => {
      await page.goto('./');
      await scrollThrough(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});


test.describe('proof strip', () => {
  test('shows the five headline proof points with labels', async ({ page }) => {
    await page.goto('./');
    const strip = page.locator('#proof');
    const values = strip.getByRole('listitem');
    await expect(values).toHaveCount(5);
    for (const [value, label] of [
      ['10+', /years/i],
      ['$4B', /forecast/i],
      ['95%', /less effort/i],
      ['~85%', /forecast miss/i],
      ['200+', /FP&A professionals/i],
    ]) {
      const item = values.filter({ hasText: value });
      await expect(item).toHaveCount(1);
      await expect(item).toContainText(label);
    }
  });

  test('introduces Jack with a described photo', async ({ page }) => {
    await page.goto('./');
    const intro = page.locator('#intro');
    await expect(intro.getByRole('heading')).toHaveText('About');
    await expect(intro.getByRole('img', { name: /Jack Liu/ })).toBeVisible();
  });
});

test.describe('the machine', () => {
  test('shows the four stages, each with its tools and an outcome', async ({ page }) => {
    await page.goto('./');
    const machine = page.locator('#machine');
    await expect(machine.getByRole('heading', { level: 2 })).toContainText(/from data to decision/i);
    const stages = machine.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 3 }) });
    await expect(stages.getByRole('heading', { level: 3 })).toHaveText(['Data', 'Model', 'Forecast', 'Decision']);
    for (const tool of ['SQL', 'Python', 'SAP Analytics Cloud', 'Power BI']) {
      await expect(machine).toContainText(tool);
    }
  });
});

test.describe('signature scenes', () => {
  test('forecast accuracy: states the outcome and describes the chart', async ({ page }) => {
    await page.goto('./');
    const scene = page.locator('#scene-forecast');
    await expect(scene).toContainText('~85%');
    await expect(scene).toContainText(/smaller forecast miss/i);
    await expect(scene.getByRole('img', { name: /forecast/i })).toBeVisible();
  });

  test('reporting transformation: 2 people × 3 days becomes 1 person × 2 hours', async ({ page }) => {
    await page.goto('./');
    const scene = page.locator('#scene-reporting');
    await expect(scene).toContainText('95%');
    await expect(scene).toContainText(/2 people × 3 days/);
    await expect(scene).toContainText(/1 person × 2 hours/);
    await expect(scene.getByRole('img', { name: /effort/i })).toBeVisible();
  });

  test('revenue drivers: an illustrative plan-to-actual waterfall', async ({ page }) => {
    await page.goto('./');
    const scene = page.locator('#scene-drivers');
    await expect(scene.getByRole('img', { name: /waterfall/i })).toBeVisible();
    await expect(scene).toContainText(/illustrative/i);
    for (const step of ['Plan', 'Price', 'Volume', 'Mix', 'Actual']) {
      await expect(scene.locator('svg')).toContainText(step);
    }
  });

  test.describe('as authored', () => {
    test.use({ javaScriptEnabled: false });
    test('effort bars are proportional to person-hours (48 before, 2 after)', async ({ page }) => {
      await page.goto('./');
      const bars = page.locator('#scene-reporting [data-effort]');
      const [before, after] = await bars.evaluateAll((els) => els.map((el) => Number(el.getAttribute('width'))));
      expect(after / before).toBeCloseTo(2 / 48, 3);
    });

    test('waterfall running totals add up: plan + price + volume + mix = actual', async ({ page }) => {
      await page.goto('./');
      const bars = await page.locator('#scene-drivers [data-step]').evaluateAll((els) =>
        els.map((el) => ({ step: el.getAttribute('data-step'), y: Number(el.getAttribute('y')), h: Number(el.getAttribute('height')), value: Number(el.getAttribute('data-value')) })));
      const [plan, price, volume, mix, actual] = bars;
      expect(plan.value + price.value + volume.value + mix.value).toBeCloseTo(actual.value, 5);
      // Each delta bar starts where the previous running total ended.
      expect(price.y + price.h).toBeCloseTo(plan.y, 3);
      expect(volume.y).toBeCloseTo(price.y, 3);
      expect(mix.y + mix.h).toBeCloseTo(volume.y + volume.h, 3);
      expect(actual.y).toBeCloseTo(mix.y, 3);
    });
  });
});

test.describe('capabilities, career and education', () => {
  test('offers the four capabilities', async ({ page }) => {
    await page.goto('./');
    const caps = page.locator('#capabilities');
    await expect(caps.getByRole('heading', { level: 3 })).toHaveText(['FP&A', 'Business Partnering', 'Leadership', 'AI/ML & Automation']);
  });

  test('shows the career progression, newest first, without AC Contracting', async ({ page }) => {
    await page.goto('./');
    const career = page.locator('#career');
    await expect(career.getByRole('heading', { level: 3 })).toHaveText([
      /Canada Post/, /Generali Global Health Services/, /Banyan Work Health Solutions/,
    ]);
    for (const step of ['Financial Analyst', 'Senior Financial Analyst', 'Manager, Financial Analysis', '2015', '2017', '2020']) {
      await expect(career).toContainText(step);
    }
    await expect(page.locator('body')).not.toContainText('AC Contracting');
    for (const role of await career.locator('.role').all()) {
      const bullets = await role.locator('.role__points li').count();
      expect(bullets).toBeGreaterThanOrEqual(3);
      expect(bullets).toBeLessThanOrEqual(5);
    }
  });

  test('lists both degrees', async ({ page }) => {
    await page.goto('./');
    const edu = page.locator('#education');
    await expect(edu).toContainText('Master of Management Analytics');
    await expect(edu).toContainText(/Queen’s University/);
    await expect(edu).toContainText('Bachelor of Economics');
    await expect(edu).toContainText('University of Waterloo');
  });
});

test.describe('off the clock', () => {
  test('shows the vibe-coding side project with a link and a screenshot', async ({ page }) => {
    await page.goto('./');
    const card = page.locator('#off-the-clock .hobby').filter({ has: page.getByRole('heading', { name: 'Vibe coding' }) });
    await expect(card).toContainText('Papernils');
    await expect(card.getByRole('link', { name: /papernils\.com/i }).first()).toHaveAttribute('href', 'https://papernils.com');
    await expect(card.getByRole('img', { name: /Papernils/ }).first()).toBeVisible();
    await expect(page.locator('footer')).not.toContainText(/hand-built/i);
  });

  test('mentions Muay Thai with the homecoming bout, and nothing off-message', async ({ page }) => {
    await page.goto('./');
    const off = page.locator('#off-the-clock');
    await expect(off).toContainText('Muay Thai');
    await expect(off.getByRole('link', { name: /homecoming bout/i })).toHaveAttribute('href', 'https://youtu.be/gYXfiESb8w4');
    const body = page.locator('body');
    await expect(body).not.toContainText(/\b\d+W\s*\/\s*\d+L\b/);
    await expect(body).not.toContainText(/twitter|instagram|web design/i);
  });

  test('latte art opens in a lightbox that Escape closes', async ({ page }) => {
    await page.goto('./');
    // Links to the full image (works without JS), enhanced into a lightbox.
    const shots = page.locator('#off-the-clock').getByRole('link', { name: /latte art/i });
    await expect(shots).toHaveCount(4);
    await shots.first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('img')).toHaveAttribute('alt', /latte/i);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the old latte art page lands on this section', async ({ page }) => {
    await page.goto('./LatteArt.html');
    await expect(page).toHaveURL(/\/cv\/(index\.html)?#off-the-clock$/);
  });
});

test.describe('contact', () => {
  test('closes with email and LinkedIn as the only routes', async ({ page }) => {
    await page.goto('./');
    const contact = page.locator('#contact');
    await expect(contact.getByRole('heading', { level: 2 })).toContainText(/Get in touch/);
    await expect(contact.getByRole('link', { name: /jack\.mu\.liu@gmail\.com/ })).toHaveAttribute('href', 'mailto:jack.mu.liu@gmail.com');
    await expect(contact.getByRole('link', { name: /linkedin/i })).toHaveAttribute('href', 'https://www.linkedin.com/in/jack-liu-5069b751/');
  });
});

test.describe('hero', () => {
  test('makes the positioning claim with a way to act', async ({ page }) => {
    await page.goto('./');
    const hero = page.getByRole('banner');
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(/FP&A &\s+Analytics\s+Leader/);
    await expect(hero).toContainText('$4B');
    await expect(hero).toContainText('Focus areas');
    await expect(hero).toContainText('Finance transformation');
    await expect(hero.getByRole('link', { name: /get in touch/i })).toHaveAttribute('href', 'mailto:jack.mu.liu@gmail.com');
    await expect(hero.getByRole('link', { name: /download resume/i })).toHaveAttribute('href', 'Jack-Liu-Resume.pdf');
  });
});
