const config = require("../config/db.config");
const Sequelize = require("sequelize");

for (const field of ["HOST", "USER", "PASSWORD", "DB"]) {
    if (!config[field]) {
        throw new Error(`Falta configurar ${field} en las variables de entorno.`);
    }
}

const sequelize = new Sequelize(config.DB, config.USER, config.PASSWORD, {
    host: config.HOST,
    port: config.PORT,
    dialect: config.dialect,
    pool: config.pool,
    logging: false,
    dialectOptions: config.ssl ? { ssl: { require: true, rejectUnauthorized: true } } : {}
});

// Registramos los modelos para usarlos desde los controladores.
const db = { Sequelize, sequelize };
db.artistas = require("./artista.model")(sequelize, Sequelize);

db.usuarios = require("./usuario.model")(sequelize, Sequelize);

module.exports = db;


