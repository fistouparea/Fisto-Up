/**
 * Saves the exact text of every AI prompt version to eval/prompts/<version>.txt and records its fingerprint in
 * src/services/ai/prompts.lock.json. Refuses when a prompt's text changed but its version did not.
 *   npm run prompts:snapshot
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_NAMES, PROMPTS, promptFingerprint } from '../services/ai/promptVersions.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '../..');
const lockPath = path.join(backendRoot, 'src/services/ai/prompts.lock.json');
const promptDir = path.resolve(backendRoot, '../eval/prompts');

type Lock = Record<string, { version: string; fingerprint: string }>;
const lock: Lock = JSON.parse(await readFile(lockPath, 'utf8').catch(() => '{}')) as Lock;

await mkdir(promptDir, { recursive: true });
let problems = 0;
for (const name of PROMPT_NAMES) {
  const { version } = PROMPTS[name];
  const fingerprint = promptFingerprint(name);
  const locked = lock[name];
  if (locked && locked.version === version && locked.fingerprint !== fingerprint) {
    console.error(`✗ ${name}: text changed but version is still "${version}". Bump the version in promptVersions.ts.`);
    problems += 1;
    continue;
  }
  await writeFile(path.join(promptDir, `${version}.txt`), `# ${name} · ${version} · ${fingerprint}\n\n${PROMPTS[name].text()}\n`);
  lock[name] = { version, fingerprint };
  console.log(`✓ ${name}: ${version} (${fingerprint})`);
}
if (problems === 0) await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
process.exit(problems === 0 ? 0 : 1);
