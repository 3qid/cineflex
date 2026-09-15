const { Model, DataTypes } = require('@sequelize/core');
const { sequelize } = require('../config/db');

class User extends Model {}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  authProvider: {
    type: DataTypes.ENUM('email', 'google'),
    allowNull: false,
    defaultValue: 'email',
  },

  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Invalid email format.',
      },
    },
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  googleId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
  },

  favorites: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },

  watchLater: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },

  watching: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },

  watchlist: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },

  history: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },

  genres: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
});

module.exports = User;
