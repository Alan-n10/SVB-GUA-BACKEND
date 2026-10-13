module.exports = app => {
    const usuarios = require("../controllers/usuario.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    router.post("/login", usuarios.login);
    router.get("/me", auth.verificarCredenciales, usuarios.me);

    // Conservamos el estilo /create, /update/:id y /delete/:id de tu otra API.
    router.use(auth.verificarCredenciales, auth.esAdministrador);
    router.post("/create", usuarios.create);
    router.get("/", usuarios.findAll);
    router.get("/:id", usuarios.findOne);
    router.put("/update/:id", usuarios.update);
    router.delete("/delete/:id", usuarios.delete);

    app.use("/api/usuarios", router);
};

