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
        type: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // home, cart, fav, profile
        },
    },
    { timestamps: true },
);

module.exports = model("Banner", bannerSchema);
s;
