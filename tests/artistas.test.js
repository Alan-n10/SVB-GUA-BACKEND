const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const Sequelize = require("sequelize");
const filas = new Map();
let siguienteId = 1;
let hash;
const artistas = {
    async create(datos) {
        const registro = { ...datos, id_artista: siguienteId++ };
        Object.defineProperty(registro, "update", { value: async cambios => Object.assign(registro, cambios) });
        filas.set(registro.id_artista, registro);
        return registro;
    },
    async findByPk(id) { return filas.get(Number(id)) || null; },
    async findAll({ where }) {
        const filtro = where.nombre_artistico?.[Sequelize.Op.iLike]?.slice(1, -1).toLowerCase();
        return [...filas.values()].filter(a => !filtro || a.nombre_artistico.toLowerCase().includes(filtro));
    },
    async destroy({ where }) {
        if (Number(where.id_artista) === 99) throw Object.assign(new Error("Relacionado"), { name: "SequelizeForeignKeyConstraintError" });
        return filas.delete(Number(where.id_artista)) ? 1 : 0;
    }
};
const usuarios = { scope: () => ({ findOne: async ({ where }) => ["admin", "vendedor"].includes(where.nombre_usuario) ? { rol: where.nombre_usuario === "admin" ? "administrador" : "vendedor", contrasena_hash: hash } : null }) };
const ruta = require.resolve("../app/models");
require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports: { artistas, usuarios, Sequelize } };
const app = require("../app/app");

test("Artistas: CRUD HTTP, filtro, validaciones y permisos", async () => {
    hash = await bcrypt.hash("Prueba123", 4);
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    async function pedir(path, method = "GET", body, usuario = "admin") {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/artistas${path}`, {
            method,
            headers: { "Content-Type": "application/json", ...(usuario ? { Authorization: "Basic " + Buffer.from(usuario + ":Prueba123").toString("base64") } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        return { status: response.status, data: await response.json() };
    }
    try {
        assert.equal((await pedir("/", "GET", undefined, null)).status, 401);
        const datos = { nombre_artistico: "Ricardo Arjona", genero_musical: "Pop latino", pais_origen: "Guatemala" };
        assert.equal((await pedir("/create", "POST", datos, "vendedor")).status, 403);
        for (const body of [{}, { ...datos, nombre_artistico: " " }, { ...datos, genero_musical: 5 }, { ...datos, pais_origen: false }, { ...datos, nombre_artistico: "a".repeat(121) }]) {
            assert.equal((await pedir("/create", "POST", body)).status, 400);
        }
        const creado = await pedir("/create", "POST", { ...datos, id_artista: 999 });
        assert.equal(creado.status, 201);
        assert.equal(creado.data.id_artista, 1);
        assert.equal((await pedir("/1", "GET", undefined, "vendedor")).data.pais_origen, "Guatemala");
        assert.equal((await pedir("/?nombre_artistico=ricardo")).data.length, 1);
        assert.equal((await pedir("/?nombre_artistico=otro")).data.length, 0);
        assert.equal((await pedir("/?nombre_artistico=a&nombre_artistico=b")).status, 400);
        assert.equal((await pedir("/abc")).status, 400);
        assert.equal((await pedir("/200")).status, 404);
        assert.equal((await pedir("/update/1", "PUT", datos, "vendedor")).status, 403);
        assert.equal((await pedir("/delete/1", "DELETE", undefined, "vendedor")).status, 403);
        assert.equal((await pedir("/update/1", "PUT", {})).status, 400);
        assert.equal((await pedir("/update/200", "PUT", datos)).status, 404);
        const actualizado = await pedir("/update/1", "PUT", { nombre_artistico: "Nombre nuevo", genero_musical: "Rock" });
        assert.equal(actualizado.status, 200);
        assert.equal(actualizado.data.nombre_artistico, "Nombre nuevo");
        assert.equal(actualizado.data.pais_origen, null);
        assert.equal((await pedir("/delete/99", "DELETE")).status, 409);
        assert.equal((await pedir("/delete/1", "DELETE")).status, 200);
        assert.equal((await pedir("/delete/1", "DELETE")).status, 404);
        assert.equal((await pedir("/")).data.length, 0);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
});