import admin from 'firebase-admin';

export async function sendPushNotification(token, { title, body, data = {} }) {
  if (!token) return { ok: false, error: 'missing_token' };
  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    const id = await admin.messaging().send(message);
    return { ok: true, id };
  } catch (err) {
    console.error('Push send error:', err?.message || err);
    return { ok: false, error: err?.message || 'push_failed' };
  }
}

export async function sendPushToUsers(users = [], payload) {
  const results = [];
  for (const u of users) {
    const tok = u?.pushToken || (typeof u === 'string' ? u : null);
    if (tok) results.push(await sendPushNotification(tok, payload));
  }
  return results;
}