const router = require("express").Router();
const rattingController = require("../controllers/ratting.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/fileHandler.middleware");

/* Authorize access only */
// router.use(isAuthenticated);

router.post("/add", upload.array("image", 5), rattingController.addRatting);

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
