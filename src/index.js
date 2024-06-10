require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./db/index.db");
const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at port : ${PORT} in ${process.env.NODE_ENV} mode`);
        });
    })
    .catch((err) => {
        console.log("MONGODB contention error", err);
    });
