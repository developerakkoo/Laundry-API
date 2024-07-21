const router = require("express").Router();
const messageController = require("../controllers/message.controller");
const { isAuthenticated } = require("../middlewares/auth.middleware");
const { multerUpload } = require("../middlewares/fileHandler.middleware");

// router.use(isAuthenticated);

router.get("/get/chat-list/:userId", messageController.getMyChatList);

router.post(
    "/send",
    messageController.checkChatExist,
    messageController.sendMessage,
);

router.post(
    "/multimedia-send",
    multerUpload,
    messageController.checkChatExist,
    messageController.sendMultimediaMessage,
);

router.get("/get/:messageId", messageController.getMessageById);

router.get("/get/all/:userId", messageController.getAllMessageByUserId);

router.put("/markAsRead/:messageId", messageController.markAsRead);

router.delete("/delete/:messageId", messageController.deleteMessageById);

module.exports = { messageRoutes: router };
