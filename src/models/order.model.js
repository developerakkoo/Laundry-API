const { Schema, model } = require("mongoose");

const orderSchema = new Schema(
    {
        orderId: {
            type: String,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orderType: {
            type: Number,
            enum: [0, 1], // 0 = regular 1 = express
            default: 0,
        },
        shopId: {
            type: Schema.Types.ObjectId,
            ref: "Shope",
            required: true,
        },
        items: [
            
        ],
        pickupAddress: {
            type: Schema.Types.ObjectId,
            ref: "UserAddress",
        },
        dropoffAddress: {
            type: Schema.Types.ObjectId,
            ref: "UserAddress",
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
                2, // "Picked-Up agent assigned",
                3, //  Picked-Up Done ,
                4, // "In-Process",
                5, // "Ready-for-Drop off" ,
                6, // "Dropped-Off agent assigned",
                7, // "Completed",
                8,
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
            ref: "deliveryAgent",
        },
        orderDeliveryAgentId: {
            type: Schema.Types.ObjectId,
            ref: "deliveryAgent",
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
            deliveryBoyCompensation: {
                type: Number,
                required: true,
            },
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
