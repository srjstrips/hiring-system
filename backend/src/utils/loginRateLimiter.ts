import { TooManyRequestsError } from './errors';

const MAX_EMAIL_ATTEMPTS = 5;
const EMAIL_LOCKOUT_MS = 60 * 60 * 1000; // 1 hour

const MAX_IP_ATTEMPTS = 20;
const IP_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

const emailAttempts = new Map<string, AttemptRecord>();
const ipAttempts = new Map<string, AttemptRecord>();

function getOrCreate(store: Map<string, AttemptRecord>, key: string): AttemptRecord {
  let rec = store.get(key);
  if (!rec) {
    rec = { count: 0, lockedUntil: null };
    store.set(key, rec);
  }
  return rec;
}

/** Returns null if not locked, or the unlock Date if currently locked. Clears expired locks. */
function checkLocked(rec: AttemptRecord): Date | null {
  if (rec.lockedUntil === null) return null;
  const now = Date.now();
  if (now < rec.lockedUntil) return new Date(rec.lockedUntil);
  // Lock expired — reset
  rec.count = 0;
  rec.lockedUntil = null;
  return null;
}

function minutesLeft(until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
}

/**
 * Throws TooManyRequestsError if the email or IP is currently locked out.
 * Call BEFORE touching the database.
 */
export function checkLoginAllowed(email: string, ip: string): void {
  const ipRec = getOrCreate(ipAttempts, `i:${ip}`);
  const ipLock = checkLocked(ipRec);
  if (ipLock) {
    const m = minutesLeft(ipLock);
    throw new TooManyRequestsError(
      `Too many login attempts from this device. Please try again in ${m} minute${m !== 1 ? 's' : ''}.`
    );
  }

  const emailRec = getOrCreate(emailAttempts, `e:${email.toLowerCase()}`);
  const emailLock = checkLocked(emailRec);
  if (emailLock) {
    const m = minutesLeft(emailLock);
    throw new TooManyRequestsError(
      `Too many failed login attempts. Please try again in ${m} minute${m !== 1 ? 's' : ''}.`
    );
  }
}

/**
 * Increments the failed-attempt counters for both email and IP.
 * Triggers a lockout when the respective threshold is reached.
 * Call AFTER a failed credential check.
 */
export function recordFailedAttempt(email: string, ip: string): void {
  const now = Date.now();

  const emailKey = `e:${email.toLowerCase()}`;
  const emailRec = getOrCreate(emailAttempts, emailKey);
  if (!emailRec.lockedUntil || now >= emailRec.lockedUntil) {
    emailRec.count += 1;
    if (emailRec.count >= MAX_EMAIL_ATTEMPTS) {
      emailRec.lockedUntil = now + EMAIL_LOCKOUT_MS;
    }
  }

  const ipKey = `i:${ip}`;
  const ipRec = getOrCreate(ipAttempts, ipKey);
  if (!ipRec.lockedUntil || now >= ipRec.lockedUntil) {
    ipRec.count += 1;
    if (ipRec.count >= MAX_IP_ATTEMPTS) {
      ipRec.lockedUntil = now + IP_LOCKOUT_MS;
    }
  }
}

/**
 * Clears the email-based failed-attempt counter after a successful login.
 * IP counter is intentionally NOT reset to deter rapid cycling across accounts.
 */
export function resetEmailAttempts(email: string): void {
  emailAttempts.delete(`e:${email.toLowerCase()}`);
}
