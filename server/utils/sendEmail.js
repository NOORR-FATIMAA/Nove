const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

// Never throws - logs and swallows failures so the parent request always succeeds.
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const t = getTransporter();

    if (!t) {
      console.log('--- [dev email fallback] ---');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(text || html);
      console.log('----------------------------');
      return;
    }

    await t.sendMail({
      from: process.env.SMTP_FROM || 'Nove <hello.nove.pk@gmail.com>',
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('sendEmail failed:', err.message);
  }
};

module.exports = sendEmail;
