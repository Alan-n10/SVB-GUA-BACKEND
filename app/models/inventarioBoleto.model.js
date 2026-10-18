module.exports = (sequelize, Sequelize) => {
    const InventarioBoleto = sequelize.define("inventario_boleto", {
        id_inventario: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_concierto: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        id_localidad: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        precio: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            validate: { min: 0.01 }
        },
        cantidad_total: {
            type: Sequelize.INTEGER,
            allowNull: false,
            validate: { min: 1, isInt: true }
        },
        cantidad_disponible: {
            type: Sequelize.INTEGER,
            allowNull: false,
            validate: { min: 0, isInt: true }
        }
    }, {
        tableName: "inventario_boletos",
        timestamps: false,
        // Una localidad solo se registra una vez por cada concierto.
        indexes: [{
            unique: true,
            fields: ["id_concierto", "id_localidad"],
            name: "inventario_concierto_localidad_unica"
        }]
    });

    return InventarioBoleto;
};
