const db = require("../models");
const Localidad = db.localidades;
const Op = db.Sequelize.Op;

function validarLocalidad(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Envia los datos de la localidad en formato JSON.";
    }
    if (typeof body.nombre !== "string" || !body.nombre.trim() || body.nombre.trim().length > 50) {
        return "El nombre es obligatorio y admite hasta 50 caracteres.";
    }
    if (Object.keys(body).some(campo => campo !== "nombre")) {
        return "Solo puedes enviar el campo nombre.";
    }
    return null;
}

function idValido(id) {
    return /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
}

function responderError(error, res, accion) {
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).send({ message: "Ya existe una localidad con ese nombre." });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).send({ message: "No se puede eliminar una localidad que ya tiene inventario relacionado." });
    }
    console.error(error.message);
    return res.status(500).send({ message: `Error al ${accion} la localidad.` });
}

// POST - Crear localidad.
exports.create = async (req, res) => {
    const mensaje = validarLocalidad(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const localidad = await Localidad.create({ nombre: req.body.nombre.trim() });
        res.status(201).send(localidad);
    } catch (error) {
        responderError(error, res, "crear");
    }
};

// GET - Listar localidades
exports.findAll = async (req, res) => {
    if (req.query.nombre !== undefined && typeof req.query.nombre !== "string") {
        return res.status(400).send({ message: "El filtro nombre debe ser texto." });
    }
    const where = req.query.nombre ? { nombre: { [Op.iLike]: `%${req.query.nombre}%` } } : {};
    try {
        const localidades = await Localidad.findAll({ where, order: [["id_localidad", "ASC"]] });
        res.send(localidades);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// GET - Consultar localidad por ID.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const localidad = await Localidad.findByPk(req.params.id);
        if (!localidad) return res.status(404).send({ message: "Localidad no encontrada." });
        res.send(localidad);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// PUT - Cambiar el nombre de una localidad.
exports.update = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    const mensaje = validarLocalidad(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const localidad = await Localidad.findByPk(req.params.id);
        if (!localidad) return res.status(404).send({ message: "Localidad no encontrada." });
        await localidad.update({ nombre: req.body.nombre.trim() });
        res.send(localidad);
    } catch (error) {
        responderError(error, res, "actualizar");
    }
};

// DELETE - Eliminar localidad.
exports.delete = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const cantidad = await Localidad.destroy({ where: { id_localidad: req.params.id } });
        if (!cantidad) return res.status(404).send({ message: "Localidad no encontrada." });
        res.send({ message: "Localidad eliminada correctamente." });
    } catch (error) {
        responderError(error, res, "eliminar");
    }
};
