module.exports = {
  apps: [
    {
      name: 'glass',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3222',
      cwd: '/www/wwwroot/glass.cuongdesign.net',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3222,
      },
    },
  ],
};
