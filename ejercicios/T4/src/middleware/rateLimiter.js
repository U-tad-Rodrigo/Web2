// Middleware: Rate Limiting (100 req/min)
const requests = new Map();

export const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const data = requests.get(ip) || { count: 0, reset: now + 60000 };

  if (now > data.reset) {
    data.count = 0;
    data.reset = now + 60000;
  }

  if (++data.count > 100) {
    return res.status(429).json({ error: 'Límite de 100 req/min excedido' });
  }

  requests.set(ip, data);
  next();
};
