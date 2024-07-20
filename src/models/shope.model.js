const { Schema, model } = require("mongoose");

const shopSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        category: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
                required: true,
            },
        ],
        address: {
            addressLine1: String,
            addressLine2: String,
            addressLine3: String,
            landmark: String,
            city: String,
            state: String,
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
        image: {
            type: String,
        },
        relativePath: {
            type: String,
        },
        partnerId: {
            type: Schema.Types.ObjectId,
            ref: "partner",
            required: true,
        },
        status: {
            type: Number,
            required: true,
            default: 0, // default
            enum: [0, 1, 2, 3], // pending,blocked, approved, rejected,
        },
    },
    { timestamps: true },
);

module.exports = model("Shope", shopSchema);
