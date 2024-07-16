const moment = require("moment");
const promoCode = require("../models/promoCode.model");
const {
    asyncHandler,
    sendResponse,
    apiError,
} = require("../utils/helper.utils");

exports.addPromoCode = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    } = req.body;

    const isCodExist = await promoCode.findOne({
        $or: [{ name, code }],
    });
    if (isCodExist)
        throw new apiError(
            400,
            "Promo code already exist with this name or code ",
        );

    const createdPromoCode = await promoCode.create({
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    });
    return sendResponse(
        res,
        200,
        createdPromoCode,
        "Promo code added successfully",
    );
});

exports.updatedPromoCode = asyncHandler(async (req, res) => {
    const {
        name,
        code,
        codeType,
        discountAmount,
        minOrderAmount,
        description,
        expiry,
        isActive,
    } = req.body;

    const isCodExist = await promoCode.findById(req.params.promoCodeId);
    if (!isCodExist) {
        throw new apiError(404, "Promo code not found");
    }
    const updatedPromoCode = await promoCode.findByIdAndUpdate(
        req.params.promoCodeId,
        {
            $set: {
                name,
                code,
                codeType,
                discountAmount,
                minOrderAmount,
                description,
                expiry,
                isActive,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(
        res,
        200,
        updatedPromoCode,
        "Promo code updated successfully",
    );
});

exports.getPromoCode = asyncHandler(async (req, res) => {
    const { promoCodeId } = req.params;
    const isPromoCode = await promoCode.findById(promoCodeId);
    if (!isPromoCode) {
        throw new apiError(404, "Promo code not found");
    }
    return sendResponse(
        res,
        200,
        isPromoCode,
        "Promo code fetched successfully",
    );
});

exports.getAllPromoCodes = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { isActive, codeType } = req.query;

    if (isActive) dbQuery.isActive = isActive;
    if (codeType) dbQuery.codeType = codeType;

    const allPromoCodes = await promoCode.find(dbQuery).sort({ createdAt: -1 });
    return sendResponse(
        res,
        200,
        allPromoCodes,
        "All promo codes fetched successfully",
    );
});

exports.deletePromoCode = asyncHandler(async (req, res) => {
    const isPromoCode = await promoCode.findById(req.params.promoCodeId);
    if (!isPromoCode) {
        throw new apiError(404, "Promo code not found");
    }
    await promoCode.findByIdAndDelete(req.params.promoCodeId);
    return sendResponse(res, 200, null, "Promo code deleted successfully");
});

exports.applyPromoCode = asyncHandler(async (req, res) => {
    const { code, orderAmount, userId } = req.body;

    const isPromoCodeExist = await promoCode.findOne({ code });
    if (!isPromoCodeExist || !isPromoCodeExist.isActive) {
        throw new apiError(400, "Invalid promo code");
    }
    if (
        moment(isPromoCodeExist.expiry, "DD-MM-YYYY").isBefore(
            moment(),
            "DD-MM-YYYY",
        )
    ) {
        throw new apiError(400, "Promo code expired");
    }

    let offer;
    if (orderAmount < isPromoCodeExist.minOrderAmount) {
        throw new apiError(
            400,
            "Order total needs to be greater than the minimum order amount",
        );
    }

    switch (isPromoCodeExist.codeType) {
        case 1:
            offer = {
                offer: `FREE_DELIVERY ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        case 2:
            offer = {
                offer: `GET_OFF ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        case 3:
            const userOrderExist = await Order.findOne({ userId });
            if (userOrderExist) {
                throw new apiError(
                    400,
                    "This code is only valid on the first order",
                );
            }
            offer = {
                offer: `NEW_USER ${isPromoCodeExist.offer}`,
                offerData: isPromoCodeExist.offer,
            };
            break;
        default:
            throw new apiError(400, "Invalid promo code type");
    }

    return sendResponse(
        res,
        200,
        { isPromoCodeExist, offerYouGet: offer },
        "Promo code applied successfully",
    );
});
