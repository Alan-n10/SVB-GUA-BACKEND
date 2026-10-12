require("dotenv").config();

async function crearTablaArtistas() {
    let db;
    try {
        db = require("../app/models");
        await db.sequelize.authenticate();
        // Crea la tabla si no existe. No borra ni altera tablas existentes.
        await db.artistas.sync();
        console.log("Tabla artistas lista en PostgreSQL.");
    } catch (error) {
        console.error("No se pudo crear la tabla artistas:", error.message);
        process.exitCode = 1;
    } finally {
        if (db) await db.sequelize.close();
    }
}

crearTablaArtistas();
