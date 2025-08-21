const deliveryAgentModel = require("../models/deliveryAgent.model");
const deliveryAgentDocumentModel = require("../models/deliveryAgentDocument.model");
const deliveryAgentRating = require("../models/deliveryAgentRating.model");
const Payout = require('../models/payout.model');
const Order = require("../models/order.model"); 
const { ObjectId } = require("mongoose").Types;
const mongoose = require("mongoose");
const { cookieOptions } = require("../constant");
const {
    asyncHandler,
    sendResponse,
    apiResponse,
    deleteFile,
    generateAccessAndRefreshTokens,
} = require("../utils/helper.utils");
const moment = require("moment");

exports.register = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const isExistDeliveryAgent = await deliveryAgentModel.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistDeliveryAgent) {
        return sendResponse(
            res,
            400,
            "Delivery agent already exist with this email or phone number",
        );
    }
    const deliveryAgent = await deliveryAgentModel.create({
        name,
        email,
        password,
        phoneNumber,
    });
    const newDeliveryAgent = await deliveryAgentModel.findById(
        deliveryAgent._id,
    );
    if (!newDeliveryAgent)
        return sendResponse(
            res,
            500,
            "Something went wrong while creating delivery agent",
        );
    return sendResponse(
        res,
        200,
        newDeliveryAgent,
        "Delivery agent added successfully",
    );
});

exports.login = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const deliveryAgent = await deliveryAgentModel
        .findOne({ phoneNumber })
        .select("+password");
    if (!deliveryAgent) {
        return sendResponse(
            res,
            404,
            null,
            "Your not registered as a delivery agent",
        );
    }
    // const isMatch = await deliveryAgent.isPasswordCorrect(password);
    // if (!isMatch) {
    //     return sendResponse(res, 400, null, "Incorrect credentials");
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        deliveryAgent._id,
        3,
    );
    // deliveryAgent.password = "********";
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                { userId: deliveryAgent._id, accessToken, refreshToken },
                "User login successful, Welcome back",
            ),
        );
});

exports.logout = asyncHandler(async (req, res) => {
    await deliveryAgentModel.findByIdAndUpdate(req.user._id, {
        $unset: {
            refreshToken: 1,
        },
    });
    return res
        .status(200)
        .clearCookie("access-token", cookieOptions)
        .clearCookie("refresh-token", cookieOptions)
        .json(new apiResponse(200, null, "Logout successful"));
});

