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
        duration: {
            type: String, // Duration in days using moment
            required: true,
        },
        features: {
            type: [featureSchema], // List of features with title and description
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("SubscriptionPlan", SubscriptionPlanSchema);
