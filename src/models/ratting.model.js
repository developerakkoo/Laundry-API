const { Schema, model } = require("mongoose");

const ratingSchema = new Schema(
    {
        shopId: {
            type: Schema.Types.ObjectId,
            ref: "Shope",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        description: {
            type: String,
        },
      
        star: {
            type: Number,
            required: true,
            enum: [1, 2, 3, 4, 5],
        },
    },
    { timestamps: true },
);

module.exports = model("rating", ratingSchema);
