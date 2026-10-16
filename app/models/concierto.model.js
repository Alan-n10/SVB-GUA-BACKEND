module.exports = (sequelize, Sequelize) => {
    const Concierto = sequelize.define("concierto", {
        id_concierto: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_artista: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        titulo_evento: {
            type: Sequelize.STRING(150),
            allowNull: false,
            validate: { notEmpty: true }
        },
        fecha_concierto: {
            type: Sequelize.DATE,
            allowNull: false,
            validate: { isDate: true }
        },
        recinto: {
            type: Sequelize.STRING(120),
            allowNull: false,
            validate: { notEmpty: true }
        },
        estado: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "programado",
            validate: { isIn: [["programado", "activo", "finalizado"]] }
        }
    }, {
        tableName: "conciertos",
        timestamps: false
    });

    return Concierto;
};
