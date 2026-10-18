import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

// NN_E2E_MOBILE=1 runs the same specs with Obsidian's mobile UI emulation (phone-sized window, drawers).
const mobile = process.env.NN_E2E_MOBILE === '1';

export const config: WebdriverIO.Config = {
    runner: 'local',
    framework: 'mocha',
    specs: [path.join(here, 'specs/**/*.e2e.ts')],
    maxInstances: 1,
    capabilities: [
        {
            browserName: 'obsidian',
            browserVersion: process.env.OBSIDIAN_VERSION ?? 'latest',
            'wdio:obsidianOptions': {
                installerVersion: 'latest',
                // Our plugin from the repo root, plus the real Notebook Navigator from the community store.
                plugins: [root, { id: 'notebook-navigator' }],
                vault: path.join(here, 'vault'),
                ...(mobile ? { emulateMobile: true } : {})
            },
            ...(mobile ? { 'goog:chromeOptions': { mobileEmulation: { deviceMetrics: { width: 390, height: 844 } } } } : {})
        }
    ],
    services: ['obsidian'],
    reporters: ['spec'],
    cacheDir: path.join(root, '.obsidian-cache'),
    mochaOpts: { ui: 'bdd', timeout: 120000 },
    logLevel: 'warn'
};
