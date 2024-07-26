const User = require("../models/user.model");
const userAddress = require("../models/userAddress.model");
const userSubscription = require("../models/subscription.model");
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
    /***** creating cart for new user *****/
    await Cart.create({ userId: newUser._id });
    /***** creating wallet for new user *****/
    await walletModel.create({ userId: newUser._id });
    return sendResponse(res, 201, newUser, "User created successfully");
});

exports.login = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    let user = await User.findOne({ phoneNumber });
    if (!user) {
        user = await User.create({
            phoneNumber,
        });
    }
    // const isMatch = await user.isPasswordCorrect(password);
    // if (!isMatch) {
    //     return sendResponse(res, 400, null, "Incorrect credentials");
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user,
        2,
    );
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                { _id: user._id, accessToken, refreshToken },
                "User login successful, Welcome to your account",
            ),
        );
});

exports.logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
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
    const { name, email, phoneNumber, firebaseToken } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id || req.query.userId,
        {
            $set: {
                name,
                email,
                phoneNumber,
                firebaseToken,
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
    const id = req.user._id || req.query.userId;
    const user = await User.findById(id).lean();
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
    const { search, sub } = req.query;
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

    // Aggregate pipeline
    let userAggregation = [
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
        userId: req.query.userId || req.user._id,
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
    const userId = req.params.userId || req.user._id;
    const userAddresses = await userAddress.find({ userId: userId });
    return sendResponse(
        res,
        200,
        userAddresses,
        "Address fetched successfully",
    );
});

exports.getAddressesById = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
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
