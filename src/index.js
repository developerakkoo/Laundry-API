require("dotenv").config();
const { app } = require("./app");
const { connectDB } = require("./db/index.db");
const PORT = process.env.PORT || 3000;
let server;

connectDB()
    .then(() => {
        server = app.listen(PORT, () => {
            console.log(
                `Server is running at port : ${PORT} in ${process.env.NODE_ENV} mode`,
            );
        });
        const io = require("./utils/socket").init(server);

        io.on("connection", async (socket) => {
            // let { userId } = await jwt.verify(
            //     socket.handshake.auth.token,
            //     process.env.JWT_ACCESS_SECRET_KEY,
            // );
            console.log("User connected");

            // await User.findByIdAndUpdate(
            //     userId,
            //     { $set: { isOnline: true } },
            //     { new: true },
            // ); //update user status to online
            // socket.broadcast.emit("onlineUsers", { user: userId });
            socket.on("disconnect", async () => {
                // const userId = socket.handshake.auth.token;
                // await User.findByIdAndUpdate(userId, {
                //     $set: { isOnline: false },
                // }); //update user status to offline
                // socket.broadcast.emit("offlineUsers", { user: userId });
                console.log("User Disconnected");
            });
        });
    })
    .catch((err) => {
        console.log("MONGODB contention error", err);
    });
