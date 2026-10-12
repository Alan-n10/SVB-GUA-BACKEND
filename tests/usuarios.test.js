const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Sequelize = require("sequelize");

// Probamos HTTP real con persistencia simulada: estas pruebas nunca usan Neon.
process.env.JWT_SECRET = "clave-de-pruebas-aisladas-de-al-menos-32-caracteres";
const filas = new Map();
let siguienteId = 3;
function registro(datos) {
    return {
        ...datos,
        toJSON() { const copia = { ...this }; delete copia.toJSON; delete copia.update; return copia; },
        async update(cambios) {
            if ([...filas.values()].some(u => u.id_usuario !== this.id_usuario && u.nombre_usuario === cambios.nombre_usuario)) {
                throw Object.assign(new Error("Duplicado"), { name: "SequelizeUniqueConstraintError" });
            }
            Object.assign(this, cambios);
            return this;
        }
    };
}
const Usuario = {
    async findByPk(id) { return filas.get(Number(id)) || null; },
    scope() { return { findOne: async ({ where }) => [...filas.values()].find(u => u.nombre_usuario === where.nombre_usuario) || null }; },
    async create(datos) {
        if ([...filas.values()].some(u => u.nombre_usuario === datos.nombre_usuario)) {
            throw Object.assign(new Error("Duplicado"), { name: "SequelizeUniqueConstraintError" });
        }
        const usuario = registro({ ...datos, id_usuario: siguienteId++, fecha_creacion: new Date().toISOString() });
        filas.set(usuario.id_usuario, usuario);
        return usuario;
    },
    async findAll({ where }) {
        const filtro = where.nombre_usuario?.[Sequelize.Op.iLike]?.slice(1, -1).toLowerCase();
        return [...filas.values()].filter(u => !filtro || u.nombre_usuario.toLowerCase().includes(filtro));
    },
    async destroy({ where }) { return filas.delete(Number(where.id_usuario)) ? 1 : 0; }
};
const rutaDb = require.resolve("../app/models");
require.cache[rutaDb] = { id: rutaDb, filename: rutaDb, loaded: true, exports: { usuarios: Usuario, Sequelize } };
const app = require("../app/app");

test("Usuarios: login, permisos, CRUD, hash y validaciones", async () => {
    const hash = await bcrypt.hash("AdminPrueba123", 4);
    filas.set(1, registro({ id_usuario: 1, nombre_usuario: "admin", nombre_completo: "Administrador", rol: "administrador", contrasena_hash: hash }));
    filas.set(2, registro({ id_usuario: 2, nombre_usuario: "vendedor", nombre_completo: "Vendedor", rol: "vendedor", contrasena_hash: hash }));
    const servidor = app.listen(0, "127.0.0.1");
    await new Promise(resolve => servidor.once("listening", resolve));
    const base = `http://127.0.0.1:${servidor.address().port}/api/usuarios`;
    async function pedir(ruta, metodo = "GET", cuerpo, token) {
        const respuesta = await fetch(base + ruta, {
            method: metodo,
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) })
        });
        return { status: respuesta.status, datos: await respuesta.json() };
    }
    try {
        assert.equal((await pedir("/")).status, 401);
        assert.equal((await pedir("/login", "POST", { nombre_usuario: "admin", contrasena: "incorrecta" })).status, 401);
        const sesion = await pedir("/login", "POST", { nombre_usuario: "admin", contrasena: "AdminPrueba123" });
        assert.equal(sesion.status, 200);
        assert(!("contrasena_hash" in sesion.datos.usuario));
        const token = sesion.datos.token;
        assert.equal((await pedir("/me", "GET", undefined, token)).datos.id_usuario, 1);
        const ventaSesion = await pedir("/login", "POST", { nombre_usuario: "vendedor", contrasena: "AdminPrueba123" });
        assert.equal((await pedir("/", "GET", undefined, ventaSesion.datos.token)).status, 403);
        const datos = { nombre_usuario: "nuevo", nombre_completo: "Usuario Nuevo", rol: "vendedor", contrasena: "NuevaPrueba123" };
        const creado = await pedir("/create", "POST", datos, token);
        assert.equal(creado.status, 201);
        const id = creado.datos.id_usuario;
        assert(!("contrasena_hash" in creado.datos));
        assert(await bcrypt.compare(datos.contrasena, filas.get(id).contrasena_hash));
        assert.equal((await pedir("/create", "POST", datos, token)).status, 409);
        for (const cambio of [{ rol: "otro" }, { contrasena: "123" }, { contrasena: "a".repeat(73) }, { nombre_usuario: " " }, { nombre_completo: "a".repeat(101) }, { contrasena_hash: "hash-manual" }]) {
            assert.equal((await pedir("/create", "POST", { ...datos, ...cambio }, token)).status, 400);
        }
        const lista = await pedir("/?nombre_usuario=nuevo", "GET", undefined, token);
        assert.equal(lista.status, 200);
        assert.equal(lista.datos.length, 1);
        assert(!("contrasena_hash" in lista.datos[0]));
        assert.equal((await pedir(`/${id}`, "GET", undefined, token)).status, 200);
        assert.equal((await pedir("/999", "GET", undefined, token)).status, 404);
        assert.equal((await pedir("/abc", "GET", undefined, token)).status, 400);
        assert.equal((await pedir(`/update/${id}`, "PUT", {}, token)).status, 400);
        assert.equal((await pedir(`/update/${id}`, "PUT", { id_usuario: 20 }, token)).status, 400);
        assert.equal((await pedir("/update/1", "PUT", { rol: "vendedor" }, token)).status, 409);
        const actualizado = await pedir(`/update/${id}`, "PUT", { nombre_completo: "Nombre Modificado", contrasena: "OtraPrueba123" }, token);
        assert.equal(actualizado.status, 200);
        assert.equal(actualizado.datos.nombre_completo, "Nombre Modificado");
        assert(!("contrasena_hash" in actualizado.datos));
        assert.equal((await pedir("/login", "POST", { nombre_usuario: "nuevo", contrasena: "NuevaPrueba123" })).status, 401);
        const nuevaSesion = await pedir("/login", "POST", { nombre_usuario: "nuevo", contrasena: "OtraPrueba123" });
        assert.equal(nuevaSesion.status, 200);
        const expirado = jwt.sign({}, process.env.JWT_SECRET, { subject: "1", expiresIn: -1 });
        assert.equal((await pedir("/me", "GET", undefined, expirado)).status, 401);
        assert.equal((await pedir("/delete/1", "DELETE", undefined, token)).status, 409);
        assert.equal((await pedir(`/delete/${id}`, "DELETE", undefined, token)).status, 200);
        assert.equal((await pedir("/me", "GET", undefined, nuevaSesion.datos.token)).status, 401);
        assert.equal((await pedir(`/delete/${id}`, "DELETE", undefined, token)).status, 404);
        // Los permisos se consultan en cada peticion: un token antiguo no conserva el rol.
        filas.get(1).rol = "vendedor";
        assert.equal((await pedir("/", "GET", undefined, token)).status, 403);
    } finally {
        await new Promise(resolve => servidor.close(resolve));
    }
});
