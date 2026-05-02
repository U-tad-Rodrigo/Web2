const notifySlack = async (payload) => {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // No propagar errores del webhook — logging secundario
  }
};

export const slackError = async ({ method, path, status, message, stack }) => {
  await notifySlack({
    text: `🚨 *Error ${status} en BildyApp API*`,
    attachments: [
      {
        color: 'danger',
        fields: [
          { title: 'Ruta',      value: `\`${method} ${path}\``, short: true },
          { title: 'Status',    value: String(status),          short: true },
          { title: 'Timestamp', value: new Date().toISOString(), short: true },
          { title: 'Mensaje',   value: message,                 short: false },
          ...(stack
            ? [{ title: 'Stack', value: `\`\`\`${stack.slice(0, 500)}\`\`\``, short: false }]
            : []),
        ],
      },
    ],
  });
};
