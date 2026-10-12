module.exports = (sequelize, Sequelize) => {
    const Artista = sequelize.define("artista", {
        id_artista: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre_artistico: {
            type: Sequelize.STRING(120),
            allowNull: false,
            validate: { notEmpty: true }
        },
        genero_musical: {
            type: Sequelize.STRING(50),
            allowNull: false,
            validate: { notEmpty: true }
        },
        pais_origen: {
            type: Sequelize.STRING(50),
            allowNull: true
        }
    }, {
        // Usamos exactamente el nombre de tabla del documento.
        tableName: "artistas",
        // Esta tabla no incluye createdAt ni updatedAt.
        timestamps: false
    });

    return Artista;
};
