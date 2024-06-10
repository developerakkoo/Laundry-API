const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
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
                shopId: {
                    type: Schema.Types.ObjectId,
                    ref: "Shope",
                },
            },
        ],
        totalPrice: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Cart", cartSchema);
