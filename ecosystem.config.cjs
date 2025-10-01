module.exports = {
  apps: [{
    name: 'membership-system',
    script: 'server.js',
    cwd: '/var/www/membership-system',
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
    
    // Process management
    listen_timeout: 30000,
    kill_timeout: 10000,
    
    // Auto restart configuration
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    
    // Watch files (disabled in production)
    watch: false,
    
    // Advanced options
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    pmx: false
  }]
};