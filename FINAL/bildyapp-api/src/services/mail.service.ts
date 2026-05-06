import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';

interface InvitePayload {
  invitedBy:        string;
  tempPassword:     string;
  verificationCode: string;
}

const createTransport = (): Transporter | null => {
  const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM } = process.env;

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS) return null;

  return nodemailer.createTransport({
    host:   MAIL_HOST,
    port:   parseInt(MAIL_PORT || '587', 10),
    secure: MAIL_PORT === '465',
    auth:   { user: MAIL_USER, pass: MAIL_PASS },
    from:   MAIL_FROM || MAIL_USER,
  } as SendMailOptions);
};

const transporter = createTransport();

const send = async (options: SendMailOptions): Promise<void> => {
  if (!transporter) {
    console.warn('[mail] MAIL_* vars not configured — skipping email send');
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    ...options,
  });
};

export const sendVerificationEmail = async (to: string, code: string): Promise<void> => {
  await send({
    to,
    subject: 'BildyApp — Verifica tu email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">Verifica tu cuenta en BildyApp</h2>
        <p>Usa el siguiente código para verificar tu dirección de email:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;
                    padding:24px;background:#f1f5f9;border-radius:8px;margin:24px 0">
          ${code}
        </div>
        <p style="color:#64748b;font-size:13px">
          El código expira cuando completes la verificación.<br>
          Tienes 3 intentos máximo.
        </p>
      </div>
    `,
  });
};

export const sendInviteEmail = async (to: string, { invitedBy, tempPassword, verificationCode }: InvitePayload): Promise<void> => {
  await send({
    to,
    subject: 'BildyApp — Has sido invitado a una empresa',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2563eb">Has sido invitado a BildyApp</h2>
        <p><strong>${invitedBy}</strong> te ha añadido a su empresa en BildyApp.</p>
        <p>Tu contraseña temporal es:</p>
        <div style="font-family:monospace;font-size:18px;padding:16px;background:#f1f5f9;
                    border-radius:8px;margin:16px 0">
          ${tempPassword}
        </div>
        <p>Tu código de verificación de email:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                    padding:20px;background:#f1f5f9;border-radius:8px;margin:16px 0">
          ${verificationCode}
        </div>
        <p style="color:#64748b;font-size:13px">
          Por seguridad, cambia tu contraseña tras el primer acceso.
        </p>
      </div>
    `,
  });
};
