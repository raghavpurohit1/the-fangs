import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist/pages');
const configOutput = join(root, 'dist/pages-config');

// Only public assets and the generated server bundle enter the deployment folder.
// Secrets remain runtime bindings; this script never reads .env or .dev.vars.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, 'public'), output, { recursive: true });

await build({
  absWorkingDir: root,
  stdin: {
    contents: "import worker from './src/index.ts'; export default { fetch: worker.fetch };",
    resolveDir: root,
    sourcefile: 'pages-entry.ts',
    loader: 'ts',
  },
  outfile: join(output, '_worker.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
});

await writeFile(join(output, '_routes.json'), JSON.stringify({
  version: 1,
  include: ['/api/*'],
  exclude: [],
}, null, 2) + '\n');

// Pages CLI requires a conventionally named config in its working directory.
// Keep that generated config outside the directory uploaded as public assets.
const config = JSON.parse(await readFile(join(root, 'wrangler.pages.jsonc'), 'utf8'));
await mkdir(configOutput, { recursive: true });
await writeFile(join(configOutput, 'wrangler.json'), JSON.stringify({
  ...config,
  $schema: '../../node_modules/wrangler/config-schema.json',
  pages_build_output_dir: '../pages',
}, null, 2) + '\n');

await Promise.all(['index.html', 'app.js', '_headers', '_worker.js'].map(name => readFile(join(output, name))));
console.log('Pages package built in dist/pages: static assets plus a fetch-only API Worker.');
