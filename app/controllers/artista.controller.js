const db = require("../models");
const Artista = db.artistas;
const Op = db.Sequelize.Op;

// Validamos los campos antes de guardarlos.
function validarArtista(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Envia los datos del artista en formato JSON.";
    }
    if (typeof body.nombre_artistico !== "string" || !body.nombre_artistico.trim() || body.nombre_artistico.trim().length > 120) {
        return "El nombre artistico es obligatorio y admite hasta 120 caracteres.";
    }
    if (typeof body.genero_musical !== "string" || !body.genero_musical.trim() || body.genero_musical.trim().length > 50) {
        return "El genero musical es obligatorio y admite hasta 50 caracteres.";
    }
    if (body.pais_origen != null && (typeof body.pais_origen !== "string" || body.pais_origen.trim().length > 50)) {
        return "El pais de origen debe ser texto de hasta 50 caracteres.";
    }
    return null;
}

function idValido(id) {
    return /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;
}

// POST - Crear artista.
exports.create = async (req, res) => {
    const mensaje = validarArtista(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    const artista = {
        nombre_artistico: req.body.nombre_artistico.trim(),
        genero_musical: req.body.genero_musical.trim(),
        pais_origen: req.body.pais_origen == null ? null : req.body.pais_origen.trim()
    };
    try {
        const data = await Artista.create(artista);
        res.status(201).send(data);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Error al crear el artista." });
    }
};

// GET - Obtener artistas. Ejemplo de filtro: ?nombre_artistico=arjona
exports.findAll = async (req, res) => {
    const nombre = req.query.nombre_artistico;
    if (nombre !== undefined && typeof nombre !== "string") {
        return res.status(400).send({ message: "El filtro nombre_artistico debe ser texto." });
    }
    const condition = nombre ? { nombre_artistico: { [Op.iLike]: `%${nombre}%` } } : {};
    try {
        const data = await Artista.findAll({ where: condition, order: [["id_artista", "ASC"]] });
        res.send(data);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Error al obtener los artistas." });
    }
};

// GET - Obtener artista por ID.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const data = await Artista.findByPk(req.params.id);
        if (!data) return res.status(404).send({ message: "Artista no encontrado." });
        res.send(data);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Error al obtener el artista." });
    }
};

// PUT - Actualizar artista. Enviar nombre, genero y pais (opcional).
exports.update = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    const mensaje = validarArtista(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });
    try {
        const artista = await Artista.findByPk(req.params.id);
        if (!artista) return res.status(404).send({ message: "Artista no encontrado." });
        await artista.update({
            nombre_artistico: req.body.nombre_artistico.trim(),
            genero_musical: req.body.genero_musical.trim(),
            pais_origen: req.body.pais_origen == null ? null : req.body.pais_origen.trim()
        });
        res.send(artista);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Error al actualizar el artista." });
    }
};

// DELETE - Eliminar artista.
exports.delete = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const cantidad = await Artista.destroy({ where: { id_artista: req.params.id } });
        if (!cantidad) return res.status(404).send({ message: "Artista no encontrado." });
        res.send({ message: "Artista eliminado correctamente." });
    } catch (error) {
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(409).send({ message: "No se puede eliminar un artista con conciertos relacionados." });
        }
        console.error(error.message);
        res.status(500).send({ message: "Error al eliminar el artista." });
    }
};
