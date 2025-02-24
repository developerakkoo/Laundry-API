const User = require("../models/user.model");
const userAddress = require("../models/userAddress.model");
const userSubscription = require("../models/subscription.model");
const Service = require("../models/services.model");
const axios = require("axios");
const {
    asyncHandler,
    sendResponse,
    generateAccessAndRefreshTokens,
    apiResponse,
    apiError,
} = require("../utils/helper.utils");
const { cookieOptions } = require("../constant");
const walletModel = require("../models/wallet.model");
const Cart = require("../models/cart.model");
const {
    getRecentOrders,
    analyzeOrders,
} = require("../utils/recommendation.utils");

exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const isExistUser = await User.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistUser) {
        return sendResponse(res, 400, null, "User already exist");
    }
    const user = await User.create({
        name,
        email,
        password,
        phoneNumber,
    });
    const newUser = await User.findById(user._id);
    if (!newUser) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while registering the user",
        );
    }
    // /***** creating cart for new user *****/
    // await Cart.create({ userId: newUser._id });
    /***** creating wallet for new user *****/
    await walletModel.create({ userId: newUser._id });
    return sendResponse(res, 201, newUser, "User created successfully");
});

exports.login = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;

    // Find user by phone number
    let user = await User.findOne({ phoneNumber });

    // If user does not exist, create a new one
    if (!user) {
        user = await User.create({ phoneNumber });
    }

    // Check if user is blocked
    if (user.status === 1) {
        return res
            .status(403)
            .json(
                new apiResponse(
                    403,
                    { isBlocked: true },
                    "User is blocked by admin",
                ),
            );
    }

    // Generate tokens if the user is not blocked
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user,
        2,
    );

    // Send response with tokens and user info
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions) // Set access token in cookie
        .cookie("refresh-token", refreshToken, cookieOptions) // Set refresh token in cookie
        .json(
            new apiResponse(
                200,
                {
                    _id: user._id,
                    isBlocked: false, // User is not blocked
                    accessToken,
                    refreshToken,
                },
                "User login successful, Welcome to your account",
            ),
        );
});

exports.logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.query.userId, {
        $unset: {
            refreshToken: 1,
        },
    });
    return res
        .status(200)
        .clearCookie("access-token", cookieOptions)
        .clearCookie("refresh-token", cookieOptions)
        .json(new apiResponse(200, null, "User logout successful"));
});

