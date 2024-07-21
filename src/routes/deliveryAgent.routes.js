const router = require("express").Router();
const deliveryAgentController = require("../controllers/deliveryAgent.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");

router.post("/register", deliveryAgentController.register);

router.post("/login", deliveryAgentController.login);

router.put(
    "/update-profile-image",
    multerUpload,
    deliveryAgentController.uploadProfileImage,
);

router.put(
    "/update/delivery-agent/document",
    multerUpload,
    deliveryAgentController.uploadDocument,
);

/* Authorize access only */
// router.use(isAuthenticated);

router.get("/logout", deliveryAgentController.logout);

router.get("/get-current-user", deliveryAgentController.getCurrentUser);

router.post("/add/ratting", deliveryAgentController.addRattingToDeliveryAgent);

router.get("/get/ratings", deliveryAgentController.getAverageRating);

module.exports = { deliveryAgentRoutes: router };
