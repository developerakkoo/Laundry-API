const router = require("express").Router();
const messageController = require("../controllers/message.controller");
const {
    messagePermission,
} = require("../middlewares/adminPermission.middleware");
const { isAuthenticated } = require("../middlewares/auth.middleware");

/* Authorize access only */
router.use(isAuthenticated);

router.post("/send", messageController.sendMessage);

router.put("/:id/update/:status", messageController.updateMessageStatus);

router.get("/get/all", messagePermission, messageController.getAllMessages);

router.get("/get/:id", messageController.getMessageById);

router.get("/get-by/userId/:userId", messageController.getMessagesByUserId);


router.delete(
    "/:id/delete",
    messagePermission,
    messageController.deleteMessage,
);

module.exports = { messageRoutes: router };
