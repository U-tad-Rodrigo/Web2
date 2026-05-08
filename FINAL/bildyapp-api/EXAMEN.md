1. `src/controllers/deliverynote.controller.js:124` —
`if (deliveryNote.signed) return next(AppError.badRequest('El albarán ya está firmado', 'ALREADY_SIGNED'))`
devuelve 400. Pero si el cliente reintenta porque no recibió la respuesta 200 original,
¿qué información le falta para distinguir "ya firmado por ti en este mismo intento" de "ya firmado por otro usuario"?
¿Qué código HTTP sería más correcto en cada caso?

Principalmente faltaría el signedBy (con el userId que ejecutó la firma original). La cabecera de Indempotency-Key del request
original (en caso de que aplique) para que se detecten los reintentos propios. Vendría también bien un signedAt
(para ver la hora a la que se hizo la firma). 

Para mismo cliente con mismo Indempotency-Key: 200 OK
Para mismo cliente sin Indempotency-Key: 409 Conflict
Distinto cliente: 409 Conflict.

2. `src/controllers/deliverynote.controller.js:142-156`
— La subida del PDF a Cloudinary está en un try/catch que silencia el error.
Si el cliente reintenta y el albarán ya tiene `signed=true` pero `pdfUrl=null`,
¿cómo garantizas que el PDF se regenere sin duplicar la firma ni violar la idempotencia?

La idempotencia HTTP no regenera el PDF, solo asegura que el reintento con la misma
Idempotency-Key devuelve la misma respuesta de antes (con el pdfUrl=null igual). Eso evita el doble
upload de la firma, pero el PDF sigue sin estar.

Lo mejor sería separar la firma (atómica, idempotente vía cabecera) de la generación del PDF
(idempotente por estado: solo regenera si signed=true y pdfUrl=null).

3. `src/middleware/validate-id.ts`
— El middleware valida ObjectId. Si implementas un `IdempotencyLog` con clave UUID v4,
¿dónde y cómo debes leer esa clave para evitar una condición de carrera entre dos reintentos simultáneos?

La cabecera Idempotency-Key no va en el path, así que validate-id.ts no aplica aquí. La tenemos que leer desde
desde req.headers['idempotency-key'] y se valida con el regex UUID v4 directamente en el controller.

Para evitar la carrera entre dos reintentos simultáneos: se hace un índice único en key + IdempotencyLog.create()
con captura del error 11000 (DuplicateKey). Mongo serializa los inserts sobre el índice único, solo
un request gana, el otro re-lee el documento existente y devuelve el resultado cacheado (o 409 si
todavía está pending).

4. Hipotético: si un albarán pudiera ser firmado por cliente externo (link público con JWT corto)
y por admin, ¿qué cambios harías en el modelo y en `signDeliveryNote`
para soportar firmas múltiples ordenadas sin romper la idempotencia?

Modelo: sustituiría signed: Boolean por un array signatures: [{role, signedBy, signedAt,
signatureUrl, step}]. El estado firmado completo pasa a ser: fullySigned = signatures.length === requiredSteps.

signDeliveryNote: determinaría el step según el scope del JWT (cliente externo vs admin),
validaría la secuencia (no se puede firmar el step 2 si el 1 está pendiente), validaría la no-duplicación
del step, y hacer un $push atómico al array.

La Idempotency-Key sigue siendo por request, cada firmante usa su propia key,
no hay colisión entre cliente y admin. El guard de "step ya firmado" actúa como fallback de
seguridad si alguien firma sin enviar key.

5. Contraste: Stripe usa `Idempotency-Key` en cabecera HTTP.
Tu implementación actual usa `signed: true` como proxy de idempotencia.
¿Ventajas e inconvenientes de cada enfoque ante fallos parciales?

Idempotency-Key: controla la deduplicación a nivel del transporte, devuelve la respuesta
exacta del primer intento y funciona ante fallos parciales. 
Lo malo es que tiene un coste mayor en colección extra + TTL + manejo de race.

