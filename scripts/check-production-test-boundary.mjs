import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const forbiddenMarkers = ['render_game_to_text', 'automationStateVersion', 'active-character'];
const scannedExtensions = new Set(['.html', '.js', '.mjs']);

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path));
    else if (scannedExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const matches = [];
for (const file of await filesUnder(distDirectory)) {
  const contents = await readFile(file, 'utf8');
  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) matches.push(`${file}: ${marker}`);
  }
}

if (matches.length > 0) {
  console.error('Production build contains test-only automation markers:');
  for (const match of matches) console.error(`- ${match}`);
  process.exitCode = 1;
} else {
  console.log('Production boundary passed: no test-only automation markers found.');
}
