module.exports = {
  apps: [
    {
      name: 'droob-backend',
      script: 'start.bat',
      cwd: 'D:\\trans_app\\droob\\backend',
      interpreter: 'cmd.exe',
      interpreterArgs: '/c',
      env: {
        PORT: process.env.PORT || 3001,
        HOST: process.env.HOST || '0.0.0.0',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        OSRM_BASE_URL: process.env.OSRM_BASE_URL || 'http://localhost:5000',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    }
  ]
};