const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const categoryController = require("../controllers/category.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const {
    multerUpload,
    upload,
} = require("../middlewares/fileHandler.middleware");
const promoCodeController = require("../controllers/promoCode.controller");
const {
    getAllUser,
    getUserById,
    deleteUserById,
} = require("../controllers/user.controller");
const {
    getAllDeliveryAgent,
    getDeliveryAgentById,
    updateDeliveryAgent,
    deleteDeliveryAgent,
} = require("../controllers/deliveryAgent.controller");
const partnerController = require("../controllers/partner.controller");
const {
    getAllOrders,
    completeOrder,
    changeOrderStatus,
    assignDeliveryBoyToOrder,
    bulkDelete,
} = require("../controllers/order.controller");
const {
    userPermission,
    shopePermission,
    orderPermission,
    servicePermission,
    partnerPermission,
    categoryPermission,
    deliveryAgentPermission,
    cashbackOfferPermission,
} = require("../middlewares/adminPermission.middleware");

router.post("/register", adminController.createAdmin);

router.post("/login", adminController.login);

/***** No admin access require routes *****/

router.get("/promoCode/get-all", promoCodeController.getAllPromoCodes);

/************************************************************************************************************************************************************/

/* Authorize access only */
// router.use(isAuthenticated);

router.get("/logout", adminController.logout);

router.post("/add-admin", adminController.addAdmin);

/* Category Routes */

router.post(
    "/add-category",
    multerUpload,
    categoryController.addCategory,
    categoryController.uploadCategoryImage,
);

router.get(
    "/get-categories",
    categoryController.getAllCategory,
);

router.get(
    "/get-category/:id",
    categoryController.getCategoryById,
);

router.put(
    "/update-image-category",
    multerUpload,
    categoryController.uploadCategoryImage,
);

router.put(
    "/update-category/:id",
    categoryController.updateCategory,
);

router.delete(
    "/delete-category/:id",
    categoryController.deleteCategory,
);

/*User routes*/
router.get("/get-users", getAllUser);

router.get("/get-user/:id", userPermission, getUserById);

router.delete("/delete-user/:id", deleteUserById);

/* Delivery agent routes */

router.get(
    "/get-delivery-agents",
    getAllDeliveryAgent,
);

router.get(
    "/get-delivery-agent/:id",
    getDeliveryAgentById,
);

router.put(
    "/update-delivery-agent",
    updateDeliveryAgent,
);

router.delete(
    "/delete-delivery-agent/:id",
    deleteDeliveryAgent,
);

/* Partner routes */

router.get("/get-partners", partnerController.getAllPartner);

router.get(
    "/get-partner/:id",
    partnerController.getPartnerById,
);

router.put(
    "/update-partner",
    partnerController.updatePartnerById,
);

router.delete(
    "/delete-partner/:id",
    partnerController.deletePartnerById,
);

/* Shope Routes */

router.post("/shop/add", partnerController.createShope);

router.post(
    "/shop/upload-image",
    multerUpload,
    partnerController.uploadShopeImage,
);

router.put("/shop/update/:id", partnerController.updateShope);

router.get("/shop/get/:id", partnerController.getShopeById);

router.get(
    "/shop/get/shopeId/:id",
    partnerController.getShopeById,
);

router.get("/shop/get-all", partnerController.getAllShope);

router.delete(
    "/shop/delete/:id",
    partnerController.deleteShopeById,
);

/* Service Routes */

router.post("/service/add", partnerController.createService);

router.post(
    "/service/upload-image",
    multerUpload,
    partnerController.uploadServiceImage,
);

router.put(
    "/service/update/:id",
    partnerController.updateService,
);

router.get(
    "/service/get/:id",
    partnerController.getServiceById,
);

router.get(
    "/service/get/categoryId/:id",
    partnerController.getAllServiceByCategoryId,
);

router.get(
    "/service/shopeId/:id",
    partnerController.getAllServiceByShopeId,
);

router.get(
    "/service/get-all",
    partnerController.getAllServices,
);

router.delete(
    "/service/delete/:id",
    partnerController.deleteService,
);

/***** Order Routes *****/

router.put("/order/:orderId/complete", changeOrderStatus);

router.put(
    "/order/:orderId/assignDeliveryBoy/:deliveryBoyId",
    assignDeliveryBoyToOrder,
);

router.put(
    "/order/:orderId/changeStatus/:status",
    changeOrderStatus,
);

router.get("/order/get", getAllOrders);

router.delete("/order/delete-data", bulkDelete);

/***** cashback routes *****/

router.post(
    "/cashback/add",
    adminController.addCashbackOffer,
);

router.get(
    "/cashback/get/:id",
    adminController.getCashbackOfferById,
);

router.get(
    "/cashback/get-all",
    adminController.getAllCashbackOffer,
);

router.put(
    "/cashback/update/:id",
    adminController.updateCashbackOffer,
);

router.delete(
    "/cashback/delete/:id",
    adminController.deleteCashbackOffer,
);

/***** Promo code routes *****/
router.post("/promoCode/add", promoCodeController.addPromoCode);

router.put(
    "/promoCode/update/:promoCodeId",
    promoCodeController.updatedPromoCode,
);

router.get("/promoCode/get/:promoCodeId", promoCodeController.getPromoCode);

router.delete(
    "/promoCode/delete/:promoCodeId",
    promoCodeController.deletePromoCode,
);

/***** Dashboard Routes *****/

router.get("/dashboard/stats", adminController.getDashboardStats);

router.get(
    "/dashboard/totalRevenue/chart",
    adminController.totalRevenueChartData,
);

/* DATA */

router.post("/add/data", adminController.createData);

router.get("/get/data", adminController.getData);

router.put("/update/data/:id", adminController.updateData);

/* Subscription Plan Routes */

router.post("/subscriptionPlan/add", adminController.createSubscriptionPlan);

router.get(
    "/subscriptionPlan/get/:id",
    adminController.getSubscriptionPlanById,
);

router.get(
    "/subscriptionPlan/get-all",
    adminController.getAllSubscriptionPlans,
);

router.put(
    "/subscriptionPlan/:id/features/:featureId",
    adminController.modifyFeatureInSubscriptionPlan,
);

router.put(
    "/subscriptionPlan/update/:id",
    adminController.updateSubscriptionPlan,
);

router.delete(
    "/subscriptionPlan/delete/:id",
    adminController.deleteSubscriptionPlan,
);

/* Banner Routes */

router.post("/banner/add", multerUpload, adminController.createBanner);

router.get("/banner/get-all", adminController.getAllBanners);

router.get("/banner/delete/:id", adminController.deleteBanner);

/* Video add routes */

router.post(
    "/video/upload",
    upload.array("video", 5),
    adminController.addVideos,
);

router.get("/video/get/:videoId", adminController.getVideoById);

router.get("/video/all", adminController.getAllVideos);

router.delete("/video/delete/:videoId", adminController.deleteVideo);

/* send custom firebase notification to users */

router.post(
    "/send-notification",
    adminController.sendCustomFirebaseNotification,
);

module.exports = { adminRoutes: router };
