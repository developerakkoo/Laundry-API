const { Schema, model } = require("mongoose");

const cashbackPointsSchema = new Schema(
    {
        orderAmountFrom: {
            type: Number,
            required: true,
        },
        orderAmountTo: {
            type: Number,
            required: true,
        },
        cashbackPercent: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true },
);
module.exports = model("CashbackOffer", cashbackPointsSchema);
