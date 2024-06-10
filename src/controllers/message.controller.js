const messageModel = require("../models/message.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");

exports.sendMessage = asyncHandler(async (req, res) => {
    const { senderId, receiverId, message } = req.body;
    const newMessage = await messageModel.create({
        senderId,
        receiverId,
        message,
    });
    return sendResponse(res, 200, newMessage, "Message sent successfully");
});

exports.getMessagesByUserId = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const userId = req.params.userId;

    let dbQuery = {
        $or: [{ senderId: userId }, { receiverId: userId }],
    };

    // If search query is provided
    if (search) {
        const searchRegex = new RegExp(search.trim(), "i");
        dbQuery.$and = [
            { $or: [{ senderId: userId }, { receiverId: userId }] },
            { message: { $regex: searchRegex } },
        ];
    }
    const dataCount = await messageModel.countDocuments(dbQuery);
    const messages = await messageModel
        .find(dbQuery)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 });

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + messages.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    if (messages.length === 0) {
        return sendResponse(res, 404, null, "Message not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: messages,
            startItem,
            endItem,
            totalPages,
            pagesize: messages.length,
            totalDoc: dataCount,
        },
        "Message fetched successfully",
    );
});

exports.getAllMessages = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, status } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (search) {
        const searchRegex = new RegExp(search.trim(), "i");
        dbQuery.$or = [
            { message: { $regex: searchRegex } },
            { message: { $regex: searchRegex } },
        ];
    }
    // Sort by status
    if (status) {
        dbQuery.status = Number(status);
    }
    const dataCount = await messageModel.countDocuments(dbQuery);
    const messages = await messageModel
        .find(dbQuery)
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 });

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + messages.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (messages.length === 0) {
        return sendResponse(res, 404, null, "Message not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: messages,
            startItem,
            endItem,
            totalPages,
            pagesize: messages.length,
            totalDoc: dataCount,
        },
        "Message fetched successfully",
    );
});

exports.getMessageById = asyncHandler(async (req, res) => {
    const message = await messageModel.findById(req.params.id);
    if (!message) {
        return sendResponse(res, 404, null, "Message not found");
    }
    return sendResponse(res, 200, message, "Message fetched successfully");
});

exports.updateMessageStatus = asyncHandler(async (req, res) => {
    const message = await messageModel.findByIdAndUpdate(
        req.params.id,
        { status: req.params.status },
        { new: true },
    );
    if (!message) {
        return sendResponse(res, 404, null, "Message not found");
    }
    return sendResponse(
        res,
        200,
        message,
        "Message status updated successfully",
    );
});

exports.deleteMessage = asyncHandler(async (req, res) => {
    const message = await messageModel.findByIdAndDelete(req.params.id);
    if (!message) {
        return sendResponse(res, 404, null, "Message not found");
    }
    return sendResponse(res, 200, message._id, "Message deleted successfully");
});
