const router = require("express").Router();
const { getAllSubscriptionPlans } = require("../controllers/admin.controller");
const {
    purchaseSubscription,
    getUserSubscription,
} = require("../controllers/subscription.controller");

router.get("/get/all-plans", getAllSubscriptionPlans);

router.post("/purchase", purchaseSubscription);

router.get("/get/:userId", getUserSubscription);

module.exports = { userSubscriptionRoutes: router };
