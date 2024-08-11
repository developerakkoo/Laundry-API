const { cookieOptions } = require("../constant");
const Admin = require("../models/admin.model");
const cashbackModel = require("../models/cashback.model");
const servicesModel = require("../models/services.model");
const partnerModel = require("../models/partner.model");
const orderModel = require("../models/order.model");
const shopModel = require("../models/shope.model");
const subscriptionPlan = require("../models/subscriptionPlan.model");
const {
    asyncHandler,
    sendResponse,
    generateAccessAndRefreshTokens,
    apiResponse,
} = require("../utils/helper.utils");
const userModel = require("../models/user.model");
const Data = require("../models/data.model");
const deliveryAgentModel = require("../models/deliveryAgent.model");

exports.createAdmin = asyncHandler(async (req, res) => {
    const { adminType, categoryAccess, userAccess, email, password } = req.body;
    const isExistAdmin = await Admin.findOne({ email });
    if (isExistAdmin) {
        return sendResponse(res, 400, null, "Admin already exist");
    }
    const admin = await Admin.create({
        adminType,
        categoryAccess,
        userAccess,
        email,
        password,
    });
    const newAdmin = await Admin.findById(admin._id);
    if (!newAdmin) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while creating the admin",
        );
    }
    return sendResponse(res, 201, newAdmin, "Admin created successfully");
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
        return sendResponse(res, 404, null, "Admin not found");
    }
    const isMatch = await admin.isPasswordCorrect(password);
    if (!isMatch) {
        return sendResponse(res, 400, null, "Invalid email or password");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        admin,
        1,
    );
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                { _id: admin._id, accessToken, refreshToken },
                "Admin login successful, Welcome back",
            ),
        );
});

exports.logout = asyncHandler(async (req, res) => {
    await Admin.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1,
        },
    });
    return res
        .status(200)
        .clearCookie("access-token", cookieOptions)
        .clearCookie("refresh-token", cookieOptions)
        .json(new apiResponse(200, null, "Admin logout successful"));
});

exports.addAdmin = asyncHandler(async (req, res) => {
    const {
        adminType,
        categoryAccess,
        userAccess,
        adminAccess,
        email,
        password,
    } = req.body;
    if (req.user.adminType != 0 || req.user.adminAccess != 0) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action",
        );
    }
    const isExistAdmin = await Admin.findOne({ email });
    if (isExistAdmin) {
        return sendResponse(res, 400, null, "Admin already exist");
    }
    const admin = await Admin.create({
        adminType,
        categoryAccess,
        adminAccess,
        userAccess,
        email,
        password,
    });
    const newAdmin = await Admin.findById(admin._id);
    if (!newAdmin) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while creating the admin",
        );
    }
    return sendResponse(res, 201, newAdmin, "Admin created successfully");
});

exports.addCashbackOffer = asyncHandler(async (req, res) => {
    const { orderAmountFrom, orderAmountTo, cashbackPercent } = req.body;
    const cashback = await cashbackModel.create({
        orderAmountFrom,
        orderAmountTo,
        cashbackPercent,
    });
    const newCashback = await cashbackModel.findById(cashback._id);
    if (!newCashback) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while creating the cashback offer",
        );
    }
    return sendResponse(
        res,
        201,
        newCashback,
        "Cashback offer created successfully",
    );
});

exports.updateCashbackOffer = asyncHandler(async (req, res) => {
    const { orderAmountFrom, orderAmountTo, cashbackPercent, isActive } =
        req.body;
    const cashback = await cashbackModel.findByIdAndUpdate(
        req.params.id,
        {
            orderAmountFrom,
            orderAmountTo,
            cashbackPercent,
            isActive,
        },
        { new: true },
    );
    if (!cashback) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while updating the cashback offer",
        );
    }
    return sendResponse(
        res,
        200,
        cashback,
        "Cashback offer updated successfully",
    );
});

exports.deleteCashbackOffer = asyncHandler(async (req, res) => {
    const cashback = await cashbackModel.findByIdAndDelete(req.params.id);
    if (!cashback) {
        return sendResponse(res, 400, null, "Cashback offer not founds");
    }
    return sendResponse(
        res,
        200,
        cashback._id,
        "Cashback offer deleted successfully",
    );
});

exports.getAllCashbackOffer = asyncHandler(async (req, res) => {
    const cashback = await cashbackModel.find();
    if (cashback.length === 0) {
        return sendResponse(res, 404, null, "Cashback offer not founds");
    }
    return sendResponse(
        res,
        200,
        cashback,
        "Cashback offer fetched successfully",
    );
});

