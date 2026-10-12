const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "API del Sistema de Venta de Boletos SVB-GUA" });
});

// Comprueba la conexion sin crear ni modificar tablas.
app.get("/api/salud/bd", async (req, res) => {
    try {
        const db = require("./models");
        await db.sequelize.authenticate();
        res.json({ message: "Conexion a PostgreSQL correcta." });
    } catch (error) {
        console.error("Error de conexion a PostgreSQL:", error.message);
        res.status(503).json({ message: "No se pudo conectar a PostgreSQL. Revisa la configuracion del servidor." });
    }
});

// Registramos las rutas antes de la respuesta 404.
require("./routes/usuario.routes")(app);
app.use((req, res) => {
    res.status(404).json({ message: "Ruta no encontrada." });
});

app.use((error, req, res, next) => {
    console.error(error.message);
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({ message: status === 400 ? "La solicitud contiene datos invalidos." : "Error interno del servidor." });
});

module.exports = app;

