const router = require("express").Router();
const rattingController = require("../controllers/ratting.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

/* Authorize access only */
router.use(isAuthenticated);

router.post("/add", rattingController.addRatting);

router.put("/update", rattingController.updateRatting);

router.get("/get/:id", rattingController.getRatting);

router.get("/get-by/userId/:userId", rattingController.getRattingByUser);

router.get(
    "/get-by/serviceId/:serviceId",
    rattingController.getRattingByService,
);

router.get(
    "/stats/get-by/serviceId/:serviceId",
    rattingController.getRattingStatsByService,
);

router.get(
    "/stats/get-by/shopId/:shopId",
    rattingController.getRattingStatsByShop,
);

router.delete("/delete/:id", rattingController.deleteRating);

module.exports = { rattingRoutes: router };
