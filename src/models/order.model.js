const { Schema, model } = require("mongoose");

const orderSchema = new Schema(
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
        items: [
            {
                item:{
                    type: Schema.Types.ObjectId,
                    ref: "Service",
                },
                quantity: Number
            },
        ],
        pickupAddress: {
            type: String,
        },
        dropoffAddress: {
            type: String,
        },
        pickupTime: {
            type: Date,
        },
        dropoffTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: [
                "Pending",
                "Picked-Up",
                "In-Process",
                "Ready-for-Dropoff",
                "Dropped-Off",
                "Completed",
                "Cancelled",
            ],
            default: "Pending",
        },
        deliveryBoyId: {
            type: Schema.Types.ObjectId,
            ref: "DeliveryBoy",
        },
        selfService: {
            type: Boolean,
            default: false,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        cashbackPoints: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = model("Order", orderSchema);