exports.updateUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, firebaseToken, status, isOnline } =
        req.body;
    const user = await User.findByIdAndUpdate(
         req.query.userId,
        {
            $set: {
                name,
                email,
                phoneNumber,
                firebaseToken,
                isOnline,
                status,
            },
        },
        { new: true },
    );
    if (!user) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while updating the user",
        );
    }
    return sendResponse(res, 200, user, "User updated successfully");
});
exports.getCurrentUser = asyncHandler(async (req, res) => {
    const id = req.query.userId;
    const user = await User.findById(id).lean();
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    // Populate the active subscriptions
    const subscriptions = await userSubscription
        .find({
            userId: user._id,
            status: true,
        })
        .select("-userId -updatedAt -__v")
        .populate({
            path: "subscriptionPlanId",
            select: "-createdAt -updatedAt -__v",
        })
        .lean();

    // Attach active subscriptions to the user profile
    user.activeSubscriptions = subscriptions;
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    // Populate the active subscriptions
    const subscriptions = await userSubscription
        .findOne({
            userId: new ObjectId(user._id),
            status: true,
        })
        .select("-userId -updatedAt -__v")
        .populate({
            path: "subscriptionPlanId",
            select: "-createdAt -updatedAt -__v",
        })
        .lean();

    // Attach active subscriptions to the user profile
    user.activeSubscriptions = subscriptions;
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getAllUser = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, sub, status } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery = {
            $or: [{ name: searchRegex }, { name: searchRegex }],
        };
    }
    if (status) {
        dbQuery.status = Number(status);
    }

    // Aggregate pipeline
    let userAggregation = [
        {
            $match: dbQuery,
        },
        {
            $lookup: {
                as: "useraddresses",
                from: "useraddresses",
                foreignField: "userId",
                localField: "_id",
            },
        },
        {
            $lookup: {
                as: "userSubscriptionDetails",
                from: "usersubscriptions",
                foreignField: "userId",
                localField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            as: "subscriptionplans",
                            from: "subscriptionplans",
                            foreignField: "_id",
                            localField: "subscriptionPlanId",
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                isSubscribed: {
                    $cond: {
                        if: { $gt: [{ $size: "$userSubscriptionDetails" }, 0] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $match: sub === "1" ? { isSubscribed: true } : {}, // Filter by subscription status if sub=1
        },
        {
            $project: { password: 0, refreshToken: 0 }, // Exclude password and refreshToken fields from the result
        },
        {
            $skip: skip,
        },
        {
            $limit: pageSize,
        },
    ];

    const user = await User.aggregate(userAggregation);
    // Count documents matching the filter
    const countAggregation = [
        {
            $match: dbQuery,
        },
        {
            $lookup: {
                as: "userSubscriptionDetails",
                from: "usersubscriptions",
                foreignField: "userId",
                localField: "_id",
            },
        },
        {
            $addFields: {
                isSubscribed: {
                    $cond: {
                        if: { $gt: [{ $size: "$userSubscriptionDetails" }, 0] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $match: sub === "1" ? { isSubscribed: true } : {}, // Filter by subscription status if sub=1
        },
        {
            $count: "totalCount", // Count the total number of documents
        },
    ];

    const countResult = await User.aggregate(countAggregation);
    const dataCount = countResult[0] ? countResult[0].totalCount : 0;

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + user.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    if (user.length === 0) {
        return sendResponse(res, 404, null, "User not found");
    }

    return sendResponse(
        res,
        200,
        {
            content: user,
            startItem,
            endItem,
            totalPages,
            pagesize: user.length,
            totalDoc: dataCount,
        },
        "User fetched successfully",
    );
});

exports.deleteUserById = asyncHandler(async (req, res) => {
    if (req.user.adminType != 0 && req.user.userAccess != 0) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action",
        );
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user._id, "User deleted successfully");
});

exports.addAddresses = asyncHandler(async (req, res) => {
    const { type, address, landmark, pinCode, selected, lng, lat } = req.body;
    const savedAddress = await userAddress.create({
        userId: req.query.userId,
        type,
        address,
        landmark,
        pinCode,
        selected,
        location: {
            type: "Point",
            coordinates: [lng, lat],
        },
    });

    return sendResponse(res, 201, savedAddress, "Address saved successfully");
});

exports.selectAddresses = asyncHandler(async (req, res) => {
    const { addressId, selected } = req.body;
    const selectedAddress = await userAddress.findByIdAndUpdate(
        addressId,
        {
            $set: {
                selected: selected,
            },
        },
        {
            new: true,
        },
    );

    return sendResponse(
        res,
        200,
        selectedAddress,
        "Address selected successfully",
    );
});

exports.getAllAddressesByUserId = asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const userAddresses = await userAddress.find({ userId: userId });
    return sendResponse(
        res,
        200,
        userAddresses,
        "Address fetched successfully",
    );
});

exports.getAddressesById = asyncHandler(async (req, res) => {
    const { addressId } = req.params.addressId;
    const userAddresses = await userAddress.findById(addressId);
    return sendResponse(
        res,
        200,
        userAddresses,
        "Address fetched successfully",
    );
});

exports.updateAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.body;
    const savedAddress = await userAddress.findById(addressId);
    if (!savedAddress) {
        throw new apiError(404, "Address not found");
    }
    savedAddress.type =
        req.body.type != undefined ? req.body.type : savedAddress.type;
    savedAddress.address =
        req.body.address != undefined ? req.body.address : savedAddress.address;
    savedAddress.selected =
        req.body.landmark != undefined
            ? req.body.landmark
            : savedAddress.landmark;
    savedAddress.pinCode =
        req.body.pinCode != undefined ? req.body.pinCode : savedAddress.pinCode;
    savedAddress.selected =
        req.body.selected != undefined
            ? req.body.selected
            : savedAddress.selected;
    const updatedAddress = await savedAddress.save();

    return sendResponse(
        res,
        200,
        updatedAddress,
        "Address updated successfully",
    );
});

exports.deleteAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const savedAddress = await userAddress.findById(addressId);
    if (!savedAddress) {
        throw new apiError(404, "Address not found");
    }
    if (savedAddress.userId.toString() != req.user._id.toString()) {
        throw new apiError(
            400,
            "Address not deleted, you can only delete your address",
        );
    }
    await userAddress.deleteOne({ _id: addressId });
    return sendResponse(res, 200, {}, "Address deleted successfully");
});

exports.fetchAddress = asyncHandler(async (req, res) => {
    const { address } = req.body;
    if (!address) {
        return sendResponse(res, 400, null, "Address is required");
    }
    const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
            params: {
                address: address,
                key: process.env.GOOGLE_MAPS_API_KEY,
            },
        },
    );

    const results = response.data.results;
    if (results.length === 0) {
        return sendResponse(res, 404, null, "No addresses found");
    }
    sendResponse(
        res,
        200,
        results.map((result) => ({
            formatted_address: result.formatted_address,
            location: result.geometry.location,
        })),
        "Address fetch successfully",
    );
});

exports.getRecommendations = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const orders = await getRecentOrders(userId);
    const popularItems = analyzeOrders(orders);

    const recommendedServices = await Service.find({
        _id: { $in: popularItems },
    });

    sendResponse(res, 200, recommendedServices, " Recommendation for you");
});
