const { Schema, model } = require("mongoose");

const videoAddSchema = new Schema(
    {
        videoId: {
            type: String,
            required: true,
        },
        videoUrl: {
            type: String,
            required: true,
        },
        video_local_url: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

module.exports = model("VideoAdd", videoAddSchema);
