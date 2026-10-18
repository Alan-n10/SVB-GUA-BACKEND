module.exports = app => {
    const inventario = require("../controllers/inventarioBoleto.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    // Administradores y vendedores pueden consultar disponibilidad.
    router.use(auth.verificarCredenciales);
    router.get("/", inventario.findAll);
    router.get("/:id", inventario.findOne);

    // Solo el administrador configura precios y cantidades.
    router.post("/create", auth.esAdministrador, inventario.create);
    router.put("/update/:id", auth.esAdministrador, inventario.update);
    router.delete("/delete/:id", auth.esAdministrador, inventario.delete);

    app.use("/api/inventario-boletos", router);
};
