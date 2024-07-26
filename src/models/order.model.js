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
                item: {
                    type: Schema.Types.ObjectId,
                    ref: "Service",
                },
                quantity: Number,
            },
        ],
        pickupAddress: {
            //id
            type: String,
        },
        dropoffAddress: {
            //id
            type: String,
        },
        pickupTime: {
            type: String,
        },
        dropoffTime: {
            type: String,
        },
        paymentDetails: {
            type: String,
        },
        status: {
            type: Number,
            enum: [
                0, // "Pending",
                1, // "Confirm",
                2, // "Picked-Up",
                3, // "In-Process",
                4, // "Ready-for-Dropoff",
                5, // "Dropped-Off",
                6, // "Completed",
                7, // "Cancelled",
            ],
            default: 0,
        },
        orderTimeline: {
            type: [
                {
                    title: String,
                    dateTime: String,
                    status: String,
                },
            ],
        },
        pickupOtp: {
            type: Number,
        },
        dropOtp: {
            type: Number,
        },
        pickupOtpVerifyStatus: {
            type: Boolean,
        },
        deliveryOtpVerifyStatus: {
            type: Boolean,
        },
        orderPickupAgentId: {
            type: Schema.Types.ObjectId,
            ref: "DeliveryBoy",
        },
        orderDeliveryAgentId: {
            type: Schema.Types.ObjectId,
            ref: "DeliveryBoy",
        },
        selfService: {
            type: Boolean,
            default: false,
        },
        promoCode: {
            type: Schema.Types.ObjectId,
            ref: "PromoCode",
        },
        priceDetails: {
            subtotal: {
                type: Number,
                required: true,
            },
            gstAmount: {
                type: Number,
                required: true,
            },
            deliveryCharges: {
                type: Number,
                required: true,
            },
            expressDeliveryCharges: {
                type: Number,
                required: true,
            },
            // deliveryBoyCompensation: {
            //     type: Number,
            //     required: true,
            // },
            platformFee: {
                type: Number,
                required: true,
            },
            discount: {
                type: Number,
                required: true,
            },
            walletPointsUsed: {
                type: Number,
                required: true,
            },
            totalAmountToPay: {
                type: Number,
                required: true,
            },
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
