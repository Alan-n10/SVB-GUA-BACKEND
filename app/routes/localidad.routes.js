module.exports = app => {
    const localidades = require("../controllers/localidad.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    // Administradores y vendedores pueden consultar las localidades.
    router.use(auth.verificarCredenciales);
    router.get("/", localidades.findAll);
    router.get("/:id", localidades.findOne);

    // Solo los administradores modifican el catalogo.
    router.post("/create", auth.esAdministrador, localidades.create);
    router.put("/update/:id", auth.esAdministrador, localidades.update);
    router.delete("/delete/:id", auth.esAdministrador, localidades.delete);

    app.use("/api/localidades", router);
};
