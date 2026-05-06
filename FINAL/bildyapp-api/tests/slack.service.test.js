import { jest } from '@jest/globals';
import { slackError } from '../src/services/slack.service.js';

describe('slack.service', () => {
  const ORIGINAL_ENV = process.env.SLACK_WEBHOOK_URL;
  const ORIGINAL_FETCH = globalThis.fetch;

  afterEach(() => {
    process.env.SLACK_WEBHOOK_URL = ORIGINAL_ENV;
    globalThis.fetch = ORIGINAL_FETCH;
  });

  test('no llama a fetch si SLACK_WEBHOOK_URL no está configurada', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy;

    await slackError({ method: 'GET', path: '/x', status: 500, message: 'boom', stack: 'st' });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('hace POST con payload de Slack cuando hay webhook configurado', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/xxx';
    const fetchSpy = jest.fn(async () => ({ ok: true }));
    globalThis.fetch = fetchSpy;

    await slackError({
      method: 'POST',
      path: '/api/test',
      status: 503,
      message: 'service unavailable',
      stack: 'Error\n  at test',
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://hooks.slack.test/xxx');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(init.body);
    expect(body.text).toMatch(/503/);
    expect(body.attachments[0].fields.find((f) => f.title === 'Ruta').value).toContain('/api/test');
    expect(body.attachments[0].fields.find((f) => f.title === 'Status').value).toBe('503');
  });

  test('omite el field Stack si stack es undefined', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/xxx';
    const fetchSpy = jest.fn(async () => ({ ok: true }));
    globalThis.fetch = fetchSpy;

    await slackError({ method: 'GET', path: '/x', status: 500, message: 'no stack here' });

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.attachments[0].fields.some((f) => f.title === 'Stack')).toBe(false);
  });

  test('traga errores del fetch sin propagarlos (logging secundario)', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/xxx';
    globalThis.fetch = async () => { throw new Error('network down'); };

    await expect(
      slackError({ method: 'GET', path: '/x', status: 500, message: 'm' })
    ).resolves.toBeUndefined();
  });
});
