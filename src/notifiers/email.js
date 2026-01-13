const nodemailer = require('nodemailer');

function readEnv(name, fallback) {
  const val = process.env[name];
  if (typeof val === 'string' && val.trim()) return val.trim();
  if (fallback !== undefined) return fallback;
  return '';
}

function parseBool(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const v = value.trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

async function notifyEmail({ config, title, contentText }) {
  const channel = config.channels.email || {};

  const host = readEnv(channel.hostEnv || 'EMAIL_HOST', channel.host);
  const portRaw = readEnv(channel.portEnv || 'EMAIL_PORT', channel.port);
  const secureRaw = readEnv(channel.secureEnv || 'EMAIL_SECURE', channel.secure);
  const user = readEnv(channel.userEnv || 'EMAIL_USER', channel.user);
  const pass = readEnv(channel.passEnv || 'EMAIL_PASS', channel.pass);
  const from = readEnv(channel.fromEnv || 'EMAIL_FROM', channel.from || user);
  const to = readEnv(channel.toEnv || 'EMAIL_TO', channel.to);

  const port = Number(portRaw) || 465;
  const secure = parseBool(secureRaw, port === 465);

  if (!host || !user || !pass || !from || !to) {
    return { ok: false, error: '邮箱参数未配置完整（host/user/pass/from/to）' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject: title,
      text: contentText
    });

    return { ok: true, messageId: info.messageId || '' };
  } catch (error) {
    return { ok: false, error: error && error.message ? error.message : String(error) };
  }
}

module.exports = {
  notifyEmail
};

