const { Schema, model, Types } = require("mongoose");

const chatSchema = new Schema(
    {
        members: [
            {
                type: Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    },
);

module.exports = model("Chat", chatSchema);
