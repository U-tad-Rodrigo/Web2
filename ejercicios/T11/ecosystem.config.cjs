module.exports = {
  apps: [
    {
      name: 'biblioteca-api',
      script: 'src/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
