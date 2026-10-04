import { Sequelize } from 'sequelize';

export function createDatabase(config) {
  if (!config.DATABASE_URL) return null;
  return new Sequelize(config.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0, acquire: 5000, idle: 10000 },
    dialectOptions: {
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      ...(config.DATABASE_SSL ? { ssl: { require: true, rejectUnauthorized: true } } : {}),
    },
    define: { underscored: true, timestamps: true },
  });
}

