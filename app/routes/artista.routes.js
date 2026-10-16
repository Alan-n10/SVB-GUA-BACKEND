module.exports = app => {
    const artistas = require("../controllers/artista.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    // Administradores y vendedores pueden consultar el catalogo.
    router.use(auth.verificarCredenciales);
    router.get("/", artistas.findAll);
    router.get("/:id", artistas.findOne);

    // Solo el administrador puede modificar el catalogo.
    router.post("/create", auth.esAdministrador, artistas.create);
    router.put("/update/:id", auth.esAdministrador, artistas.update);
    router.delete("/delete/:id", auth.esAdministrador, artistas.delete);

    app.use("/api/artistas", router);
};
