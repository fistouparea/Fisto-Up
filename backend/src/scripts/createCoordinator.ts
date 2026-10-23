/**
 * Creates a coordinator (admin) account. Coordinators cannot sign up in the app.
 *
 *   npm run create-coordinator -- --phone 9876543210 --name "Sunita Sharma"
 *   (Docker: docker compose exec backend node dist/scripts/createCoordinator.js --phone ... --name ...)
 *
 * The 4-digit PIN is asked for without showing it, or read from COORDINATOR_PIN.
 */
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { personNameSchema, phoneSchema, pinSchema } from '../modules/auth/auth.types.js';
import { PinCredentials } from '../modules/auth/credentials.js';
import { connectFromEnv, parseCliArgs, promptHidden } from './cli.js';

async function main(): Promise<void> {
  const args = parseCliArgs({ phone: { type: 'string' }, name: { type: 'string' } });
  const phone = phoneSchema.safeParse(args.phone);
  const name = personNameSchema.safeParse(args.name);
  if (!phone.success || !name.success) {
    console.error('Usage: npm run create-coordinator -- --phone 9876543210 --name "Full Name"');
    process.exitCode = 1;
    return;
  }

  const pinInput = process.env.COORDINATOR_PIN ?? (await promptHidden('4-digit PIN: '));
  const pin = pinSchema.safeParse(pinInput);
  if (!pin.success) {
    console.error('The PIN must be exactly 4 digits.');
    process.exitCode = 1;
    return;
  }

  await connectFromEnv();
  try {
    await new AuthService(new PinCredentials()).createAccount({
      phone: phone.data,
      pin: pin.data,
      name: name.data,
      role: 'coordinator',
    });
    console.log(`Coordinator ${name.data} (${phone.data}) created. Log in at #/login.`);
  } catch (error) {
    if (error instanceof AppError && (error.code === 'PHONE_TAKEN' || error.code === 'WEAK_PIN')) {
      console.error(error.code === 'PHONE_TAKEN' ? 'This phone number already has an account.' : 'This PIN is too easy to guess.');
      process.exitCode = 1;
    } else {
      throw error;
    }
  } finally {
    await mongoose.disconnect();
  }
}

await main();
