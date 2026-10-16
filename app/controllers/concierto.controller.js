const db = require("../models");
const Concierto = db.conciertos;
const Op = db.Sequelize.Op;

// Validamos que la fecha se pueda entender y que sea un formato completo.
function fechaValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(valor)) return false;
    return !Number.isNaN(Date.parse(valor));
}

function validarConcierto(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) return "Envia los datos del concierto en formato JSON.";
    if (!Number.isInteger(body.id_artista) || body.id_artista < 1) return "id_artista debe ser un numero entero positivo.";
    if (typeof body.titulo_evento !== "string" || !body.titulo_evento.trim() || body.titulo_evento.trim().length > 150) {
        return "El titulo del evento es obligatorio y admite hasta 150 caracteres.";
    }
    if (!fechaValida(body.fecha_concierto)) return "fecha_concierto debe ser una fecha y hora validas en formato ISO, por ejemplo 2026-12-20T20:00:00-06:00.";
    if (typeof body.recinto !== "string" || !body.recinto.trim() || body.recinto.trim().length > 120) {
        return "El recinto es obligatorio y admite hasta 120 caracteres.";
    }
    if (body.estado !== undefined && !["programado", "activo", "finalizado"].includes(body.estado)) {
        return "El estado debe ser programado, activo o finalizado.";
    }
    const permitidos = ["id_artista", "titulo_evento", "fecha_concierto", "recinto", "estado"];
    if (Object.keys(body).some(campo => !permitidos.includes(campo))) return "La solicitud contiene campos no permitidos.";
    return null;
}

function idValido(id) {
    return /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
}

function responderError(error, res, accion) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
        return res.status(400).send({ message: "El artista indicado no existe." });
    }
    console.error(error.message);
    return res.status(500).send({ message: `Error al ${accion} el concierto.` });
}

// POST - Crear concierto.
exports.create = async (req, res) => {
    const mensaje = validarConcierto(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const artista = await db.artistas.findByPk(req.body.id_artista);
        if (!artista) return res.status(400).send({ message: "El artista indicado no existe." });
        const concierto = await Concierto.create({
            id_artista: req.body.id_artista,
            titulo_evento: req.body.titulo_evento.trim(),
            fecha_concierto: new Date(req.body.fecha_concierto),
            recinto: req.body.recinto.trim(),
            estado: req.body.estado || "programado"
        });
        res.status(201).send(concierto);
    } catch (error) {
        responderError(error, res, "crear");
    }
};

// GET - Listar conciertos; los filtros son opcionales.
exports.findAll = async (req, res) => {
    if (req.query.titulo_evento !== undefined && typeof req.query.titulo_evento !== "string") {
        return res.status(400).send({ message: "El filtro titulo_evento debe ser texto." });
    }
    if (req.query.estado !== undefined && !["programado", "activo", "finalizado"].includes(req.query.estado)) {
        return res.status(400).send({ message: "El filtro estado debe ser programado, activo o finalizado." });
    }
    const where = {};
    if (req.query.titulo_evento) where.titulo_evento = { [Op.iLike]: `%${req.query.titulo_evento}%` };
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.id_artista !== undefined) {
        if (!idValido(req.query.id_artista)) return res.status(400).send({ message: "El filtro id_artista debe ser un entero positivo." });
        where.id_artista = Number(req.query.id_artista);
    }
    try {
        const conciertos = await Concierto.findAll({ where, order: [["fecha_concierto", "ASC"]] });
        res.send(conciertos);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// GET - Consultar concierto por ID.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const concierto = await Concierto.findByPk(req.params.id);
        if (!concierto) return res.status(404).send({ message: "Concierto no encontrado." });
        res.send(concierto);
    } catch (error) {
        responderError(error, res, "consultar");
    }
};

// PUT - Actualizar concierto.
exports.update = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    const mensaje = validarConcierto(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const concierto = await Concierto.findByPk(req.params.id);
        if (!concierto) return res.status(404).send({ message: "Concierto no encontrado." });
        const artista = await db.artistas.findByPk(req.body.id_artista);
        if (!artista) return res.status(400).send({ message: "El artista indicado no existe." });
        await concierto.update({
            id_artista: req.body.id_artista,
            titulo_evento: req.body.titulo_evento.trim(),
            fecha_concierto: new Date(req.body.fecha_concierto),
            recinto: req.body.recinto.trim(),
            estado: req.body.estado || "programado"
        });
        res.send(concierto);
    } catch (error) {
        responderError(error, res, "actualizar");
    }
};

// DELETE - Eliminar concierto.
exports.delete = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const cantidad = await Concierto.destroy({ where: { id_concierto: req.params.id } });
        if (!cantidad) return res.status(404).send({ message: "Concierto no encontrado." });
        res.send({ message: "Concierto eliminado correctamente." });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(409).send({ message: "No se puede eliminar un concierto con inventario o ventas relacionados." });
        }
        responderError(error, res, "eliminar");
    }
};
