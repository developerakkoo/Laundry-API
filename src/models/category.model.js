const { Schema, model } = require("mongoose");

const categorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        image_url: {
            type: String,
        },
        relativePath: {
            type: String,
        },
    },
    { timestamps: true },
);

module.exports = model("Category", categorySchema);
