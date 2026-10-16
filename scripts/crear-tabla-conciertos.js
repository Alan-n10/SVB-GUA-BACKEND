require("dotenv").config();

async function crearTablaConciertos() {
    let db;
    try {
        db = require("../app/models");
        await db.sequelize.authenticate();
        // Crea la tabla si no existe. No borra ni altera tablas existentes.
        await db.conciertos.sync();
        console.log("Tabla conciertos lista en PostgreSQL.");
    } catch (error) {
        console.error("No se pudo crear la tabla conciertos:", error.message);
        process.exitCode = 1;
    } finally {
        if (db) await db.sequelize.close();
    }
}

crearTablaConciertos();