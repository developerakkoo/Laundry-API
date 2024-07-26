const { Schema, model } = require("mongoose");

const bannerSchema = new Schema(
    {
        image_url: {
            type: String,
            required: true,
        },
        local_image_url: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = model("Banner", bannerSchema);
s;
