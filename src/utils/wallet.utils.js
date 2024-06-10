const Wallet = require("../models/wallet.model");
const cashbackBackModel = require("../models/cashback.model");
const { apiError } = require("./helper.utils");

const calculateCashbackPoints = async (totalAmount) => {
    const data = await cashbackBackModel.findOne({
        $and: [
            { orderAmountFrom: { $lte: totalAmount } },
            { orderAmountTo: { $gte: totalAmount } },
        ],
    }); // get cashback percentage from db
    const cashbackPercent = data?.cashbackPercent ?? 0;
    return Math.floor(totalAmount * cashbackPercent);
};

const addPointsToWallet = async (userId, points) => {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        throw new apiError(404, "Wallet not found");
    }
    wallet.points += points;
    await wallet.save();
};

const useWalletPoints = async (userId, points) => {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        throw new Error("Wallet not found");
    }
    if (wallet.points < points) {
        throw new Error("Insufficient wallet balance");
    }
    wallet.points -= points;
    await wallet.save();
};

module.exports = {
    calculateCashbackPoints,
    addPointsToWallet,
    useWalletPoints,
};
