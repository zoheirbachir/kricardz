/* Email sender with a safe dev fallback.

   PRODUCTION: set SMTP env vars and emails are sent for real:
     SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (any SMTP provider — Resend, SendGrid…)
   GMAIL shortcut: set GMAIL_USER + GMAIL_PASS (a Gmail "app password") instead.

   DEV (no SMTP configured): nothing is sent. The message is logged to the console and
   sendMail() returns { dev: true, previewText } so the API can surface the link on screen. */

let transporter = null;
let mode = 'dev';

function getTransporter() {
  if (transporter !== null) return transporter;
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch { return (transporter = false); }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, GMAIL_USER, GMAIL_PASS } = process.env;
  if (GMAIL_USER && GMAIL_PASS) {
    mode = 'gmail';
    transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
  } else if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    mode = 'smtp';
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  } else {
    transporter = false; // dev mode
  }
  return transporter;
}

const FROM = process.env.MAIL_FROM || 'KriCar <no-reply@kricar.dz>';

async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.log(`\n📧 [DEV EMAIL] to=${to}\n   subject=${subject}\n   ${text || ''}\n`);
    return { dev: true, previewText: text };
  }
  await tx.sendMail({ from: FROM, to, subject, html, text });
  return { dev: false, mode };
}

const isDevMail = () => !getTransporter();

module.exports = { sendMail, isDevMail };
