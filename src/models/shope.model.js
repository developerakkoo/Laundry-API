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
        shopeCloseImg: {
            type: String,
            required: true,
            default:
                "https://api.breezyemart.com/uploads/default/17218141423.png",
        },
        isOpen: {
            type: Boolean,
            required: true,
            default: false,
        },
        isAcceptExpressService: {
            type: Boolean,
            required: true,
            default: false,
        },
        expressServiceCharges: {
            type: Number,
            required: true,
            default: 0,
        },
        shopTimeTable: {
            type: [
                {
                    day: String,
                    openingTime: String,
                    closingTime: String,
                },
            ],
        },
        status: {
            type: Number,
            required: true,
            default: 0, // default
            enum: [0, 1, 2, 3], // pending,blocked, approved, rejected,
        },

        likes:[
            {
                type: Schema.Types.ObjectId,
                ref:"User"
            }
        ]
    },
    { timestamps: true },
);
// Create a 2dsphere index on the location field
shopSchema.index({ location: "2dsphere" });
module.exports = model("Shope", shopSchema);
