require("dotenv").config();
const app = require("./app/app");
const db = require("./app/models");

const PORT = process.env.PORT || 8081;

async function iniciarServidor() {
    try {
        await db.sequelize.authenticate();
        // Crea las tablas que faltan. No altera ni elimina las que ya existen.
        await db.sequelize.sync();
        console.log("Base de datos lista.");

        app.listen(PORT, () => {
            console.log(`SVB-GUA API disponible en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("No se pudo iniciar el servidor:", error.message);
        process.exit(1);
    }
}

iniciarServidor();
