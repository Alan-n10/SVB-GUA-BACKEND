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
db.conciertos = require("./concierto.model")(sequelize, Sequelize);
db.localidades = require("./localidad.model")(sequelize, Sequelize);

// Un artista puede tener varios conciertos.
db.artistas.hasMany(db.conciertos, { foreignKey: "id_artista", onDelete: "RESTRICT" });
db.conciertos.belongsTo(db.artistas, { foreignKey: "id_artista" });

module.exports = db;
