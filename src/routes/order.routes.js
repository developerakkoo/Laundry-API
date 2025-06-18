const router = require("express").Router();
const orderController = require("../controllers/order.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

/* Authorize access only */
// router.use(isAuthenticated);

router.post("/calculate/amount-to-pay", orderController.calculateAmountToPay);

router.post("/initiate/payment", orderController.initiatePayment);

router.post("/place", orderController.createOrder);

router.post("/generate/otp", orderController.generateOtp);

router.post(
    "/verify/otp/update-order",
    orderController.verifyOtpAndUpdateOrderStatus,
);

router.put("/update/order-status", orderController.changeOrderStatus);

router.put("/assign/deliveryAgent", orderController.assignDeliveryBoyToOrder);

router.get(
    "/get-by/deliveryBoyId/:deliveryBoyId",
    orderController.getAllOrderByDeliveryBoyId,
);

router.get("/get/status", orderController.getOrderByStatus);
router.get("/get/:orderId", orderController.getOrderById);

router.get("/get-by/userId/:userId", orderController.getAllOrdersByUserId);

router.get("/get/order/:userId", orderController.getUserOrderByUserId);

router.get("/get-by/shopId/:shopId", orderController.getOrdersByShopeId);

router.delete("/delete/:orderId", orderController.deleteOrderById);

module.exports = { orderRoutes: router };