exports.getCashbackOfferById = asyncHandler(async (req, res) => {
    const cashback = await cashbackModel.findById(req.params.id);
    if (!cashback) {
        return sendResponse(res, 404, null, "Cashback offer not found");
    }
    return sendResponse(
        res,
        200,
        cashback,
        "Cashback offer fetched successfully",
    );
});

/***** Admin Dash *****/
exports.getDashboardStats = asyncHandler(async (req, res) => {
    const [
        totalUser,
        totalOnlineUser,
        totalPartner,
        totalDeliveryBoy,
        totalOrders,
        totalInProgressOrders,
        totalCompletedOrders,
        totalCancelledOrders,
        totalShops,
        totalServices,
    ] = await Promise.all([
        userModel.countDocuments(),
        userModel.countDocuments({ isOnline: true }),
        partnerModel.countDocuments(),
        deliveryAgentModel.countDocuments(),
        orderModel.countDocuments(),
        orderModel.countDocuments({ status: "In-Process" }),
        orderModel.countDocuments({ status: "Completed" }),
        orderModel.countDocuments({ status: "Cancelled" }),
        shopModel.countDocuments(),
        servicesModel.countDocuments(),
    ]);
    return sendResponse(
        res,
        200,
        {
            totalUser,
            totalOnlineUser,
            totalPartner,
            totalDeliveryBoy,
            totalOrders,
            totalInProgressOrders,
            totalCompletedOrders,
            totalCancelledOrders,
            totalShops,
            totalServices,
        },
        "Admin dash stats fetched successfully",
    );
});

exports.totalRevenueChartData = asyncHandler(async (req, res) => {
    const { sort = "dayOfMonth" } = req.query;

    const pipeline = [
        {
            $project: {
                totalAmount: 1,
                sortField: {
                    [`$${sort}`]: "$createdAt",
                },
            },
        },
        {
            $group: {
                _id: "$sortField",
                revenue: {
                    $sum: "$totalAmount",
                },
            },
        },
        {
            $project: {
                _id: 0,
                [sort]: "$_id",
                revenue: 1,
            },
        },
    ];
    const totalRevenue = await orderModel.aggregate(pipeline);
    return sendResponse(
        res,
        200,
        totalRevenue,
        "Total revenue fetched successfully",
    );
});

/***** Data *****/
exports.createData = asyncHandler(async (req, res) => {
    const {
        gstPercentage,
        deliveryCharges,
        expressDeliveryCharges,
        platformFee,
    } = req.body;

    const data = await Data.create({
        gstPercentage,
        deliveryCharges,
        expressDeliveryCharges,
        platformFee,
    });
    sendResponse(res, 200, data, "Data created successfully");
});

exports.getData = asyncHandler(async (req, res) => {
    const data = await Data.find();
    if (!data) {
        return sendResponse(404, null, "Data not found");
    }
    sendResponse(res, 200, data, "Data fetched successfully");
});

exports.updateData = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { gstPercentage, deliveryCharges, platformFee } = req.body;
    const data = await Data.findByIdAndUpdate(
        id,
        {
            gstPercentage,
            deliveryCharges,
            platformFee,
        },
        { new: true },
    );
    if (!data) {
        return sendResponse(res, 404, null, "Data not found");
    }
    sendResponse(res, 200, data, "Data updated successfully");
});

exports.createSubscriptionPlan = asyncHandler(async (req, res) => {
    const { name, price, validity, features } = req.body;

    const checkPlaneExist = await subscriptionPlan.find({ name });

    if (checkPlaneExist.length > 0) {
        return sendResponse(res, 400, null, "Subscription plan already exists");
    }

    const newSubscriptionPlan = await subscriptionPlan.create({
        name,
        price,
        validity,
        features,
    });
    sendResponse(
        res,
        201,
        newSubscriptionPlan,
        "Subscription plan created successfully",
    );
});

exports.getAllSubscriptionPlans = asyncHandler(async (req, res) => {
    const subscriptionPlans = await subscriptionPlan.find();
    if (!subscriptionPlans) {
        return sendResponse(res, 404, null, "Subscription plans not found");
    }
    sendResponse(
        res,
        200,
        subscriptionPlans,
        "Subscription plans fetched successfully",
    );
});

exports.getSubscriptionPlanById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existSubscriptionPlan = await subscriptionPlan.findById(id);
    if (!existSubscriptionPlan) {
        return sendResponse(res, 404, null, "Subscription plan not found");
    }
    sendResponse(
        res,
        200,
        existSubscriptionPlan,
        "Subscription plan fetched successfully",
    );
});

