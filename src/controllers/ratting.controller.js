const ratingModel = require("../models/ratting.model");
const serviceModel = require("../models/services.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");
const { Types } = require("mongoose");

exports.addRatting = asyncHandler(async (req, res) => {
    const { userId, serviceId, description, star } = req.body;
    const images = req.files
        ? req.files.map(
              (file) => `https://${req.hostname}/uploads/${file.filename}`,
          )
        : [];
    const isExistRatting = await ratingModel.findOne({ userId, serviceId });
    if (isExistRatting) {
        return sendResponse(res, 400, null, "Ratting already exist");
    }
    const ratting = await ratingModel.create({
        userId,
        serviceId,
        description,
        star,
        images,
    });
    return sendResponse(res, 200, ratting, "Ratting added successfully");
});

exports.updateRatting = asyncHandler(async (req, res) => {
    const { userId, serviceId, description, star } = req.body;
    const ratting = await ratingModel.findOneAndUpdate(
        { userId, serviceId },
        {
            userId,
            serviceId,
            description,
            star,
        },
        { new: true },
    );
    return sendResponse(res, 200, ratting, "Ratting updated successfully");
});

exports.getRatting = asyncHandler(async (req, res) => {
    const ratting = await ratingModel.findById(req.params.id);
    if (!ratting) {
        return sendResponse(res, 404, null, "Ratting not found");
    }
    return sendResponse(res, 200, ratting, "Ratting fetched successfully");
});

exports.getRattingByService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;
    const ratting = await ratingModel.find({ serviceId });
    if (!ratting) {
        return sendResponse(res, 404, null, "Ratting not found");
    }
    return sendResponse(res, 200, ratting, "Ratting fetched successfully");
});

exports.getRattingByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const ratting = await ratingModel.find({ userId });
    if (!ratting) {
        return sendResponse(res, 404, null, "Ratting not found");
    }
    return sendResponse(res, 200, ratting, "Ratting fetched successfully");
});

exports.deleteRating = asyncHandler(async (req, res) => {
    const ratting = await ratingModel.findByIdAndDelete(req.params.id);
    if (!ratting) {
        return sendResponse(res, 404, null, "Ratting not found");
    }
    return sendResponse(res, 200, null, "Ratting deleted successfully");
});
exports.getRattingStatsByService = asyncHandler(async (req, res) => {
    const { serviceId } = req.params;
    const stats = await ratingModel.aggregate([
        { $match: { serviceId: new Types.ObjectId(serviceId) } },
        // Group by star and calculate the count of each star
        {
            $group: {
                _id: "$star",
                count: { $sum: 1 },
            },
        },
        // Sort by star to get results in order
        { $sort: { _id: 1 } },
        // Add a new stage to calculate the average rating and total ratings
        {
            $group: {
                _id: null,
                stars: { $push: { star: "$_id", count: "$count" } },
                totalRatings: { $sum: "$count" },
                sumOfStars: { $sum: { $multiply: ["$_id", "$count"] } },
            },
        },
        // Calculate the average rating
        {
            $project: {
                _id: 0,
                stars: 1,
                totalRatings: 1,
                averageRating: {
                    $cond: [
                        { $eq: ["$totalRatings", 0] },
                        0,
                        {
                            $round: [
                                { $divide: ["$sumOfStars", "$totalRatings"] },
                                1,
                            ],
                        },
                    ],
                },
            },
        },
    ]);

    if (stats.length === 0) {
        return sendResponse(res, 404, [], "No ratings found for this service");
    }

    return sendResponse(
        res,
        200,
        stats[0],
        "Rating stats fetched successfully",
    );
});

exports.getRattingStatsByShop = asyncHandler(async (req, res) => {
    const shopId = new Types.ObjectId(req.params.shopId);
    const includeRatings = req.query.rd === "1"; // Check if 'rd' query parameter is set to '1'

    // Aggregation pipeline to calculate stats
    const [stats] = await serviceModel.aggregate([
        {
            $match: {
                shopeId: shopId,
            },
        },
        {
            $lookup: {
                as: "ratings",
                from: "ratings",
                foreignField: "serviceId",
                localField: "_id",
            },
        },
        {
            $unwind: {
                path: "$ratings",
                preserveNullAndEmptyArrays: true, // Include services with no ratings
            },
        },
        {
            $group: {
                _id: "$_id",
                serviceName: { $first: "$name" },
                shopId: { $first: "$shopeId" },
                totalStars: { $sum: "$ratings.star" },
                ratingCount: {
                    $sum: {
                        $cond: [{ $ifNull: ["$ratings.star", false] }, 1, 0],
                    },
                },
            },
        },
        {
            $group: {
                _id: "$shopId",
                totalStars: { $sum: "$totalStars" },
                totalRatings: { $sum: "$ratingCount" },
            },
        },
        {
            $project: {
                _id: 0,
                shopeId: "$_id",
                averageRating: {
                    $cond: [
                        { $eq: ["$totalRatings", 0] },
                        0,
                        {
                            $round: [
                                { $divide: ["$totalStars", "$totalRatings"] },
                                1,
                            ],
                        },
                    ],
                },
                totalRatings: 1,
            },
        },
    ]);

    let ratings = [];
    if (includeRatings) {
        // Fetch all ratings for the shop
        ratings = await ratingModel.aggregate([
            {
                $match: {
                    serviceId: {
                        $in: await serviceModel
                            .find({ shopeId: shopId })
                            .distinct("_id"),
                    },
                },
            },
            {
                $lookup: {
                    from: "users", // Replace with your actual user collection name
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    as: "serviceDetails",
                    from: "services",
                    foreignField: "_id",
                    localField: "serviceId",
                },
            },
            {
                $unwind: {
                    path: "$serviceDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    description: 1,
                    star: 1,
                    images: 1,
                    "user.name": 1,
                    "serviceDetails.name": 1,
                    "serviceDetails.description": 1,
                    "serviceDetails.image_url": 1,
                },
            },
        ]);
    }

    // Check if no stats are found
    if (!stats) {
        return sendResponse(
            res,
            404,
            { ratings: [], stats: "No ratings found for this shop" },
            "No ratings found for this shop",
        );
    }

    // Return the computed stats and individual ratings
    return sendResponse(
        res,
        200,
        { stats, ratings },
        "Ratings fetched successfully",
    );
});
