# Guía Rápida de Inicio

## 🚀 Pasos para iniciar el servidor:

### 1. Instalar dependencias (solo la primera vez):
```bash
npm install
```

### 2. Iniciar el servidor:

**Opción A - Modo desarrollo (recomendado):**
```bash
npm run dev
```

**Opción B - Modo normal:**
```bash
npm start
```

### 3. Verificar que el servidor está corriendo:

Deberías ver en la consola:
```
🚀 Servidor ejecutándose en http://localhost:3000
📡 Entorno: development
📚 API: http://localhost:3000/api
```

### 4. Probar la API:

Abre el archivo `test.http` y ejecuta las pruebas con REST Client.

O prueba manualmente en el navegador:
- http://localhost:3000/health
- http://localhost:3000/api
- http://localhost:3000/api/usuarios

## ⚠️ Si tienes problemas:

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Port 3000 already in use"
Cambia el puerto en el archivo `.env`:
```
PORT=3001
```

### Error: "Connection refused"
El servidor no está corriendo. Ejecuta:
```bash
npm run dev
```

## 📝 Comandos útiles:

```bash
# Instalar dependencias
npm install

# Modo desarrollo (auto-reload)
npm run dev

# Modo producción
npm start

# Ver versión de Node (debe ser >= 18)
node --version
```

## ✅ Checklist antes de probar:

- [ ] Node.js instalado (versión 18 o superior)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Consola muestra mensaje de inicio
- [ ] Puerto 3000 disponible

¡Ahora ya puedes usar `test.http`! 🎉
NODE_ENV=development
PORT=3000

