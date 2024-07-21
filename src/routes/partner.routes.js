const partnerController = require("../controllers/partner.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");
const router = require("express").Router();

router.post("/register", partnerController.registerUser);

router.post("/login", partnerController.login);

router.post(
    "/upload-image",
    multerUpload,
    partnerController.uploadProfileImage,
);

router.put("/update-profile", partnerController.updatePartnerById);

/* Authorize access only */
// router.use(isAuthenticated);

router.get("/get-current-user", partnerController.getCurrentUser);

router.get("/logout", partnerController.logout);

/***** Shope Routes *****/

router.post("/shop/add", partnerController.createShope);

router.post(
    "/shop/upload-image",
    multerUpload,
    partnerController.uploadShopeImage,
);

router.put("/shop/update/:id", partnerController.updateShope);

router.get("/shop/get/:id", partnerController.getShopeById);

router.get("/shop/get/partnerId/:id", partnerController.getAllShopeByPartnerId);

router.get("get/by/category/:id", partnerController.getShopeByCategoryId);

router.get("/shop/get-all", partnerController.getAllShope);

router.delete("/shop/delete/:id", partnerController.deleteShopeById);

/***** Service Routes *****/

router.post("/service/add", partnerController.createService);

router.post(
    "/service/upload-image",
    multerUpload,
    partnerController.uploadServiceImage,
);

router.put("/service/update/:id", partnerController.updateService);

router.get("/service/get/:id", partnerController.getServiceById);

router.get(
    "/service/get/categoryId/:id",
    partnerController.getAllServiceByCategoryId,
);

router.get("/service/get/shopId/:id", partnerController.getAllServiceByShopeId);

router.get("/service/get-all", partnerController.getAllServices);

router.delete("/service/delete/:id", partnerController.deleteService);

module.exports = { partnerRoutes: router };
