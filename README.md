# Jack Liu — personal site

**Live:** https://jackmliu.github.io/cv/ (GitHub Pages, served from `main`)

A single-page site for an FP&A leader who builds the analytics behind the numbers.
The domain language (Positioning, Proof point, Signature scene, The machine, …) is defined in [CONTEXT.md](CONTEXT.md).

## How it's built

Plain static HTML, CSS and JavaScript. There's **no build step** to serve the site: push to `main` and it's live.

| File | What it is |
|---|---|
| `index.html` | All the page content. Every word, number and chart's final state lives here. |
| `css/styles.css` | Design system (tokens at the top) and section styles. |
| `js/main.js` | Motion only: GSAP + ScrollTrigger scroll scenes and Lenis smooth scrolling, loaded from jsDelivr. |
| `resume.html` → `Jack-Liu-Resume.pdf` | The public resume: print source and generated PDF. |
| `LatteArt.html` | Redirect for old links, pointing to the Off the clock section. |

**Progressive enhancement is the rule.** The page must read correctly without JavaScript and with "reduce motion" on. JS only animates *from* a start state *to* what the HTML already shows.

Charts use IBCS notation: actual = solid, plan = outlined grey, green/red only for variances. Lime is the single accent.

## Editing

- **Change text or numbers:** edit `index.html`. Counters take their target from `data-count` (plus `data-prefix`/`data-suffix`), so keep that in sync with the visible text.
- **Change the resume:** edit `resume.html`, then run `npm run resume` to regenerate the PDF.
- **Replace photos:** put the source in `images/` and run `npm run assets` (writes optimized files to `images/web/`).
- **Social card / touch icon:** `npm run og`.

## Dev tooling (optional)

Only needed for tests and regenerating assets. Requires Node 20+.

```bash
npm install
npx playwright install chromium
npm run serve    # http://localhost:4173/cv/
npm test         # browser test suite
```

The suite checks the content, the disclosure guard, no-JS, reduced motion, phone layout, links, the resume PDF, metadata and console health.

**Disclosure guard:** the tests fail if the site or resume publishes a phone number, job-search language or any term in `tests/disclosure.local.json`. That file is gitignored on purpose, so the public repo never names what must stay private. Keep a copy locally; without it, the guard tests fail on purpose.
