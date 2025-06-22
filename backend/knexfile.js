require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
    ? process.env.DATABASE_URL
    : {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD || '123456',
        database: process.env.PG_DATABASE || 'sales_pulse'
      },
    migrations: {
      directory: './migrations'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
      ? {
          connectionString: process.env.DATABASE_URL,
        }
      : {
          host: process.env.PG_HOST,
          port: process.env.PG_PORT,
          user: process.env.PG_USER,
          password: process.env.PG_PASSWORD,
          database: process.env.PG_DATABASE
        },
    migrations: {
      directory: './migrations'
    },
    pool: { min: 2, max: 10 }
  }
};
