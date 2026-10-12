require("dotenv").config();
const app = require("./app/app");

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`SVB-GUA API disponible en http://localhost:${PORT}`);
});
