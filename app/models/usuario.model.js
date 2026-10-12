module.exports = (sequelize, Sequelize) => {
    const Usuario = sequelize.define("usuario", {
        id_usuario: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nombre_usuario: {
            type: Sequelize.STRING(50),
            allowNull: false,
            unique: true,
            validate: { notEmpty: true }
        },
        // Aqui se guarda el hash generado con bcrypt, nunca la contrasena original.
        contrasena_hash: {
            type: Sequelize.STRING(255),
            allowNull: false,
            validate: { notEmpty: true }
        },
        nombre_completo: {
            type: Sequelize.STRING(100),
            allowNull: false,
            validate: { notEmpty: true }
        },
        rol: {
            type: Sequelize.STRING(20),
            allowNull: false,
            validate: {
                isIn: [["administrador", "vendedor"]]
            }
        },
        fecha_creacion: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW
        }
    }, {
        tableName: "usuarios",
        timestamps: false,
        // Las consultas normales no devuelven el hash de la contrasena.
        defaultScope: {
            attributes: { exclude: ["contrasena_hash"] }
        },
        // El login usara este scope para comparar la contrasena con bcrypt.
        scopes: {
            conContrasena: { attributes: { include: ["contrasena_hash"] } }
        }
    });

    return Usuario;
};
