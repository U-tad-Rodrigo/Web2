1. `src/controllers/deliverynote.controller.js:124` — 
`if (deliveryNote.signed) return next(AppError.badRequest('El albarán ya está firmado', 'ALREADY_SIGNED'))` 
devuelve 400. Pero si el cliente reintenta porque no recibió la respuesta 200 original, 
¿qué información le falta para distinguir "ya firmado por ti en este mismo intento" de "ya firmado por otro usuario"? 
¿Qué código HTTP sería más correcto en cada caso?

2. `src/controllers/deliverynote.controller.js:142-156` 
— La subida del PDF a Cloudinary está en un try/catch que silencia el error. 
Si el cliente reintenta y el albarán ya tiene `signed=true` pero `pdfUrl=null`, 
¿cómo garantizas que el PDF se regenere sin duplicar la firma ni violar la idempotencia?

3. `src/middleware/validate-id.ts`
— El middleware valida ObjectId. Si implementas un `IdempotencyLog` con clave UUID v4, 
¿dónde y cómo debes leer esa clave para evitar una condición de carrera entre dos reintentos simultáneos?

4. Hipotético: si un albarán pudiera ser firmado por cliente externo (link público con JWT corto)
y por admin, ¿qué cambios harías en el modelo y en `signDeliveryNote` 
para soportar firmas múltiples ordenadas sin romper la idempotencia?

5. Contraste: Stripe usa `Idempotency-Key` en cabecera HTTP. 
6. Tu implementación actual usa `signed: true` como proxy de idempotencia. 
¿Ventajas e inconvenientes de cada enfoque ante fallos parciales?