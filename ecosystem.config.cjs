module.exports = {
  apps: [
    {
      name: 'glass',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3222',
      cwd: '/www/wwwroot/kinhmathongnhong.vn',
      instances: 1,
      exec_mode: 'fork',

      // === Chống restart loop (gây đơ server) ===
      autorestart: true,
      max_restarts: 10,           // Tối đa 10 lần restart, sau đó dừng hẳn
      min_uptime: '10s',          // App phải chạy ít nhất 10s mới tính là "stable"
      restart_delay: 4000,        // Chờ 4 giây giữa mỗi lần restart
      exp_backoff_restart_delay: 100, // Tăng dần thời gian chờ khi crash liên tục

      // === Tài nguyên ===
      watch: false,               // KHÔNG watch file (tránh auto rebuild)
      max_memory_restart: '768M', // Chỉ restart khi vượt 768MB RAM
      kill_timeout: 5000,         // Cho 5s để graceful shutdown

      // === Logs ===
      error_file: '/www/wwwroot/kinhmathongnhong.vn/logs/pm2-error.log',
      out_file: '/www/wwwroot/kinhmathongnhong.vn/logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // === Environment ===
      env: {
        NODE_ENV: 'production',
        PORT: 3222,
      },
    },
  ],
};
