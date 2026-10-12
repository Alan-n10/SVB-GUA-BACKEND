module.exports = {
    HOST: process.env.DB_HOST,
    PORT: Number(process.env.DB_PORT || 5432),
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME,
    dialect: "postgres",
    ssl: process.env.DB_SSL === "true",
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
};
