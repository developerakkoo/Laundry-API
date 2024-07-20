const { Schema, model } = require("mongoose");

const featureSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
});

const SubscriptionPlanSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        price: {
            type: Number,
            required: true,
        },
        validity: {
            type: Number, // Duration in month  using moment
            required: true,
        },
        features: {
            type: [featureSchema], // List of features with title and description
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = model("SubscriptionPlan", SubscriptionPlanSchema);
