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

He apoyado el desarrollo de este examen en herramientas de IA (Claude Code y Codex) como parte
del flujo, pero el control de las decisiones, la validación contra el enunciado y la revisión
del código han sido míos en cada etapa. Los pasos que seguí:

- **1. Definición del scope.** Leí el enunciado y el código actual de `signDeliveryNote`
  (líneas 118-163). Comparé alternativas para la parte técnica: (a) lookup + sign + insert al
  final, (b) middleware genérico de idempotencia, (c) patrón placeholder-first con
  `insertOne` + manejo del E11000. Descarté (a) por permitir doble upload a Cloudinary en
  reintentos concurrentes, y (b) por overkill para un solo endpoint. Escogí (c), que es la
  que cumple "insertOne + manejo del 11000" del criterio y bloquea el doble upload de raíz.

- **2. Investigación de las preguntas socráticas.** Una vez fijado el scope técnico, trabajé
  cada pregunta alineándola con la implementación elegida: códigos HTTP (200 cached / 409
  conflict / 400 inválido), por qué `validate-id.ts` no aplica para una clave que viaja por
  cabecera, cómo Mongo serializa los inserts sobre el índice único, contraste con Stripe
  como referencia de la industria, y qué implicaría firmar en varios pasos sin romper la
  idempotencia.

- **3. Desarrollo del código.** Tres piezas: el modelo `IdempotencyLog.ts` (índice único en
  `key`, TTL 24h vía `expires: 86400`), la modificación de `signDeliveryNote` con el flujo
  de reserva atómica + cleanup de `req.file` en cache hits + liberación de la reserva en
  fallos, y los 4 tests nuevos en `deliverynote.test.js` (cache hit, concurrencia,
  formato inválido y regresión sin cabecera).

- **4. Primera revisión pre-test.** Antes de ejecutar, repasé el controller buscando huecos:
  detecté que faltaba el `fs.unlink` del archivo subido en los cache hits y que el catch
  general necesitaba `deleteOne` de la reserva para no atrapar al cliente en un 409
  permanente si fallaba algo no controlado.

- **5. Segunda revisión post-test.** Lancé `npm run type-check` (verde) y `npm test` (163/163,
  12/12 suites). El test "no duplicación de uploads" lo construí asertando que `signedAt`
  y `signatureUrl` del reintento son idénticos al original — si la idempotencia fallara y se
  re-ejecutara el flujo, `signedAt` cambiaría (es `new Date()`) y el test fallaría
  inmediatamente.

- **6. Evaluación completa.** Pasé el trabajo por la skill `repo-evaluator`para
  auditarlo contra los criterios del enunciado, y lo contrasté con una sesión de Codex como
  segunda opinión. Las observaciones de ambas evaluaciones las incorporé antes de cerrar la
  entrega.
- **7. Correciones finales tras el audit de Codex.**: Codex detectó unos errores y los corregimos rápido.