exports.updateSubscriptionPlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, price, validity, features } = req.body;
    const updatedSubscriptionPlan = await subscriptionPlan.findByIdAndUpdate(
        id,
        {
            name,
            price,
            validity,
            features,
        },
        { new: true },
    );
    if (!subscriptionPlan) {
        return sendResponse(res, 404, null, "Subscription plan not found");
    }
    sendResponse(
        res,
        200,
        updatedSubscriptionPlan,
        "Subscription plan updated successfully",
    );
});

// Update or delete a specific feature in a subscription plan
exports.modifyFeatureInSubscriptionPlan = asyncHandler(async (req, res) => {
    const { id, featureId } = req.params;
    const { title, description, action } = req.query; // Use query parameters to determine the action

    // Find the subscription plan by id
    const subscriptionPlanExist = await subscriptionPlan.findById(id);

    if (!subscriptionPlanExist) {
        return sendResponse(res, 404, null, "Subscription plan not found");
    }

    // Find the feature by featureId
    const feature = subscriptionPlanExist.features.id(featureId);

    if (!feature) {
        return sendResponse(res, 404, null, "Feature not found");
    }

    if (action === "update") {
        // Update the feature fields if action is 'update'
        if (title) feature.title = title;
        if (description) feature.description = description;

        // Save the updated subscription plan
        await subscriptionPlanExist.save();

        return sendResponse(
            res,
            200,
            subscriptionPlanExist,
            "Feature updated successfully",
        );
    } else if (action === "delete") {
        // Remove the feature if action is 'delete'
        feature.remove();

        // Save the updated subscription plan
        await subscriptionPlanExist.save();

        return sendResponse(
            res,
            200,
            subscriptionPlanExist,
            "Feature deleted successfully",
        );
    } else {
        return sendResponse(res, 400, null, "Invalid action");
    }
});

exports.deleteSubscriptionPlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedSubscriptionPlan =
        await subscriptionPlan.findByIdAndDelete(id);
    if (!deletedSubscriptionPlan) {
        return sendResponse(res, 404, null, "Subscription plan not found");
    }
    sendResponse(
        res,
        200,
        deletedSubscriptionPlan._id,
        "Subscription plan deleted successfully",
    );
});

/* Banner Controller*/

exports.createBanner = asyncHandler(async (req, res) => {
    const { filename } = req.file;
    const local_image_url = `uploads/${filename}`;
    let image_url = `https://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        image_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }

    const banner = await bannerModel.create({
        image_url,
        local_image_url,
        type: req.body.type,
    });
    sendResponse(res, 201, banner, "Banner created successfully");
});

exports.getAllBanners = asyncHandler(async (req, res) => {
    const { type } = req.query;
    let dbQuery = {};
    if (type) {
        dbQuery.type = type;
    }
    const banners = await bannerModel.find(dbQuery);
    if (banners.length === 0) {
        return sendResponse(res, 404, null, "Banners not found");
    }
    sendResponse(res, 200, banners, "Banners fetched successfully");
});

exports.deleteBanner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const banner = await bannerModel.findByIdAndDelete(id);
    if (!banner) {
        return sendResponse(res, 404, null, "Banner not found");
    }
    if (banner.local_image_url) deleteFile(banner?.local_image_url);
    sendResponse(res, 200, banner._id, "Banner deleted successfully");
});

/* Video Controller */

const videoAddModel = require("../models/videoAdd.model");
exports.addVideos = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return sendResponse(res, 400, null, "No files were uploaded");
    }
    const videoData = req.files.map((video) =>
        videoAddModel.create({
            videoId: uuidV4().toUpperCase(),
            videoUrl: `https://${req.hostname}/upload/${video.filename}`,
            video_local_url: `upload/${video.filename}`,
        }),
    );
    const data = await Promise.all(videoData);
    sendResponse(res, 200, data, "Video uploaded successfully");
});

exports.deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await videoAddModel.findByIdAndDelete(videoId);
    if (!video) {
        return sendResponse(res, 404, null, "Video not found");
    }

    deleteFile(video.video_local_url);

    sendResponse(res, 200, video, "Video deleted successfully");
});

exports.getAllVideos = asyncHandler(async (req, res) => {
    const videos = await videoAddModel.find();
    if (videos.length === 0) {
        return sendResponse(res, 404, null, "No videos found");
    }
    sendResponse(res, 200, videos, "All videos fetched successfully");
});

exports.getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await videoAddModel.findById(videoId);
    if (!video) {
        return sendResponse(res, 404, null, "Video not found");
    }
    sendResponse(res, 200, video, "Video fetched successfully");
});
