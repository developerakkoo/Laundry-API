const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const categoryController = require("../controllers/category.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");
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
router.use(isAuthenticated);

router.get("/logout", adminController.logout);

router.post("/add-admin", adminController.addAdmin);

/* Category Routes */

router.post(
    "/add-category",
    multerUpload,
    categoryPermission,
    categoryController.addCategory,
    categoryController.uploadCategoryImage,
);

router.get(
    "/get-categories",
    categoryPermission,
    categoryController.getAllCategory,
);

router.get(
    "/get-category/:id",
    categoryPermission,
    categoryController.getCategoryById,
);

router.put(
    "/update-image-category",
    multerUpload,
    categoryController.uploadCategoryImage,
);

router.put(
    "/update-category/:id",
    categoryPermission,
    categoryController.updateCategory,
);

router.delete(
    "/delete-category/:id",
    categoryPermission,
    categoryController.deleteCategory,
);

/*User routes*/
router.get("/get-users", userPermission, getAllUser);

router.get("/get-user/:id", userPermission, getUserById);

router.delete("/delete-user/:id", deleteUserById);

/* Delivery agent routes */

router.get(
    "/get-delivery-agents",
    deliveryAgentPermission,
    getAllDeliveryAgent,
);

router.get(
    "/get-delivery-agent/:id",
    deliveryAgentPermission,
    getDeliveryAgentById,
);

router.put(
    "/update-delivery-agent",
    deliveryAgentPermission,
    updateDeliveryAgent,
);

router.delete(
    "/delete-delivery-agent/:id",
    deliveryAgentPermission,
    deleteDeliveryAgent,
);

/* Partner routes */

router.get("/get-partners", partnerPermission, partnerController.getAllPartner);

router.get(
    "/get-partner/:id",
    partnerPermission,
    partnerController.getPartnerById,
);

router.put(
    "/update-partner",
    partnerPermission,
    partnerController.updatePartnerById,
);

router.delete(
    "/delete-partner/:id",
    partnerPermission,
    partnerController.deletePartnerById,
);

/* Shope Routes */

router.post("/shop/add", shopePermission, partnerController.createShope);

router.post(
    "/shop/upload-image",
    shopePermission,
    multerUpload,
    partnerController.uploadShopeImage,
);

router.put("/shop/update/:id", shopePermission, partnerController.updateShope);

router.get("/shop/get/:id", shopePermission, partnerController.getShopeById);

router.get(
    "/shop/get/shopeId/:id",
    shopePermission,
    partnerController.getShopeById,
);

router.get("/shop/get-all", shopePermission, partnerController.getAllShope);

router.delete(
    "/shop/delete/:id",
    shopePermission,
    partnerController.deleteShopeById,
);

/* Service Routes */

router.post("/service/add", servicePermission, partnerController.createService);

router.post(
    "/service/upload-image",
    servicePermission,
    multerUpload,
    partnerController.uploadServiceImage,
);

router.put(
    "/service/update/:id",
    servicePermission,
    partnerController.updateService,
);

router.get(
    "/service/get/:id",
    servicePermission,
    partnerController.getServiceById,
);

router.get(
    "/service/get/categoryId/:id",
    servicePermission,
    partnerController.getAllServiceByCategoryId,
);

router.get(
    "/service/shopeId/:id",
    servicePermission,
    partnerController.getAllServiceByShopeId,
);

router.get(
    "/service/get-all",
    servicePermission,
    partnerController.getAllServices,
);

router.delete(
    "/service/delete/:id",
    servicePermission,
    partnerController.deleteService,
);

/***** Order Routes *****/

router.put("/:orderId/complete", orderPermission, completeOrder);

router.put(
    "/:orderId/assignDeliveryBoy/:deliveryBoyId",
    orderPermission,
    assignDeliveryBoyToOrder,
);

router.put(
    "/:orderId/changeStatus/:status",
    orderPermission,
    changeOrderStatus,
);

router.get("/get", orderPermission, getAllOrders);

/***** cashback routes *****/

router.post(
    "/cashback/add",
    cashbackOfferPermission,
    adminController.addCashbackOffer,
);

router.get(
    "/cashback/get/:id",
    cashbackOfferPermission,
    adminController.getCashbackOfferById,
);

router.get(
    "/cashback/get-all",
    cashbackOfferPermission,
    adminController.getAllCashbackOffer,
);

router.put(
    "/cashback/update/:id",
    cashbackOfferPermission,
    adminController.updateCashbackOffer,
);

router.delete(
    "/cashback/delete/:id",
    cashbackOfferPermission,
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

module.exports = { adminRoutes: router };
