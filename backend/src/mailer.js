const nodemailer = require('nodemailer');

function setting(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function mailConfig() {
  const host = setting('SMTP_HOST');
  const user = setting('SMTP_USER');
  const pass = setting('SMTP_PASS');
  const portText = setting('SMTP_PORT') || '2525';
  const port = Number(portText);
  const missing = [];

  if (!host) {
    missing.push('SMTP_HOST');
  }

  if (!user) {
    missing.push('SMTP_USER');
  }

  if (!pass) {
    missing.push('SMTP_PASS');
  }

  if (missing.length > 0) {
    throw new Error(`Mailtrap SMTP settings are missing. Add ${missing.join(', ')} to backend/.env.`);
  }

  if (!Number.isInteger(port) || port < 1) {
    throw new Error('SMTP_PORT must be a port number such as 2525.');
  }

  return {
    host,
    port,
    user,
    pass,
    from: setting('MAIL_FROM') || 'LeadFlow <noreply@leadflow.test>',
  };
}

function mailTransport() {
  const config = mailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    auth: { user: config.user, pass: config.pass },
  });
}

function sendMail({ to, subject, text }) {
  const config = mailConfig();

  return mailTransport().sendMail({
    from: config.from,
    to,
    subject,
    text,
  });
}

module.exports = {
  mailConfig,
  sendMail,
};
