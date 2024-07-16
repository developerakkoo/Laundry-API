const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAddressSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            required: true,
            default: "Home",
        },
        address: {
            type: String,
            required: true,
        },
        landmark: {
            type: String,
            required: true,
        },
        pinCode: {
            type: Number,
            required: true,
        },
        selected: {
            type: Boolean,
            required: true,
            default: false,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"], // Only 'Point' type is allowed
                required: true,
                default: "Point",
            },
            coordinates: {
                type: [Number], // Longitude and latitude
                required: true,
                default: 0,
            },
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("UserAddress", userAddressSchema);
