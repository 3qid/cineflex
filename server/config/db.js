require('dotenv').config();
const { Sequelize } = require('@sequelize/core');
const { MySqlDialect } = require('@sequelize/mysql');

const sequelize = new Sequelize({
  dialect: MySqlDialect,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : undefined,
});

async function testDbConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ [Database Status]: Connection to MySQL has been established successfully.');
  } catch (error) {
    console.error('❌ [Database Status]: Unable to connect to MySQL database:');
    console.error(error.message);
    throw error;
  }
}

module.exports = { sequelize, testDbConnection };