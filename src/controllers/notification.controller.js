const Notification = require("../models/notification.model");
const {
    ApiResponse,
    asyncHandler,
    sendResponse,
} = require("../utils/helper.utils");
const { sendFirebaseNotification } = require("../utils/firebaseNotifier.utils");
const { getIO } = require("../utils/socket");
const userModel = require("../models/user.model");

exports.sendNotification = async (
    userId,
    title = "New Notification",
    content,
    role = 0,
) => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            content,
        });
        getIO().emit(userId, notification);
        if (role == 1) {
            const user = await userModel.findById(userId);
            if (user && user?.firebaseToken) {
                await sendFirebaseNotification(
                    [user.firebaseToken],
                    "New Message",
                    "New Message From Admin",
                );
            }
        }
    } catch (error) {
        console.log(error.message);
    }
};

exports.getNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
        return sendResponse(res, 404, {}, "Notification not found");
    }
    return sendResponse(res, notification, "Notification found");
});

exports.getAllNotificationsByUserId = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({
        userId: req.params.userId,
    }).sort({
        createdAt: -1,
    });
    if (notifications.length === 0) {
        return sendResponse(res, 404, {}, "No notifications found");
    }
    return sendResponse(
        res,
        200,
        notifications,
        "notification fetched successfully",
    );
});

exports.markNotificationAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { read: true },
        { new: true },
    );
    if (!notification) {
        return sendResponse(res, 404, {}, "Notification not found");
    }
    return sendResponse(200, notification, "Notification marked as read");
});

exports.deleteNotificationById = asyncHandler(async (req, res) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
        return sendResponse(res, 404, {}, "Notification not found");
    }
    return sendResponse(res, 200, {}, "Notification deleted");
});
