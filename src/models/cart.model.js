const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shopId: {
            type: Schema.Types.ObjectId,
            ref: "Shope",
            required: true,
        },
        products: [
            {
                serviceId: {
                    type: Schema.Types.ObjectId,
                    ref: "Service",
                },
                quantity: {
                    type: Number,
                    default: 1,
                },
            },
        ],
        selectedQuantityType: {
            type: String,
            enum: [0, 1], // 0 = "peace", 1 = "kg"
            default: 0,
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Cart", cartSchema);
