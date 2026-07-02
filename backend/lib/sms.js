/* SMS sender with a safe dev fallback.

   PRODUCTION: set the Twilio env vars and messages are sent for real:
     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM  (a Twilio phone number/sender ID)

   DEV (nothing configured): no SMS is sent. The message is logged and sendSms()
   returns { dev: true, previewText } so the API can surface the code on screen. */

/* Algerian local numbers are stored as 05.., 06.., 07.. — Twilio needs E.164 (+213…). */
function toE164(phone) {
  const p = String(phone || '').replace(/[\s.-]/g, '');
  if (p.startsWith('+')) return p;
  if (p.startsWith('00')) return '+' + p.slice(2);
  if (p.startsWith('0')) return '+213' + p.slice(1); // Algeria
  return '+' + p;
}

function twilioConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);
}

async function sendSms({ to, body }) {
  if (!twilioConfigured()) {
    console.log(`\n📱 [DEV SMS] to=${to}\n   ${body}\n`);
    return { dev: true, previewText: body };
  }
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const params = new URLSearchParams({ To: toE164(to), From: TWILIO_FROM, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twilio ${res.status}: ${detail}`);
  }
  return { dev: false };
}

const isDevSms = () => !twilioConfigured();

module.exports = { sendSms, isDevSms, toE164 };
