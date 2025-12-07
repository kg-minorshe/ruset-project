module.exports = {
  apps: [{
    name: 'napi.whilet.ru',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/napi.whilet.ru',
    env: {
      NODE_ENV: 'production',
      PORT: 7015,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/napi.whilet.ru-error.log',
    out_file: '/var/log/pm2/napi.whilet.ru-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};