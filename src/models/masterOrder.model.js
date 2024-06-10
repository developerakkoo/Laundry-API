const { Schema, model } = require("mongoose");

const masterOrderSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orders: [
            {
                type: Schema.Types.ObjectId,
                ref: "Order",
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = model("MasterOrder", masterOrderSchema);
