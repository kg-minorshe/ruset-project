module.exports = {
  apps: [{
    name: 'rs.whilet.ru',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/rs.whilet.ru',
    env: {
      NODE_ENV: 'production',
      PORT: 7012
    },
    env_file: '/var/www/rs.whilet.ru/.env.production',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/rs.whilet.ru-error.log',
    out_file: '/var/log/pm2/rs.whilet.ru-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
