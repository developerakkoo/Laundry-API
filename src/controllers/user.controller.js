const User = require("../models/user.model");
const {
    asyncHandler,
    sendResponse,
    generateAccessAndRefreshTokens,
    apiResponse,
} = require("../utils/helper.utils");
const { cookieOptions } = require("../constant");
const walletModel = require("../models/wallet.model");
const Cart = require("../models/cart.model");

exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, address, password } = req.body;
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
        address,
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
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
        return sendResponse(res, 400, null, "Incorrect credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id,
        2,
    );
    user.password = "********";
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(200, user, "User login successful, Welcome back"),
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
    const { name, email, phoneNumber, address } = req.body;
    const user = await User.findByIdAndUpdate(
        req.user._id || req.query.userId,
        {
            $set: {
                name,
                email,
                phoneNumber,
                ...(address && {
                    "address.addressLine1": address.addressLine1,
                    "address.addressLine2": address.addressLine2,
                    "address.addressLine3": address.addressLine3,
                    "address.landmark": address.landmark,
                    "address.city": address.city,
                    "address.state": address.state,
                }),
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
    const user = await User.findById(req.user._id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getAllUser = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    // Search based on user query
    if (search) {
        dbQuery = {
            $or: [{ name: { $regex: `^${search}`, $options: "i" } }],
        };
    }

    const dataCount = await User.countDocuments();
    const user = await User.find(dbQuery).skip(skip).limit(pageSize);
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
