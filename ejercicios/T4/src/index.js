import app from './app.js';

const PORT = 3000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log('='.repeat(50));
});
