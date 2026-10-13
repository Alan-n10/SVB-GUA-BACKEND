const bcrypt = require("bcryptjs");
const db = require("../models");

// Basic Auth: EchoAPI envia usuario y contrasena en cada peticion protegida.
exports.verificarCredenciales = async (req, res, next) => {
    const cabecera = req.headers.authorization || "";
    const partes = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(cabecera);
    if (!partes || partes[1].length > 1024) {
        return res.status(401).send({ message: "Configura Basic Auth con tu usuario y contrasena." });
    }
    const credenciales = Buffer.from(partes[1], "base64").toString("utf8");
    const separador = credenciales.indexOf(":");
    const nombre = credenciales.slice(0, separador).trim();
    const contrasena = credenciales.slice(separador + 1);
    if (separador < 1 || !nombre || nombre.length > 50 || !contrasena || Buffer.byteLength(contrasena, "utf8") > 72) {
        return res.status(401).send({ message: "Usuario o contrasena incorrectos." });
    }
    try {
        const usuario = await db.usuarios.scope("conContrasena").findOne({ where: { nombre_usuario: nombre } });
        if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena_hash))) {
            return res.status(401).send({ message: "Usuario o contrasena incorrectos." });
        }
        req.usuario = usuario;
        next();
    } catch (error) {
        console.error("Error al verificar credenciales:", error.message);
        res.status(500).send({ message: "No se pudo verificar el usuario." });
    }
};

exports.esAdministrador = (req, res, next) => {
    if (req.usuario.rol !== "administrador") {
        return res.status(403).send({ message: "Esta operacion requiere el rol administrador." });
    }
    next();
};
