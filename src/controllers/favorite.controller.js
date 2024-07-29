const favoriteModel = require("../models/favorite.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");

exports.addFavorite = asyncHandler(async (req, res) => {
    const { userId, serviceId, shopId } = req.body;
    if (serviceId) {
        let favService = favoriteModel.findById(serviceId);
        if (favService) {
            return sendResponse(
                res,
                400,
                null,
                "Service already added to favorite",
            );
        }
        favService = await favoriteModel.create({
            userId,
            serviceId,
        });
        return sendResponse(
            res,
            200,
            favService,
            "Service added to favorite successfully",
        );
    }
    if (shopId) {
        let favShop = favoriteModel.findById(shopId);
        if (favShop) {
            return sendResponse(
                res,
                400,
                null,
                "Shop already added to favorite",
            );
        }
        favShop = await favoriteModel.create({
            userId,
            shopId,
        });
        return sendResponse(
            res,
            200,
            favShop,
            "Shop added to favorite successfully",
        );
    }
    return sendResponse(res, 400, null, "Invalid request");
});

exports.removeFavorite = asyncHandler(async (req, res) => {
    const { userId, serviceId, shopId } = req.query;
    if (serviceId) {
        await favoriteModel.findOneAndDelete({ userId, serviceId });
        return sendResponse(res, 200, null, "Service removed from favorite");
    }
    if (shopId) {
        await favoriteModel.findOneAndDelete({ userId, shopId });
        return sendResponse(res, 200, null, "Shop removed from favorite");
    }
    return sendResponse(res, 400, null, "Invalid request");
});

exports.getFavorites = asyncHandler(async (req, res) => {
    const { userId, favType } = req.query;
    let favorites;
    if (favType == 0) {
        favorites = await favoriteModel.find({ userId }).populate("serviceId");
    }
    if (favType == 1) {
        favorites = await favoriteModel.find({ userId }).populate("shopId");
    }
    return sendResponse(res, 200, favorites, "Favorites fetched successfully");
});
