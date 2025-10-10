const router = require("express").Router();
const deliveryAgentController = require("../controllers/deliveryAgent.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");
// const { calculateDistanceInKm } = require("../utils/helper.utils");

router.post("/register", deliveryAgentController.register);

router.post("/login", deliveryAgentController.login);

router.get('/get/:id', deliveryAgentController.getDeliveryAgentById);
router.put(
    "/update-profile-image",
    multerUpload,
    deliveryAgentController.uploadProfileImage,
);

router.put(
    "/update/profile",
    deliveryAgentController.updateDeliveryAgent,
);

router.put(
    "/update/delivery-agent/document",
    multerUpload,
    deliveryAgentController.uploadDocument,
);

/* Authorize access only */
// router.use(isAuthenticated);

router.get("/logout", deliveryAgentController.logout);

router.post("/add/ratting", deliveryAgentController.addRattingToDeliveryAgent);

router.get("/get/ratings", deliveryAgentController.getAverageRating);
router.get('/get/earnings/:agentId', deliveryAgentController.getAgentOrdersCompPlain);

// Earnings
router.get("/earnings", deliveryAgentController.getDriverEarnings);

// router.get("/test-distance", async (req, res) => {
//   try {
//     // Example coordinates: Pune Station → Swargate
//     const pickupCoords = [73.8640, 18.5308]; // [lon, lat]
//     const dropCoords = [73.8652, 18.5016];   // [lon, lat]

//     const distance = calculateDistanceInKm(pickupCoords, dropCoords);
//     res.json({
      // pickup: "Pune Station, Pune",
//       drop: "Swargate, Pune",
//       distance: `${distance.toFixed(2)} km`
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error calculating distance", error: err.message });
//   }
// });

module.exports = { deliveryAgentRoutes: router };
