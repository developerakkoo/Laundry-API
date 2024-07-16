const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
    {
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        orderId: {
            type: Schema.Types.ObjectId,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        message: {
            type: String,
            default: "",
        },
        isImage: {
            type: Boolean,
            default: false,
        },
        image_url: {
            type: String,
        },
        local_filePath: { type: String },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Message", messageSchema);
