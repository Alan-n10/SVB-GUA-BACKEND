require("dotenv").config();
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const readline = require("node:readline/promises");

async function crearAdmin() {
    let db;
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        const nombre = (await terminal.question("Nombre de usuario del administrador: ")).trim();
        const completo = (await terminal.question("Nombre completo: ")).trim();
        if (!nombre || nombre.length > 50 || !completo || completo.length > 100) {
            throw new Error("Nombre de usuario: 1-50 caracteres. Nombre completo: 1-100 caracteres.");
        }
        db = require("../app/models");
        await db.sequelize.authenticate();
        await db.usuarios.sync();
        // Este comando solo sirve para el primer administrador.
        const contrasena = crypto.randomBytes(18).toString("base64url");
        const hash = await bcrypt.hash(contrasena, 12);
        await db.sequelize.transaction(async transaction => {
            // Evita crear dos administradores iniciales si ejecutan el comando a la vez.
            await db.sequelize.query('LOCK TABLE "usuarios" IN EXCLUSIVE MODE', { transaction });
            if (await db.usuarios.count({ where: { rol: "administrador" }, transaction })) {
                throw new Error("Ya existe un administrador. Crea mas usuarios con el endpoint protegido.");
            }
            await db.usuarios.create({ nombre_usuario: nombre, nombre_completo: completo, contrasena_hash: hash, rol: "administrador" }, { transaction });
        });
        console.log("Administrador creado. Guarda estos datos para hacer login:");
        console.log("Usuario:", nombre);
        console.log("Contrasena:", contrasena);
        console.log("Puedes cambiar la contrasena mediante PUT /api/usuarios/update/:id.");
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") console.error("Ese nombre de usuario ya existe.");
        else console.error("No se pudo crear el administrador:", error.message);
        process.exitCode = 1;
    } finally {
        terminal.close();
        if (db) await db.sequelize.close();
    }
}

crearAdmin();
