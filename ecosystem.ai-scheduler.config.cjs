module.exports = {
  apps: [
    {
      name: 'glass-ai-scheduler',
      cwd: '/www/wwwroot/kinhmathongnhung.vn/backend',
      script: '/www/server/php/82/bin/php',
      args: 'artisan schedule:work --no-interaction',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,
      time: true,
      out_file: '/www/wwwroot/kinhmathongnhung.vn/backend/storage/logs/ai-scheduler-out.log',
      error_file: '/www/wwwroot/kinhmathongnhung.vn/backend/storage/logs/ai-scheduler-error.log',
      merge_logs: true,
      env: {
        APP_ENV: 'production',
      },
    },
  ],
};
