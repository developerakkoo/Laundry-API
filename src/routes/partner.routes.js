const partnerController = require("../controllers/partner.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");
const router = require("express").Router();

router.post(
    "/register",
    partnerController.registerUser, // fist create partner and
    partnerController.createShope, //  then using partner id create the shop
);

router.post("/login", partnerController.login);

router.post(
    "/document/upload",
    multerUpload,
    partnerController.uploadPartnerDocuments,
);

router.get(
    "/documents/getall/:userId",
    partnerController.getDocumentsByPartnerId,
);

router.get("/document/:id", partnerController.getPartnerDocumentId);

router.post(
    "/upload-image",
    multerUpload,
    partnerController.uploadProfileImage,
);

router.put("/update-profile", partnerController.updatePartnerById);

/* Authorize access only */
// router.use(isAuthenticated);

router.get("/get-current-user/:id", partnerController.getCurrentUser);

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

router.post("/shop/get/by/category", partnerController.getShopeByCategoryId);

router.post("/shop/like/:shopId/:userId", partnerController.likeShop);

router.post("/shop/unlike/:shopId/:userId", partnerController.unlikeShop);

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

router.get("/category/getAll",partnerController.getAllCategory);
router.delete("/service/delete/:id", partnerController.deleteService);

/* Partner Dash  */

router.get("/dashboard/stats", partnerController.getPartnerDashData);

module.exports = { partnerRoutes: router };
