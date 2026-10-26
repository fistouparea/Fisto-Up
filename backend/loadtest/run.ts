/**
 * Load test of the main endpoints at 100 and 500 concurrent connections (AI mocked).
 *   npm run loadtest                       # 15 s per scenario, results in loadtest/results/<date>.md
 *   DURATION=30 AI_DELAY_MS=3000 npm run loadtest
 *   LEVELS=1,50 ONLY=dashboard DURATION=5 npm run loadtest
 * Starts loadtest/server.ts in its own process, so the load generator does not steal the server's CPU.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import autocannon, { type Request, type Result } from 'autocannon';
import { JPEG_BYTES } from '../tests/helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DURATION = Number(process.env.DURATION ?? 15);
/** LEVELS=1,10 to measure without load; ONLY=dashboard to run matching scenarios only. */
const LEVELS = (process.env.LEVELS ?? '100,500').split(',').map(Number);
const ONLY = process.env.ONLY;

const server = spawn(process.execPath, ['--import', 'tsx', path.join(here, 'server.ts')], {
  env: { ...process.env, NODE_ENV: 'production', LOG_LEVEL: 'silent' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const { port, deviceIds } = await new Promise<{ port: number; deviceIds: string[] }>((resolve, reject) => {
  server.stdout.on('data', (chunk: Buffer) => {
    const line = chunk.toString().split('\n').find((text) => text.startsWith('READY '));
    if (line) {
      const [, portText, ...ids] = line.trim().split(' ');
      resolve({ port: Number(portText), deviceIds: ids });
    }
  });
  server.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
});

let ipCounter = 0;
/** A different client IP per request (Indian mobile users each have their own), so per-IP limits act realistically. */
const asNewClient = (request: Request): Request => {
  ipCounter += 1;
  return { ...request, headers: { ...request.headers, 'x-forwarded-for': `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}` } };
};
const randomDevice = () => deviceIds[Math.floor(Math.random() * deviceIds.length)] ?? '';

const boundary = 'agriaiLoadTest';
const diagnoseBody = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="crop"\r\n\r\nbajra\r\n--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
  JPEG_BYTES,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

const SCENARIOS: { name: string; request: () => Request }[] = [
  { name: 'GET /health', request: () => ({ method: 'GET', path: '/health' }) },
  { name: 'GET /api/market/listings (browse)', request: () => ({ method: 'GET', path: '/api/market/listings?sort=newest' }) },
  { name: 'GET /api/dashboard (farmer home)', request: () => ({ method: 'GET', path: `/api/dashboard?deviceId=${randomDevice()}` }) },
  { name: 'GET /api/history (मेरी जाँच)', request: () => ({ method: 'GET', path: `/api/history?deviceId=${randomDevice()}` }) },
  {
    name: `POST /api/diagnose (AI mocked, ${process.env.AI_DELAY_MS ?? 1500} ms)`,
    request: () => ({ method: 'POST', path: '/api/diagnose', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body: diagnoseBody }),
  },
];

interface Row {
  scenario: string;
  connections: number;
  rps: number;
  p50: number;
  p97_5: number;
  p99: number;
  max: number;
  ok: number;
  errors: number;
  non2xx: number;
}

const rows: Row[] = [];
for (const scenario of SCENARIOS.filter((item) => !ONLY || item.name.includes(ONLY))) {
  for (const connections of LEVELS) {
    const result: Result = await autocannon({
      url: `http://127.0.0.1:${port}`,
      connections,
      duration: DURATION,
      timeout: 30,
      requests: [{ setupRequest: () => asNewClient(scenario.request()) }],
    });
    const row: Row = {
      scenario: scenario.name,
      connections,
      rps: Math.round(result.requests.average),
      p50: result.latency.p50,
      p97_5: result.latency.p97_5,
      p99: result.latency.p99,
      max: result.latency.max,
      ok: result['2xx'],
      errors: result.errors + result.timeouts,
      non2xx: result.non2xx,
    };
    rows.push(row);
    console.log(`${row.scenario.padEnd(44)} c=${String(connections).padStart(3)}  ${String(row.rps).padStart(6)} req/s  p50 ${row.p50} ms  p99 ${row.p99} ms  non-2xx ${row.non2xx}  errors ${row.errors}`);
  }
}
server.kill('SIGTERM');

const machine = `${os.cpus()[0]?.model ?? 'cpu'} × ${os.cpus().length}, ${Math.round(os.totalmem() / 2 ** 30)} GB RAM, Node ${process.version}`;
const table = [
  `# Load test · ${new Date().toISOString()}`,
  '',
  `Machine: ${machine}. ${DURATION} s per run, server in its own process (NODE_ENV=production, in-memory MongoDB replica set).`,
  '',
  '| Endpoint | Connections | Req/s | p50 ms | p97.5 ms | p99 ms | max ms | 2xx | non-2xx | errors/timeouts |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map((row) => `| ${row.scenario} | ${row.connections} | ${row.rps} | ${row.p50} | ${row.p97_5} | ${row.p99} | ${row.max} | ${row.ok} | ${row.non2xx} | ${row.errors} |`),
  '',
].join('\n');
const outDir = path.join(here, 'results');
await mkdir(outDir, { recursive: true });
const file = path.join(outDir, `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.md`);
await writeFile(file, table);
console.log(`\nResults: ${file}`);
process.exit(0);
