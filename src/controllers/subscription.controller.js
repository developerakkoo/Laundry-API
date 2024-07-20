const userSubscription = require("../models/subscription.model");
const subscriptionPlan = require("../models/subscriptionPlan.model");
const { sendResponse, asyncHandler } = require("../utils/helper.utils");
const moment = require("moment");

exports.purchaseSubscription = asyncHandler(async (req, res) => {
    const { userId, planId, paymentDetails } = req.body;
    const userSubscriptionExist = await userSubscription.findOne({
        userId,
        subscriptionPlanId: planId,
        status: true,
    });
    if (userSubscriptionExist) {
        return sendResponse(res, 400, null, "User already has subscription");
    }

    const subscriptionPlanDetail = await subscriptionPlan.findById(planId);
    if (!subscriptionPlanDetail) {
        return sendResponse(res, 404, null, "Subscription plan not found");
    }

    const newUserSubscription = await userSubscription.create({
        userId,
        subscriptionPlanId: planId,
        expiryDate: moment()
            .add(subscriptionPlanDetail.duration, "months")
            .format("DD-MM-YYYY"),
        paymentDetails,
        status: true,
    });
    return sendResponse(
        res,
        201,
        newUserSubscription,
        "Subscription purchased successfully",
    );
});

exports.getUserSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const existingUserSubscription = await userSubscription.findOne({
        userId,
        status: true,
    });
    if (!existingUserSubscription) {
        return sendResponse(res, 404, null, "User subscription not found");
    }
    return sendResponse(
        res,
        200,
        existingUserSubscription,
        "User subscription fetched successfully",
    );
});

exports.cancelUserSubscription = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { planId } = req.body;
    const userSubscription = await userSubscription.findOneAndUpdate(
        { userId, planId },
        { status: false },
        { new: true },
    );
    if (!userSubscription) {
        return sendResponse(res, 404, null, "User subscription not found");
    }
    return sendResponse(
        res,
        200,
        userSubscription,
        "User subscription cancelled successfully",
    );
});

exports.updateUserSubscription = asyncHandler(async (req, res) => {
    const { userId, planId } = req.params;
    const { newEndDate } = req.body;
    const userSubscription = await userSubscription.findOneAndUpdate(
        { userId, planId },
        { endDate: newEndDate },
        { new: true },
    );
    if (!userSubscription) {
        return sendResponse(res, 404, null, "User subscription not found");
    }
    return sendResponse(
        res,
        200,
        userSubscription,
        "User subscription updated successfully",
    );
});
