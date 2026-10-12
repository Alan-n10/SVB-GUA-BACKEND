require("dotenv").config();

async function crearTablaUsuarios() {
    let db;
    try {
        db = require("../app/models");
        await db.sequelize.authenticate();
        // Crea la tabla si no existe. No borra ni altera tablas existentes.
        await db.usuarios.sync();
        console.log("Tabla usuarios lista en PostgreSQL.");
    } catch (error) {
        console.error("No se pudo crear la tabla usuarios:", error.message);
        process.exitCode = 1;
    } finally {
        if (db) await db.sequelize.close();
    }
}

crearTablaUsuarios();

