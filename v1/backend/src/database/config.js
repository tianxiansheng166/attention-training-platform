/**
 * 专注力星球 - 数据库配置
 * 使用 Sequelize ORM 连接 SQLite (本地开发) 或 PostgreSQL (生产)
 */

const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DB_DIALECT === 'sqlite') {
    // SQLite 配置 - 本地开发
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.DB_STORAGE || path.join(__dirname, '../../attention_training.db'),
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true
        }
    });
} else {
    // PostgreSQL 配置 - 生产环境
    sequelize = new Sequelize(
        process.env.DB_NAME || 'attention_training',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            },
            define: {
                timestamps: true,
                underscored: true
            }
        }
    );
}

module.exports = sequelize;
