const db = require("../models");
const Inventario = db.inventarioBoletos;

function numeroEnteroPositivo(valor) {
    return Number.isSafeInteger(valor) && valor > 0;
}

function validarInventario(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Envia los datos del inventario en formato JSON.";
    }
    const permitidos = ["id_concierto", "id_localidad", "precio", "cantidad_total", "cantidad_disponible"];
    if (Object.keys(body).some(campo => !permitidos.includes(campo))) {
        return "La solicitud contiene campos no permitidos.";
    }
    if (!numeroEnteroPositivo(body.id_concierto)) return "id_concierto debe ser un numero entero positivo.";
    if (!numeroEnteroPositivo(body.id_localidad)) return "id_localidad debe ser un numero entero positivo.";
    if (typeof body.precio !== "number" || !Number.isFinite(body.precio) || body.precio <= 0 || Math.round(body.precio * 100) !== body.precio * 100) {
        return "El precio debe ser un numero mayor que cero con hasta dos decimales.";
    }
    if (!numeroEnteroPositivo(body.cantidad_total)) return "cantidad_total debe ser un entero mayor que cero.";
    if (!Number.isSafeInteger(body.cantidad_disponible) || body.cantidad_disponible < 0) {
        return "cantidad_disponible debe ser un entero igual o mayor que cero.";
    }
    if (body.cantidad_disponible > body.cantidad_total) {
        return "cantidad_disponible no puede ser mayor que cantidad_total.";
    }
    return null;
}

function idValido(id) {
    return /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
}

function responderError(error, res, accion) {
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).send({ message: "Ya existe inventario para esa localidad en ese concierto." });
    }
    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).send({ message: "El concierto o la localidad no existe, o el inventario tiene registros relacionados." });
    }
    if (error.name === "SequelizeValidationError") {
        return res.status(400).send({ message: "Los datos del inventario no son validos." });
    }
    console.error(error.message);
    return res.status(500).send({ message: `Error al ${accion} el inventario.` });
}

// POST - Crear inventario para un concierto y una localidad.
exports.create = async (req, res) => {
    const mensaje = validarInventario(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const concierto = await db.conciertos.findByPk(req.body.id_concierto);
        if (!concierto) return res.status(400).send({ message: "El concierto indicado no existe." });
        const localidad = await db.localidades.findByPk(req.body.id_localidad);
        if (!localidad) return res.status(400).send({ message: "La localidad indicada no existe." });

        const inventario = await Inventario.create({
            id_concierto: req.body.id_concierto,
            id_localidad: req.body.id_localidad,
            precio: req.body.precio,
            cantidad_total: req.body.cantidad_total,
            cantidad_disponible: req.body.cantidad_disponible
        });
        res.status(201).send(inventario);
    } catch (error) {
        responderError(error, res, "crear");
    }
};

// GET - Listar; los filtros por concierto o localidad son opcionales.
exports.findAll = async (req, res) => {
    const where = {};
    if (req.query.id_concierto !== undefined) {
        if (!idValido(req.query.id_concierto)) return res.status(400).send({ message: "id_concierto debe ser un entero positivo." });
        where.id_concierto = Number(req.query.id_concierto);
    }
    if (req.query.id_localidad !== undefined) {
        if (!idValido(req.query.id_localidad)) return res.status(400).send({ message: "id_localidad debe ser un entero positivo." });
        where.id_localidad = Number(req.query.id_localidad);
    }
    try {
        const inventarios = await Inventario.findAll({ where, order: [["id_inventario", "ASC"]] });
        res.send(inventarios);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// GET - Consultar un registro de inventario por ID.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const inventario = await Inventario.findByPk(req.params.id);
        if (!inventario) return res.status(404).send({ message: "Registro de inventario no encontrado." });
        res.send(inventario);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// PUT - Actualizar precio y cantidades del registro.
exports.update = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    const mensaje = validarInventario(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const inventario = await Inventario.findByPk(req.params.id);
        if (!inventario) return res.status(404).send({ message: "Registro de inventario no encontrado." });
        const concierto = await db.conciertos.findByPk(req.body.id_concierto);
        if (!concierto) return res.status(400).send({ message: "El concierto indicado no existe." });
        const localidad = await db.localidades.findByPk(req.body.id_localidad);
        if (!localidad) return res.status(400).send({ message: "La localidad indicada no existe." });

        await inventario.update({
            id_concierto: req.body.id_concierto,
            id_localidad: req.body.id_localidad,
            precio: req.body.precio,
            cantidad_total: req.body.cantidad_total,
            cantidad_disponible: req.body.cantidad_disponible
        });
        res.send(inventario);
    } catch (error) {
        responderError(error, res, "actualizar");
    }
};

// DELETE - Eliminar un registro de inventario.
exports.delete = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const cantidad = await Inventario.destroy({ where: { id_inventario: req.params.id } });
        if (!cantidad) return res.status(404).send({ message: "Registro de inventario no encontrado." });
        res.send({ message: "Registro de inventario eliminado correctamente." });
    } catch (error) {
        responderError(error, res, "eliminar");
    }
};
