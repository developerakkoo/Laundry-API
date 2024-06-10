const router = require("express").Router();
const orderController = require("../controllers/order.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");

/* Authorize access only */
router.use(isAuthenticated);

router.post("/place", orderController.createOrder);



router.get(
    "/get-by/deliveryBoyId/:deliveryBoyId",
    orderController.getAllOrderByDeliveryBoyId,
);

router.get("/get/:orderId", orderController.getOrderById);

router.get("/get-by/userId/:userId", orderController.getAllOrdersByUserId);

router.get("/get-by/shopId/:shopId", orderController.getOrdersByShopeId);


module.exports = { orderRoutes: router };
