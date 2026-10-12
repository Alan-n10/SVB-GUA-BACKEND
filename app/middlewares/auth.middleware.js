const jwt = require("jsonwebtoken");
const db = require("../models");

exports.verificarToken = async (req, res, next) => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        return res.status(503).send({ message: "Falta configurar JWT_SECRET en el servidor." });
    }
    const cabecera = req.headers.authorization || "";
    const partes = cabecera.split(" ");
    if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
        return res.status(401).send({ message: "Envia el token en Authorization: Bearer TOKEN." });
    }
    let datos;
    try {
        datos = jwt.verify(partes[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
        if (!/^[1-9]\d*$/.test(datos.sub) || !Number.isSafeInteger(Number(datos.sub)) || Number(datos.sub) > 2147483647) {
            return res.status(401).send({ message: "Token invalido." });
        }
    } catch (error) {
        return res.status(401).send({ message: "Token invalido o expirado." });
    }
    try {
        // Leemos el rol actual de la base, no un rol antiguo guardado en el token.
        const usuario = await db.usuarios.findByPk(datos.sub);
        if (!usuario) return res.status(401).send({ message: "El usuario de esta sesion ya no existe." });
        req.usuario = usuario;
        next();
    } catch (error) {
        console.error("Error al consultar sesion:", error.message);
        res.status(500).send({ message: "No se pudo verificar la sesion." });
    }
};

exports.esAdministrador = (req, res, next) => {
    if (req.usuario.rol !== "administrador") {
        return res.status(403).send({ message: "Esta operacion requiere el rol administrador." });
    }
    next();
};
