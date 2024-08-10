const Message = require("../models/message.model");
const {
    asyncHandler,
    apiResponse,
    apiError,
    deleteFile,
} = require("../utils/helper.utils");
const chatModel = require("../models/chat.model");
const { sendNotification } = require("./notification.controller");

exports.getMyChatList = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { username } = req.query;

    // Find chat lists involving the user
    let chatListQuery = chatModel.find({ members: userId });

    // If a username is provided, filter by username
    if (username) {
        chatListQuery = chatListQuery.populate({
            path: "members",
            match: { name: { $regex: username, $options: "i" } }, // case-insensitive search
            select: "name profile_image isOnline",
        });
    } else {
        chatListQuery = chatListQuery.populate({
            path: "members",
            select: "name profile_image isOnline",
        });
    }

    const chatList = await chatListQuery.exec();
    const dataPromises = chatList.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
            .sort({ createdAt: -1 })
            .exec();

        return {
            _id: chat._id,
            members: chat.members,
            lastMessage: lastMessage || {}, // Ensure lastMessage is not null
        };
    });

    const data = await Promise.all(dataPromises);

    return res
        .status(200)
        .json(new apiResponse(200, data, "GET_CHAT_LIST_SUCCESS"));
});

exports.sendMessage = asyncHandler(async (req, res) => {
    const { chatId, senderId, receiverId, message, orderId } = req.body;
    const newMessage = await Message.create({
        senderId,
        orderId,
        receiverId,
        message,
        chatId,
    });
    sendNotification(receiverId, "New Message", newMessage);
    return res
        .status(201)
        .json(new apiResponse(201, newMessage, "Message_SENT"));
});

exports.sendMultimediaMessage = asyncHandler(async (req, res) => {
    // console.log("hree>>>>>>>>>>>>>> media");
    const { chatId, senderId, receiverId, orderId } = req.body;
    const { filename } = req.file;
    const local_filePath = `upload/${filename}`;
    let image_url = `https://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "production") {
        image_url = `https://${req.hostname}:8000/uploads/${filename}`;
    }

    const data = {
        chatId,
        orderId,
        senderId,
        receiverId,
        isImage: true,
        image_url,
        local_filePath,
    };
    // console.log(data);
    const newMessage = await Message.create(data);
    sendNotification(receiverId, "New Message", newMessage);

    return res
        .status(201)
        .json(new apiResponse(201, newMessage, "Message_SENT"));
});

exports.checkChatExist = asyncHandler(async (req, res, next) => {
    const { senderId, receiverId } = req.body;

    // Check if a chat exists with both senderId and receiverId in any order and exactly two members
    let chat = await chatModel.findOne({
        $and: [
            { members: { $all: [senderId, receiverId] } },
            { members: { $size: 2 } },
        ],
    });

    if (!chat) {
        chat = await chatModel.create({ members: [senderId, receiverId] });
        // return this.sendMessage(req, res);
    }

    // If no chat exists, create a new one
    req.body.chatId = chat._id;
    next();
});

exports.getMessageById = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new apiError(404, "Message_NOT_FOUND");
    }
    return res
        .status(200)
        .json(new apiResponse(200, Message, "Message_FETCHED_SUCCESSFULLY"));
});

exports.getAllMessageByUserId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { orderId } = req.query;
    // Build the query to find messages based on orderId and userId
    const query = {
        $or: [{ senderId: userId }, { receiverId: userId }],
    };
    if (orderId) {
        query.orderId = orderId; // Add orderId filter if provided
    }
    const Messages = await Message.find(query).sort({ createdAt: 1 });
    if (!Messages) {
        throw new apiError(404, "Message_NOT_FOUND");
    }
    return res
        .status(200)
        .json(new apiResponse(200, Messages, "Message_FETCHED_SUCCESSFULLY"));
});

exports.markAsRead = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new apiError(404, "Message_NOT_FOUND");
    }
    const updatedMessage = await Message.findByIdAndUpdate(
        MessageId,
        { $set: { read: true } },
        { new: true },
    );
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                updatedMessage,
                "Message_MARKED_AS_READ_SUCCESSFULLY",
            ),
        );
});

exports.deleteMessageById = asyncHandler(async (req, res) => {
    const { MessageId } = req.params;
    const Message = await Message.findById(MessageId);
    if (!Message) {
        throw new apiError(404, "Message_NOT_FOUND");
    }
    if (Message.isImage === true) {
        deleteFile(Message.local_filePath);
    }
    await Message.deleteOne();
    return res
        .status(200)
        .json(new apiResponse(200, null, "Message_DELETED_SUCCESSFULLY"));
});

exports.getMessageByChatId = asyncHandler(async (req, res) => {
    const { chatId } = req.params;

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    if (!messages) {
        throw new apiError(404, "MESSAGE_NOT_FOUND");
    }
    return res
        .status(200)
        .json(new apiResponse(200, messages, "MESSAGE_FETCHED_SUCCESSFULLY"));
});
