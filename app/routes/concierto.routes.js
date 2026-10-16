module.exports = app => {
    const conciertos = require("../controllers/concierto.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    // Administradores y vendedores pueden consultar la agenda.
    router.use(auth.verificarCredenciales);
    router.get("/", conciertos.findAll);
    router.get("/:id", conciertos.findOne);

    // Solo administradores gestionan conciertos.
    router.post("/create", auth.esAdministrador, conciertos.create);
    router.put("/update/:id", auth.esAdministrador, conciertos.update);
    router.delete("/delete/:id", auth.esAdministrador, conciertos.delete);

    app.use("/api/conciertos", router);
};
