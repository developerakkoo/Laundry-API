const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

module.exports = model("Notification", notificationSchema);
