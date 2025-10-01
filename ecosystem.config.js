module.exports = {
  apps: [{
    name: 'membership-system',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5173
    },
    // Logging
    error_file: '/var/log/membership-system/err.log',
    out_file: '/var/log/membership-system/out.log',
    log_file: '/var/log/membership-system/combined.log',
    time: true,

    // Memory and CPU limits
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',

    // Process management
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000,

    // Auto restart configuration
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',

    // Watch files in development (disable in production)
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      '*.log'
    ],

    // Graceful shutdown
    shutdown_with_message: true,

    // Health check
    health_check_grace_period: 3000,

    // Advanced PM2 features
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // Instance variables
    instance_var: 'INSTANCE_ID',

    // Source map support
    source_map_support: true,

    // Disable PM2 logs (use application logging instead)
    disable_logs: false,

    // Monitoring
    pmx: true,

    // Advanced options
    vizion: false
  }]
};