import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import fs from 'node:fs/promises';

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY    &&
     process.env.CLOUDINARY_API_SECRET);

if (isConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Sube una imagen al cloud (Cloudinary) optimizándola con Sharp.
 * Si Cloudinary no está configurado devuelve null → el controller usa la URL local.
 *
 * @param {string} localPath  Ruta en disco (guardada por Multer)
 * @param {string} folder     Carpeta en Cloudinary ('logos' | 'signatures')
 * @returns {Promise<string|null>}  secure_url de Cloudinary o null
 */
export const uploadImage = async (localPath, folder = 'bildyapp') => {
  if (!isConfigured()) return null;

  // Sharp: optimiza a WebP, máx 800px ancho, calidad 80
  const optimized = await sharp(localPath)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', format: 'webp' },
      (err, result) => {
        if (err) return reject(err);
        // Elimina el archivo temporal del disco tras subida exitosa
        fs.unlink(localPath).catch(() => {});
        resolve(result.secure_url);
      }
    );
    stream.end(optimized);
  });
};

/**
 * Sube un buffer arbitrario (PDF, etc.) a Cloudinary como recurso `raw`.
 * Devuelve null si Cloudinary no está configurado.
 *
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {string} opts.folder       Carpeta en Cloudinary
 * @param {string} opts.publicId     Identificador del recurso (sin extensión)
 * @param {string} [opts.format]     Extensión final (e.g. 'pdf')
 * @returns {Promise<string|null>}   secure_url o null
 */
export const uploadBuffer = async (buffer, { folder, publicId, format = 'pdf' }) => {
  if (!isConfigured()) return null;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'raw', public_id: publicId, format },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};
