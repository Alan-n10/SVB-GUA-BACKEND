const db = require("../models");
const Usuario = db.usuarios;
const bcrypt = require("bcryptjs");


// Nunca enviamos contrasena_hash al frontend, tampoco al crear o actualizar.
function datosPublicos(usuario) {
    const datos = usuario.toJSON();
    delete datos.contrasena_hash;
    return datos;
}

function validar(body, parcial = false) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "El cuerpo debe ser un objeto JSON.";
    const campos = ["nombre_usuario", "nombre_completo", "contrasena", "rol"];
    if (Object.keys(body).some(campo => !campos.includes(campo))) return "Hay campos no permitidos en la solicitud.";
    if (parcial && !Object.keys(body).length) return "Envia al menos un campo para actualizar.";
    for (const [campo, maximo] of [["nombre_usuario", 50], ["nombre_completo", 100]]) {
        if (!parcial || body[campo] !== undefined) {
            if (typeof body[campo] !== "string" || !body[campo].trim() || body[campo].trim().length > maximo || (campo === "nombre_usuario" && body[campo].includes(":"))) {
                return `${campo} es obligatorio y admite hasta ${maximo} caracteres.`;
            }
        }
    }
    if (!parcial || body.contrasena !== undefined) {
        if (typeof body.contrasena !== "string" || body.contrasena.length < 8 || Buffer.byteLength(body.contrasena, "utf8") > 72) {
            return "La contrasena debe tener al menos 8 caracteres y como maximo 72 bytes.";
        }
    }
    if (!parcial || body.rol !== undefined) {
        if (!["administrador", "vendedor"].includes(body.rol)) return "El rol debe ser administrador o vendedor.";
    }
    return null;
}

function idValido(id) {
    return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) <= 2147483647;
}

function responderError(error, res) {
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).send({ message: "El nombre de usuario ya existe." });
    }
    if (error.name === "SequelizeValidationError") {
        return res.status(400).send({ message: "Los datos del usuario no son validos." });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).send({ message: "No se puede eliminar un usuario con registros relacionados." });
    }
    console.error("Error en usuarios:", error.message);
    return res.status(500).send({ message: "Error al procesar el usuario." });
}

// POST - Crear usuario (solo administrador).
exports.create = async (req, res) => {
    const mensaje = validar(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const usuario = await Usuario.create({
            nombre_usuario: req.body.nombre_usuario.trim(),
            nombre_completo: req.body.nombre_completo.trim(),
            contrasena_hash: await bcrypt.hash(req.body.contrasena, 12),
            rol: req.body.rol
        });
        res.status(201).send(datosPublicos(usuario));
    } catch (error) {
        responderError(error, res);
    }
};

// GET - Listar usuarios, con filtro opcional por nombre_usuario.
exports.findAll = async (req, res) => {
    if (req.query.nombre_usuario !== undefined && typeof req.query.nombre_usuario !== "string") {
        return res.status(400).send({ message: "nombre_usuario debe ser texto." });
    }
    try {
        const where = req.query.nombre_usuario
            ? { nombre_usuario: { [db.Sequelize.Op.iLike]: `%${req.query.nombre_usuario}%` } }
            : {};
        const usuarios = await Usuario.findAll({ where, order: [["id_usuario", "ASC"]] });
        res.send(usuarios.map(datosPublicos));
    } catch (error) {
        responderError(error, res);
    }
};

// GET - Consultar usuario por ID.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).send({ message: "Usuario no encontrado." });
        res.send(datosPublicos(usuario));
    } catch (error) {
        responderError(error, res);
    }
};

// PUT - Actualizar solo los campos permitidos.
exports.update = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    const mensaje = validar(req.body, true);
    if (mensaje) return res.status(400).send({ message: mensaje });
    if (Number(req.params.id) === req.usuario.id_usuario && req.body.rol && req.body.rol !== "administrador") {
        return res.status(409).send({ message: "No puedes quitarte tu propio rol de administrador." });
    }
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).send({ message: "Usuario no encontrado." });
        const cambios = {};
        for (const campo of ["nombre_usuario", "nombre_completo", "rol"]) {
            if (req.body[campo] !== undefined) cambios[campo] = req.body[campo].trim();
        }
        if (req.body.contrasena !== undefined) cambios.contrasena_hash = await bcrypt.hash(req.body.contrasena, 12);
        await usuario.update(cambios);
        res.send(datosPublicos(usuario));
    } catch (error) {
        responderError(error, res);
    }
};

// DELETE - Eliminar usuario.
exports.delete = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    if (Number(req.params.id) === req.usuario.id_usuario) {
        return res.status(409).send({ message: "No puedes eliminar tu propio usuario administrador." });
    }
    try {
        const cantidad = await Usuario.destroy({ where: { id_usuario: req.params.id } });
        if (!cantidad) return res.status(404).send({ message: "Usuario no encontrado." });
        res.send({ message: "Usuario eliminado correctamente." });
    } catch (error) {
        responderError(error, res);
    }
};

// POST - Login para administradores y vendedores.
exports.login = async (req, res) => {
    const { nombre_usuario, contrasena } = req.body || {};
    if (typeof nombre_usuario !== "string" || !nombre_usuario.trim() || typeof contrasena !== "string" || !contrasena || Buffer.byteLength(contrasena, "utf8") > 72) {
        return res.status(400).send({ message: "Envia nombre_usuario y contrasena validos." });
    }
    try {
        const usuario = await Usuario.scope("conContrasena").findOne({ where: { nombre_usuario: nombre_usuario.trim() } });
        if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena_hash))) {
            return res.status(401).send({ message: "Usuario o contrasena incorrectos." });
        }
        res.send({ message: "Login correcto.", usuario: datosPublicos(usuario) });
    } catch (error) {
        responderError(error, res);
    }
};

// GET - El frontend puede consultar la identidad de la sesion.
exports.me = (req, res) => res.send(datosPublicos(req.usuario));

