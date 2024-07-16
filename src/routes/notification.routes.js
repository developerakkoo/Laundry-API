const router = require("express").Router();
const notificationController = require("../controllers/notification.controller");

router.get("/get/byId", notificationController.getNotificationById);

router.get(
    "/get/all/user/:userId",
    notificationController.getAllNotificationsByUserId,
);

router.put("/read/:id", notificationController.markNotificationAsRead);

router.delete("/delete/:id", notificationController.deleteNotificationById);

module.exports = { notificationRoutes: router };
