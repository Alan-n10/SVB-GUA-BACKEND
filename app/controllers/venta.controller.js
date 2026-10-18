const db = require("../models");
const Venta = db.ventas;
const DetalleVenta = db.detalleVentas;
const Inventario = db.inventarioBoletos;

function idValido(id) {
    return /^[1-9]\d*$/.test(String(id)) && Number(id) <= 2147483647;
}

function validarSolicitud(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return "Envia los datos de la venta en formato JSON.";
    }
    if (Object.keys(body).some(campo => campo !== "detalles")) {
        return "Envia solo el campo detalles. El vendedor y los precios se obtienen del servidor.";
    }
    if (!Array.isArray(body.detalles) || body.detalles.length === 0) {
        return "La venta debe incluir al menos un detalle.";
    }
    if (body.detalles.length > 50) return "Una venta puede incluir como maximo 50 tipos de boleto.";

    const inventariosIncluidos = new Set();
    for (const detalle of body.detalles) {
        if (!detalle || typeof detalle !== "object" || Array.isArray(detalle)) {
            return "Cada detalle debe incluir id_inventario y cantidad.";
        }
        if (Object.keys(detalle).some(campo => !["id_inventario", "cantidad"].includes(campo))) {
            return "Cada detalle solo puede incluir id_inventario y cantidad.";
        }
        if (!idValido(detalle.id_inventario)) return "id_inventario debe ser un entero positivo.";
        if (!Number.isSafeInteger(detalle.cantidad) || detalle.cantidad < 1) {
            return "La cantidad de cada detalle debe ser un entero mayor que cero.";
        }
        if (inventariosIncluidos.has(Number(detalle.id_inventario))) {
            return "No repitas id_inventario; agrupa los boletos en una sola cantidad.";
        }
        inventariosIncluidos.add(Number(detalle.id_inventario));
    }
    return null;
}

// Convierte un precio DECIMAL a centavos sin errores de redondeo de JavaScript.
function aCentavos(precio) {
    const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(precio));
    if (!partes) throw new Error("El precio del inventario no es valido.");
    return BigInt(partes[1]) * 100n + BigInt((partes[2] || "").padEnd(2, "0") || "0");
}

function formatoDinero(centavos) {
    return `${centavos / 100n}.${String(centavos % 100n).padStart(2, "0")}`;
}

function errorVenta(estado, mensaje) {
    const error = new Error(mensaje);
    error.estadoRespuesta = estado;
    return error;
}

function opcionesDetalles() {
    return [{
        model: DetalleVenta,
        as: "detalles",
        include: [{
            model: Inventario,
            as: "inventario",
            attributes: ["id_inventario", "id_concierto", "id_localidad"]
        }]
    }];
}

// POST - Registrar una venta con uno o varios tipos de boleto.
exports.create = async (req, res) => {
    const mensaje = validarSolicitud(req.body);
    if (mensaje) return res.status(400).send({ message: mensaje });

    try {
        const ventaCreada = await db.sequelize.transaction(async transaction => {
            const detallesOrdenados = [...req.body.detalles].sort((a, b) => Number(a.id_inventario) - Number(b.id_inventario));
            const inventarios = [];

            // Bloqueamos cada registro mientras procesamos la venta para no sobrepasar el aforo.
            for (const detalle of detallesOrdenados) {
                const inventario = await Inventario.findByPk(detalle.id_inventario, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!inventario) throw errorVenta(400, `No existe el inventario ${detalle.id_inventario}.`);
                if (inventario.cantidad_disponible < detalle.cantidad) {
                    throw errorVenta(409, `Solo quedan ${inventario.cantidad_disponible} boletos disponibles para el inventario ${inventario.id_inventario}.`);
                }
                inventarios.push({ inventario, cantidad: detalle.cantidad });
            }

            const detallesVenta = [];
            let totalCentavos = 0n;
            for (const item of inventarios) {
                const precioCentavos = aCentavos(item.inventario.precio);
                const subtotalCentavos = precioCentavos * BigInt(item.cantidad);
                if (subtotalCentavos > 9999999999n) throw errorVenta(400, "El subtotal excede el maximo permitido.");
                totalCentavos += subtotalCentavos;
                detallesVenta.push({
                    inventario: item.inventario,
                    cantidad: item.cantidad,
                    precio_unitario: formatoDinero(precioCentavos),
                    subtotal: formatoDinero(subtotalCentavos)
                });
            }
            if (totalCentavos > 9999999999n) throw errorVenta(400, "El total de la venta excede el maximo permitido.");

            const venta = await Venta.create({
                id_vendedor: req.usuario.id_usuario,
                total_venta: formatoDinero(totalCentavos)
            }, { transaction });

            const filasDetalle = detallesVenta.map(item => ({
                id_venta: venta.id_venta,
                id_inventario: item.inventario.id_inventario,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: item.subtotal
            }));
            await DetalleVenta.bulkCreate(filasDetalle, { transaction });

            for (const item of detallesVenta) {
                await item.inventario.update({
                    cantidad_disponible: item.inventario.cantidad_disponible - item.cantidad
                }, { transaction });
            }

            return { ...venta.toJSON(), detalles: filasDetalle };
        });
        res.status(201).send(ventaCreada);
    } catch (error) {
        if (error.estadoRespuesta) return res.status(error.estadoRespuesta).send({ message: error.message });
        if (error.name === "SequelizeForeignKeyConstraintError") {
            return res.status(400).send({ message: "El vendedor o el inventario indicado no existe." });
        }
        if (error.name === "SequelizeValidationError") {
            return res.status(400).send({ message: "Los datos de la venta no son validos." });
        }
        console.error("Error al crear la venta:", error.message);
        res.status(500).send({ message: "Error al registrar la venta." });
    }
};

// GET - Listar ventas. El vendedor solo ve las ventas que el registro.
exports.findAll = async (req, res) => {
    try {
        const where = req.usuario.rol === "administrador" ? {} : { id_vendedor: req.usuario.id_usuario };
        const ventas = await Venta.findAll({
            where,
            include: opcionesDetalles(),
            order: [["fecha_venta", "DESC"]]
        });
        res.send(ventas);
    } catch (error) {
        console.error("Error al consultar ventas:", error.message);
        res.status(500).send({ message: "Error al obtener las ventas." });
    }
};

// GET - Consultar una venta y sus detalles.
exports.findOne = async (req, res) => {
    if (!idValido(req.params.id)) return res.status(400).send({ message: "El ID debe ser un entero positivo." });
    try {
        const where = { id_venta: req.params.id };
        if (req.usuario.rol !== "administrador") where.id_vendedor = req.usuario.id_usuario;
        const venta = await Venta.findOne({ where, include: opcionesDetalles() });
        if (!venta) return res.status(404).send({ message: "Venta no encontrada." });
        res.send(venta);
    } catch (error) {
        console.error("Error al consultar la venta:", error.message);
        res.status(500).send({ message: "Error al obtener la venta." });
    }
};
