// PM2 process config — start with:  pm2 start ecosystem.config.js
// Reads ./backend/.env for secrets; values below are fallbacks.
module.exports = {
  apps: [
    {
      name: 'kricar-api',
      cwd: './backend',
      script: 'server.js',
      instances: 1,            // SQLite is single-writer — keep this at 1 (no cluster mode)
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
