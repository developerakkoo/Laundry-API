const { Schema, model } = require("mongoose");

const favoriteSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        shopId: {
            type: Schema.Types.ObjectId,
            ref: "Shope",
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Favorite", favoriteSchema);
