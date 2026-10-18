module.exports = (sequelize, Sequelize) => {
    const DetalleVenta = sequelize.define("detalle_venta", {
        id_detalle: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_venta: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        id_inventario: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        cantidad: {
            type: Sequelize.INTEGER,
            allowNull: false,
            validate: { min: 1, isInt: true }
        },
        precio_unitario: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            validate: { min: 0.01 }
        },
        subtotal: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            validate: { min: 0.01 }
        }
    }, {
        tableName: "detalle_ventas",
        timestamps: false
    });

    return DetalleVenta;
};
