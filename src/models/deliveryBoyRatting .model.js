const { Schema, model } = require("mongoose");

const DeliveryBoyRatingSchema = new Schema(
    {
        deliveryAgentId: {
            type: Schema.Types.ObjectId,
            ref: "deliveryAgent",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        description: {
            type: String,
        },
        star: {
            type: Number,
            required: true,
            enum: [1, 2, 3, 4, 5],
        },
    },
    { timestamps: true },
);

module.exports = model("deliveryAgentRating", DeliveryBoyRatingSchema);
