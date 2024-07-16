let io;

module.exports = {
    init: (httpServer) => {
        io = require("socket.io")(httpServer, {
            cors: {
                origins: [
                    "http://localhost:8100",
                    "http://localhost:8200",
                    "http://localhost:8080",
                    "http://localhost:8101",
                    "0.0.0.0",
                    "*",
                ],
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                credentials: true,
            },
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            throw new Error("Socket not Initialized");
        }

        return io;
    },
};
