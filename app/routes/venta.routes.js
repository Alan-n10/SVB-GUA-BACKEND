module.exports = app => {
    const ventas = require("../controllers/venta.controller");
    const auth = require("../middlewares/auth.middleware");
    const router = require("express").Router();

    // Solo los usuarios autenticados pueden vender o consultar el historial.
    router.use(auth.verificarCredenciales);
    router.post("/create", ventas.create);
    router.get("/", ventas.findAll);
    router.get("/:id", ventas.findOne);

    app.use("/api/ventas", router);
};