exports.uploadProfileImage = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const isExistUser = await deliveryAgentModel.findById(userId);
    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let image_url = `${req.protocol}://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        image_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }
    if (isExistUser.relativePath) deleteFile(isExistUser?.relativePath);

    const user = await deliveryAgentModel.findByIdAndUpdate(
        userId,
        {
            $set: {
                profile_image: image_url,
                relativePath: relativePath,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(res, 200, user, "Profile image updated successfully");
});

exports.uploadDocument = asyncHandler(async (req, res) => {
    const { userId, documentType, documentNumber } = req.body;

    const isExistUser = await deliveryAgentModel.findById(userId);
    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let document_url = `${req.protocol}://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        document_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }

    const isExistDoc = deliveryAgentDocumentModel.findOne({
        userId,
        documentType,
    });
    if (isExistDoc?.relativePath) deleteFile(isExistDoc?.relativePath);

    const user = await deliveryAgentDocumentModel.create({
        userId,
        documentType,
        documentNumber,
        document_url,
        relativePath,
    });
    return sendResponse(res, 200, user, "Document updated successfully");
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
    const id = req.user._id || req.query.userId;

    const user = await deliveryAgentModel.findById(id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getDeliveryAgentById = asyncHandler(async (req, res) => {
    const user = await deliveryAgentModel.findById(req.params.id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getAllDeliveryAgent = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, startDate, populate, status } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    // Search based on user query
    if (search) {
        dbQuery = {
            $or: [{ name: { $regex: `^${search}`, $options: "i" } }],
        };
    }

    // Sort by status
    if (status) {
        dbQuery.status = Number(status);
    }

    // Sort by date range
    if (startDate) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(23, 59, 59, 999);
        dbQuery.createdAt = {
            $gte: sDate,
            $lte: eDate,
        };
    }

    let userAggregation = [
        {
            $match: dbQuery,
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

    // Conditionally add $lookup stage if populate is true
    if (populate && Number(populate) === 1) {
        // Add a lookup stage to fetch hotel owner details
        userAggregation.splice(1, 0, {
            $lookup: {
                as: "deliveryagentdocuments",
                from: "deliveryagentdocuments",
                foreignField: "userId",
                localField: "_id",
            },
        });
    }

    const dataCount = await deliveryAgentModel.countDocuments();
    const user = await deliveryAgentModel.aggregate(userAggregation);
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

exports.updateDeliveryAgent = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, status, userId, isOnline } = req.body;
    const isExistUser = await deliveryAgentModel.findById(userId);
    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    const user = await deliveryAgentModel.findByIdAndUpdate(
        userId,
        {
            $set: {
                name,
                email,
                phoneNumber,
                status,
                isOnline,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(res, 200, user, "User updated successfully");
});

exports.deleteDeliveryAgent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isExistUser = await deliveryAgentModel.findById(id);
    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    deleteFile(isExistUser?.relativePath);
    const user = await deliveryAgentModel.findByIdAndDelete(id);
    return sendResponse(res, 200, user._id, "User deleted successfully");
});

exports.addRattingToDeliveryAgent = asyncHandler(async (req, res) => {
    const { deliveryAgentId, userId, rating, description } = req.body;
    const isExistUser = await deliveryAgentRating.findOne({
        userId,
        deliveryAgentId,
    });

    if (isExistUser)
        return sendResponse(res, 400, null, "Rating already added");
    const ratting = await deliveryAgentRating.create({
        deliveryAgentId,
        userId,
        rating,
        description,
    });
    return sendResponse(res, 200, ratting, "Ratting added successfully");
});

// Function to get the average rating for a delivery agent
exports.getAverageRating = asyncHandler(async (deliveryAgentId) => {
    const result = await deliveryAgentRating.aggregate([
        {
            $match: {
                deliveryAgentId: new ObjectId(deliveryAgentId),
            },
        },
        {
            $group: {
                _id: "$deliveryAgentId",
                averageRating: { $avg: "$star" },
            },
        },
    ]);
    const data = result.length > 0 ? result[0].averageRating : 0;
    sendResponse(res, 200, data, "Average rating calculated successfully.");
});


/**
 * GET /delivery-agents/:agentId/earnings/by-orders
 * Query params:
 * - startDate?: ISO
 * - endDate?: ISO
 * - role?: 'pickup' | 'delivery' | 'both'  (default: 'both')
 * - onlyCompleted?: 'true' | 'false'       (default: 'false')
 * - settled?: 'all' | 'true' | 'false'     (default: 'all')
 * - includePayoutInfo?: 'true' | 'false'   (default: 'true')
 * - page?: number                          (default: 1)
 * - limit?: number                         (default: 20)
 * - sort?: 'date' | '-date'                (default: '-date')
 * - dateField?: 'createdAt' | 'completedAt' (default: 'createdAt')
 */
// …imports unchanged…

// GET /delivery-agents/:agentId/earnings/simple
exports.getAgentOrdersCompPlain = async (req, res) => {
    try {
      const agentId = String(req.params.agentId || '').trim();
  
      // Match this agent in pickup OR delivery (ObjectId or string)
      const orConds = [];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        const oid = new mongoose.Types.ObjectId(agentId);
        orConds.push({ orderPickupAgentId: oid }, { orderDeliveryAgentId: oid });
      }
      orConds.push({ orderPickupAgentId: agentId }, { orderDeliveryAgentId: agentId });
  
      const orders = await Order.find({ $or: orConds })
        .select('orderId status createdAt orderPickupAgentId orderDeliveryAgentId priceDetails.deliveryBoyCompensation')
        .lean();
  
      const items = orders.map(o => ({
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        createdAt: o.createdAt,
        pickupAgentId: o.orderPickupAgentId,
        deliveryAgentId: o.orderDeliveryAgentId,
        compensation: Number(o?.priceDetails?.deliveryBoyCompensation) || 0
      }));
  
      return res.json({ success: true, data: items });
    } catch (err) {
      console.error('getAgentOrdersCompPlain error', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };