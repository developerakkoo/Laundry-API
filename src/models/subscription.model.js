const { Schema, model } = require("mongoose");

const UserSubscriptionSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        subscriptionPlanId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "SubscriptionPlan",
        },
        expiryDate: {
            type: String,
            require: true,
        },
        paymentDetails: {
            type: String,
            required: true,
        },
        status: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true },
);

module.exports = model("userSubscription", UserSubscriptionSchema);
