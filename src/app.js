require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const { BASE_URL } = require("./constant");
const morganMiddleware = require("./logger/morgan.logger");
const { errorHandler } = require("./middlewares/errorHandler.middleware");
const cookieParser = require("cookie-parser");
const { apiRateLimiter } = require("./utils/apiRateLimiter");
const path = require("path");

app.use(cors());
app.use(cookieParser());

/**
 * Sets the response headers to allow cross-origin requests (CORS)
 * @param {import('express').Request} req - The request object
 * @param {import('express').Response} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "OPTIONS, GET, POST, PUT, PATCH, DELETE",
    );
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});

/**
 * Sets the response headers to allow cross-origin requests (CORS)
 * @param {import('express').Request} req - The request object
 * @param {import('express').Response} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
app.use(
    helmet({
        frameguard: {
            action: "deny",
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
        },
        referrerPolicy: {
            policy: "same-origin",
        },
    }),
);

/*Api rate limiter */
// app.use(apiRateLimiter);

/* Importing Routers */
const { userRoutes } = require("./routes/user.routes");
const { CartRoutes } = require("./routes/cart.routes");
const { adminRoutes } = require("./routes/admin.routes");
const { orderRoutes } = require("./routes/order.routes");
const { rattingRoutes } = require("./routes/ratting.routes");
const { messageRoutes } = require("./routes/message.routes");
const { partnerRoutes } = require("./routes/partner.routes");
const { isAuthenticated } = require("./middlewares/auth.middleware");
const { deliveryAgentRoutes } = require("./routes/deliveryAgent.routes");
const { notificationRoutes } = require("./routes/notification.routes");
/*Api Logger */
app.use(morganMiddleware);

app.use(`${BASE_URL}/user`, userRoutes);
app.use(`${BASE_URL}/cart`, CartRoutes);
app.use(`${BASE_URL}/order`, orderRoutes);
app.use(`${BASE_URL}/admin`, adminRoutes);
app.use(`${BASE_URL}/message`, messageRoutes);
app.use(`${BASE_URL}/partner`, partnerRoutes);
app.use(`${BASE_URL}/ratting`, rattingRoutes);
app.use(`${BASE_URL}/deliveryAgent`, deliveryAgentRoutes);
app.use(`${BASE_URL}/notification`, notificationRoutes);

app.use(
    "/uploads",
    // isAuthenticated,
    express.static(path.join(__dirname, "uploads")),
);

app.use(errorHandler);
module.exports = { app };
