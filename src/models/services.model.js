const { Schema, model } = require("mongoose");



const servicesSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        type: {
            type: Number,
            required: true,
            enum: [0, 1, 2], //"Press", "Washing", "Dry_Cleaning"
        },
        description: {
            type: String,
            required: true,
        },
        shopeId: {
            type: Schema.Types.ObjectId,
            ref: "Shope",
            required: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        image_url: {
            type: String,
        },
        relativePath: {
            type: String,
        },
        price: {
            type: Number,
            required: true,
        },
        quantityAcceptedIn:{},
        status: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // pending, approved, rejected,blocked
        },
    },
    { timestamps: true },
);

module.exports = model("Service", servicesSchema);
