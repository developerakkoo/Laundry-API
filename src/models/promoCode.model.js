const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const promoCodeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        offer: {
            type: String,
            // required: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
        },
        codeType: {
            type: Number,
            required: true,
            enum: [1, 2, 3],
            default: [1], // free delivery = 1, above amount = 2, new user = 3
        },
        discountAmount: {
            type: Number,
            required: true,
        },
        minOrderAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        description: {
            type: String,
            required: true,
        },
        expiry: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("PromoCode", promoCodeSchema);
