const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
    {
        senderId: {
            type: String,
            required: true,
            required: true,
        },
        receiverId: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        status: {
            type: Number,
            default: 0,
            enum: [0, 1], // send = 0, read = 1
        },
    },
    { timestamps: true },
);

module.exports = model("Message", messageSchema);
