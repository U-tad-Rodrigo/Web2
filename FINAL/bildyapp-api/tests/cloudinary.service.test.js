import { jest } from '@jest/globals';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// ── Mocks ─────────────────────────────────────────────────────────────────────
// jest.unstable_mockModule debe ir ANTES del dynamic import de cloudinary.service
// para que el módulo lea las versiones mockeadas de cloudinary y sharp.

const uploadStreamMock = jest.fn();

jest.unstable_mockModule('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: uploadStreamMock },
  },
}));

jest.unstable_mockModule('sharp', () => ({
  default: () => ({
    resize: () => ({
      webp: () => ({
        toBuffer: async () => Buffer.from('fake-webp-bytes'),
      }),
    }),
  }),
}));

// ── Configurar Cloudinary ANTES de importar el servicio ──────────────────────
// El servicio evalúa isConfigured() en cada llamada — basta con tener las env
// vars activas para que entre por la rama configurada.
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY    = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';

const { uploadImage, uploadBuffer } = await import('../src/services/cloudinary.service.js');

// Helper: el upload_stream real devuelve un writable. Aquí lo simulamos:
// .end(buf) dispara el callback (err, result) que pasó el llamante.
const makeFakeStream = (cb, opts) => ({
  end: (_buffer) =>
    setImmediate(() =>
      cb(null, {
        secure_url: `https://cdn.test/${opts.folder}/x.${opts.format ?? 'webp'}`,
      }),
    ),
});

describe('cloudinary.service (configured branch)', () => {
  let tmpFile;

  beforeAll(async () => {
    tmpFile = path.join(os.tmpdir(), `bildyapp-test-${Date.now()}.png`);
    await fs.writeFile(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  beforeEach(() => {
    uploadStreamMock.mockReset();
  });

  test('uploadImage optimiza con Sharp y sube a Cloudinary devolviendo secure_url', async () => {
    uploadStreamMock.mockImplementation((opts, cb) => makeFakeStream(cb, opts));

    const url = await uploadImage(tmpFile, 'signatures');

    expect(url).toBe('https://cdn.test/signatures/x.webp');
    expect(uploadStreamMock).toHaveBeenCalledTimes(1);
    const [opts] = uploadStreamMock.mock.calls[0];
    expect(opts.folder).toBe('signatures');
    expect(opts.resource_type).toBe('image');
  });

  test('uploadImage rechaza si Cloudinary devuelve error', async () => {
    // Recreamos el archivo que el test anterior pudo haber borrado (fs.unlink en éxito)
    await fs.writeFile(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    uploadStreamMock.mockImplementation((_opts, cb) => ({
      end: () => setImmediate(() => cb(new Error('cloudinary down'), null)),
    }));

    await expect(uploadImage(tmpFile, 'signatures')).rejects.toThrow('cloudinary down');
  });

  test('uploadBuffer sube buffer arbitrario como recurso raw con publicId y format', async () => {
    uploadStreamMock.mockImplementation((opts, cb) => makeFakeStream(cb, opts));

    const url = await uploadBuffer(Buffer.from('fake-pdf'), {
      folder:   'deliverynotes',
      publicId: 'albaran-123',
      format:   'pdf',
    });

    expect(url).toBe('https://cdn.test/deliverynotes/x.pdf');
    const [opts] = uploadStreamMock.mock.calls[0];
    expect(opts.resource_type).toBe('raw');
    expect(opts.public_id).toBe('albaran-123');
    expect(opts.format).toBe('pdf');
  });

  test('uploadBuffer rechaza si Cloudinary devuelve error', async () => {
    uploadStreamMock.mockImplementation((_opts, cb) => ({
      end: () => setImmediate(() => cb(new Error('upload failed'), null)),
    }));

    await expect(
      uploadBuffer(Buffer.from('x'), { folder: 'f', publicId: 'p', format: 'pdf' }),
    ).rejects.toThrow('upload failed');
  });
});
