import fs from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import type { Request, Response, NextFunction } from 'express';
import 'multer';
import { AppError } from '../utils/AppError.js';

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const verifyImageMime = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) return next();
  try {
    const detected = await fileTypeFromFile(file.path);
    if (!detected || !IMAGE_MIMES.has(detected.mime)) {
      await fs.unlink(file.path).catch(() => {});
      return next(AppError.badRequest('El contenido del archivo no es una imagen válida', 'INVALID_FILE_CONTENT'));
    }
    file.mimetype = detected.mime;
    next();
  } catch (err) {
    next(err);
  }
};