signed true: Es más simple. Pero no distingue reintento del cliente vs colisión real, 
devuelve 400 cuando debería ser 409, y el cliente pierde la respuesta
original en el reintento. Además se podría dar el caso que 2 requests pueden ver signed:false simultáneamente 
y subir la firma dos veces a Cloudinary antes de que el primero haga save().

En realidad son ortogonales: signed:true protege el recurso (un albarán no se firma dos veces) y la
Idempotency-Key protege la operación HTTP (un request idéntico no se procesa dos veces). En esta
entrega conviven los dos.



## Proceso

Empecé leyendo el endpoint signDeliveryNote (líneas 118-163) y viendo el problema de raíz: el flag
signed:true no es idempotencia HTTP, es un guard de estado del recurso. Si el cliente reintenta
porque se le cayó la red, recibe un 400 ALREADY_SIGNED y pierde la respuesta original (signatureUrl,
signedAt, pdfUrl). Eso me confirmó que la solución no era tocar el flag, sino añadir una capa nueva
de deduplicación a nivel de transporte.

Antes de tocar código dejé el plan por escrito: qué crear (un modelo IdempotencyLog con índice único
en key y TTL 24h), qué modificar (signDeliveryNote y el test del albarán), y qué NO tocar
(validate-id, verify-mime, modelo DeliveryNote — la idempotencia es ortogonal al dominio). Decidí
meter toda la lógica inline en el controller en vez de hacer un middleware genérico porque para un
único endpoint solo añade indirección sin aportar nada.

La decisión más interesante fue cómo evitar el doble upload a Cloudinary cuando llegan dos reintentos
simultáneos. La primera idea era lookup + sign + insert al final, pero eso permite que ambos requests
pasen el lookup, ambos suban la firma, y solo el insert final detecte la colisión — exactamente el
problema que quería evitar. Cambié al patrón placeholder-first: reservar la clave con insertOne ANTES
de subir nada (statusCode=0 como marcador de pending). El que pierde la carrera del índice único
recibe el error 11000, re-lee el log y devuelve el resultado cacheado si ya está completo, o 409 si
todavía está pending.

Detalles que tuve que ajustar mientras implementaba: cleanup del req.file con fs.unlink en los cache
hits (multer ya escribió el archivo a disco antes de que mi controller pueda decidir; si no lo borro
se acumulan firmas huérfanas en uploads/), y deleteOne de la reserva en el catch general para que un
fallo no controlado no atrape al cliente en un 409 permanente.

Lo que dejé fuera a propósito:
- Middleware genérico de idempotencia: overkill para un solo endpoint.
- Scoping por usuario o endpoint en la clave: el UUID v4 evita colisiones reales y el criterio pedía
  explícitamente "índice único en key", no compound.
- Regeneración del PDF como endpoint aparte: lo identifico en la respuesta a la pregunta 2 como
  mejora arquitectónica, pero queda fuera del scope del examen.
- Cachear errores 4xx (Stripe lo hace): el criterio dice "el resultado de la primera firma" — solo
  éxitos.

Para los tests opté por la prueba más robusta sin mocks: comparar signedAt y signatureUrl entre el
primer request y el reintento. Si la idempotencia fallara y el reintento re-ejecutara el flujo,
signedAt cambiaría (es new Date()) y el test fallaría inmediatamente. Verde = el cache funcionó. El
test concurrente usa Promise.all + assert sobre count del log: el outcome válido es [200, 200] (uno
gana, otro lee cached) o [200, 409] (uno gana, otro pilla la reserva pending) — en cualquier caso,
count === 1.

Los commits los partí en tres para no repetir el commit-gigante que me bajó nota en la entrega
anterior: primero el modelo, luego el controller, luego los tests + EXAMEN.md. Type-check verde,
163 tests verdes (los 32 originales del albarán + 4 nuevos de idempotencia + el resto del proyecto),
cero regresiones.

