const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const Sequelize = require("sequelize");

// Probamos HTTP real con persistencia simulada: estas pruebas nunca usan Neon.

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
    async function pedir(ruta, metodo = "GET", cuerpo, credenciales) {
        const respuesta = await fetch(base + ruta, {
            method: metodo,
            headers: { "Content-Type": "application/json", ...(credenciales ? { Authorization: `Basic ${Buffer.from(credenciales).toString("base64")}` } : {}) },
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
        assert(!("token" in sesion.datos));
        const admin = "admin:AdminPrueba123";
        assert.equal((await pedir("/me", "GET", undefined, admin)).datos.id_usuario, 1);
        const ventaSesion = await pedir("/login", "POST", { nombre_usuario: "vendedor", contrasena: "AdminPrueba123" });
        assert.equal((await pedir("/", "GET", undefined, "vendedor:AdminPrueba123")).status, 403);
        const datos = { nombre_usuario: "nuevo", nombre_completo: "Usuario Nuevo", rol: "vendedor", contrasena: "NuevaPrueba123" };
        const creado = await pedir("/create", "POST", datos, admin);
        assert.equal(creado.status, 201);
        const id = creado.datos.id_usuario;
        assert(!("contrasena_hash" in creado.datos));
        assert(await bcrypt.compare(datos.contrasena, filas.get(id).contrasena_hash));
        assert.equal((await pedir("/create", "POST", datos, admin)).status, 409);
        for (const cambio of [{ rol: "otro" }, { contrasena: "123" }, { contrasena: "a".repeat(73) }, { nombre_usuario: " " }, { nombre_completo: "a".repeat(101) }, { contrasena_hash: "hash-manual" }]) {
            assert.equal((await pedir("/create", "POST", { ...datos, ...cambio }, admin)).status, 400);
        }
        const lista = await pedir("/?nombre_usuario=nuevo", "GET", undefined, admin);
        assert.equal(lista.status, 200);
        assert.equal(lista.datos.length, 1);
        assert(!("contrasena_hash" in lista.datos[0]));
        assert.equal((await pedir(`/${id}`, "GET", undefined, admin)).status, 200);
        assert.equal((await pedir("/999", "GET", undefined, admin)).status, 404);
        assert.equal((await pedir("/abc", "GET", undefined, admin)).status, 400);
        assert.equal((await pedir(`/update/${id}`, "PUT", {}, admin)).status, 400);
        assert.equal((await pedir(`/update/${id}`, "PUT", { id_usuario: 20 }, admin)).status, 400);
        assert.equal((await pedir("/update/1", "PUT", { rol: "vendedor" }, admin)).status, 409);
        const actualizado = await pedir(`/update/${id}`, "PUT", { nombre_completo: "Nombre Modificado", contrasena: "OtraPrueba123" }, admin);
        assert.equal(actualizado.status, 200);
        assert.equal(actualizado.datos.nombre_completo, "Nombre Modificado");
        assert(!("contrasena_hash" in actualizado.datos));
        assert.equal((await pedir("/login", "POST", { nombre_usuario: "nuevo", contrasena: "NuevaPrueba123" })).status, 401);
        const nuevaSesion = await pedir("/login", "POST", { nombre_usuario: "nuevo", contrasena: "OtraPrueba123" });
        assert.equal(nuevaSesion.status, 200);
        assert.equal((await pedir("/me", "GET", undefined, "nuevo:NuevaPrueba123")).status, 401);
        assert.equal((await pedir("/me", "GET", undefined, "nuevo:OtraPrueba123")).status, 200);
        assert.equal((await pedir("/me", "GET", undefined, "admin:incorrecta")).status, 401);
        assert.equal((await pedir("/me", "GET", undefined, "admin")).status, 401);
        assert.equal((await pedir("/delete/1", "DELETE", undefined, admin)).status, 409);
        assert.equal((await pedir(`/delete/${id}`, "DELETE", undefined, admin)).status, 200);
        assert.equal((await pedir("/me", "GET", undefined, "nuevo:OtraPrueba123")).status, 401);
        assert.equal((await pedir(`/delete/${id}`, "DELETE", undefined, admin)).status, 404);
        // Los permisos se consultan en cada peticion, aunque las credenciales no cambien.
        filas.get(1).rol = "vendedor";
        assert.equal((await pedir("/", "GET", undefined, admin)).status, 403);
    } finally {
        await new Promise(resolve => servidor.close(resolve));
    }
});

