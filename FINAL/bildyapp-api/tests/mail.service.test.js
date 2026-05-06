import { jest } from '@jest/globals';

// ── Mock de nodemailer ANTES de importar el servicio ─────────────────────────
const sendMailMock = jest.fn(async () => ({ messageId: 'fake-id' }));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
  },
}));

// Setea las MAIL_* ANTES del dynamic import para entrar en la rama "configurada"
process.env.MAIL_HOST = 'smtp.test';
process.env.MAIL_PORT = '465';
process.env.MAIL_USER = 'user@test';
process.env.MAIL_PASS = 'secret';
process.env.MAIL_FROM = 'BildyApp <user@test>';

const { sendVerificationEmail, sendInviteEmail } = await import(
  '../src/services/mail.service.js'
);

describe('mail.service (configured branch)', () => {
  beforeEach(() => sendMailMock.mockClear());

  test('sendVerificationEmail llama a transporter.sendMail con el código', async () => {
    await sendVerificationEmail('alice@test.com', '123456');

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const [opts] = sendMailMock.mock.calls[0];
    expect(opts.to).toBe('alice@test.com');
    expect(opts.subject).toMatch(/Verifica/i);
    expect(opts.html).toContain('123456');
    expect(opts.from).toBe('BildyApp <user@test>');
  });

  test('sendInviteEmail incluye invitedBy, tempPassword y verificationCode', async () => {
    await sendInviteEmail('bob@test.com', {
      invitedBy: 'admin@test.com',
      tempPassword: 'Tmp-XYZ-1!',
      verificationCode: '987654',
    });

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const [opts] = sendMailMock.mock.calls[0];
    expect(opts.to).toBe('bob@test.com');
    expect(opts.html).toContain('admin@test.com');
    expect(opts.html).toContain('Tmp-XYZ-1!');
    expect(opts.html).toContain('987654');
  });
});
