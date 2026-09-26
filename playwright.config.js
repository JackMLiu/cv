import { defineConfig, devices } from '@playwright/test';

// BASE_URL=https://jackmliu.github.io/cv/ npm test  → runs the suite against the live site.
const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: live || 'http://localhost:4173/cv/',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: live ? undefined : {
    command: 'node tools/serve.mjs',
    url: 'http://localhost:4173/cv/',
    reuseExistingServer: true,
  },
});
