import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ── Carpeta de destino ────────────────────────────────────────────────────────
const UPLOADS_DIR = 'uploads';

// Crea la carpeta si no existe (sincrono al inicio, no en cada petición)
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Storage: guarda en disco con nombre único ─────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `logo-${Date.now()}${ext}`;
    cb(null, name);
  }
});

// ── Filtro: solo imágenes ─────────────────────────────────────────────────────
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

// ── Instancia de Multer ───────────────────────────────────────────────────────
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024   // 5 MB
  }
});

