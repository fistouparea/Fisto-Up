import mongoose from 'mongoose';
import { parseArgs } from 'node:util';
import { z } from 'zod';

/** Small helpers shared by the server-side scripts (create-coordinator, seed). */

export function parseCliArgs<T extends Record<string, { type: 'string' | 'boolean' }>>(options: T) {
  return parseArgs({ options, allowPositionals: false }).values;
}

/** Connects with MONGO_URI from .env (the scripts never use another database). */
export async function connectFromEnv(): Promise<void> {
  const uri = z.string().trim().min(1, 'MONGO_URI is not set in .env').parse(process.env.MONGO_URI);
  mongoose.set('bufferCommands', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5_000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

/** Reads a line without showing what is typed (for PINs). Falls back to a normal read when not a terminal. */
export async function promptHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(question);
  if (!stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8').split('\n')[0]?.trim() ?? '';
  }
  return new Promise((resolve) => {
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (key: string) => {
      if (key === '\r' || key === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (key === '\u0003') {
        process.exit(130); // Ctrl+C
      } else if (key === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    };
    stdin.on('data', onData);
  });
}
