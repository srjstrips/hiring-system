import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '@/config/logger';

let initialized = false;

function ensureInitialized(): boolean {
  if (initialized) return true;

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('Firebase Admin SDK not configured — push notifications disabled');
    return false;
  }

  if (getApps().length === 0) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  initialized = true;
  return true;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!ensureInitialized()) return;

  try {
    await getMessaging().send({
      token,
      notification: { title, body },
      data,
      android: { notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
      webpush: {
        notification: { icon: '/SRJ-FINAL-LOGO.png', badge: '/SRJ-FINAL-LOGO.png' },
      },
    });
  } catch (err: any) {
    logger.warn(`FCM send failed for token ${token.slice(0, 20)}…: ${err.message}`);
  }
}

export async function sendPushToMany(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await Promise.allSettled(tokens.map((t) => sendPushNotification(t, title, body, data)));
}
