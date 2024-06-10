const ratingModel = require("../models/ratting.model");
const serviceModel = require("../models/services.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");
const { Types } = require("mongoose");

exports.addRatting = asyncHandler(async (req, res) => {
    const { userId, serviceId, description, star } = req.body;
    const isExistRatting = await ratingModel.findOne({ userId, serviceId });
    if (isExistRatting) {
        return sendResponse(res, 400, null, "Ratting already exist");
    }
    const ratting = await ratingModel.create({
        userId,
        serviceId,
        description,
        star,
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

    return sendResponse(res, 200, stats[0], "Rating stats fetched successfully");
});

exports.getRattingStatsByShop = asyncHandler(async (req, res) => {
    // Perform the aggregation pipeline on the Service model
    const stats = await serviceModel.aggregate([
        // Stage 1: Match services for a specific shop using the provided shopId
        {
            $match: {
                shopeId: new Types.ObjectId(req.params.shopId),
            },
        },
        // Stage 2: Lookup ratings for each service
        {
            $lookup: {
                as: "ratings", // Name of the new array field to add to the documents
                from: "ratings", // Collection name in the database to join with
                foreignField: "serviceId", // Field in the ratings collection to join on
                localField: "_id", // Field in the services collection to join on
            },
        },
        // Stage 3: Unwind the ratings array
        {
            $unwind: {
                path: "$ratings", // Path to the array field to unwind
            },
        },
        // Stage 4: Group by service to calculate the total stars and count of ratings for each service
        {
            $group: {
                _id: "$_id", // Group by the service ID
                serviceName: {
                    $first: "$name", // Get the name of the service
                },
                shopId: {
                    $first: "$shopeId", // Get the shop ID
                },
                totalStars: {
                    $sum: "$ratings.star", // Sum of the star ratings for the service
                },
                ratingCount: {
                    $sum: 1, // Count of the ratings for the service
                },
            },
        },
        // Stage 5: Group by shop to calculate the total stars and count of ratings for the shop
        {
            $group: {
                _id: "$shopId", // Group by the shop ID
                totalStars: {
                    $sum: "$totalStars", // Sum of the total stars for the shop
                },
                totalRatings: {
                    $sum: "$ratingCount", // Sum of the rating counts for the shop
                },
            },
        },
        // Stage 6: Project the results to include the average rating, total ratings, and shop ID
        {
            $project: {
                _id: 0, // Exclude the _id field from the result
                shopeId: "$_id", // Include the shop ID
                averageRating: {
                    $cond: [
                        {
                            $eq: ["$totalRatings", 0], // If there are no ratings
                        },
                        0, // Set the average rating to 0 if no ratings
                        {
                            $round: [
                                {
                                    $divide: ["$totalStars", "$totalRatings"], // Calculate the average rating
                                },
                                1, // Round the average rating to 1 decimal places
                            ],
                        },
                    ],
                },
                totalRatings: 1, // Include the total ratings count
            },
        },
    ]);

    // Check if no ratings are found
    if (stats.length === 0) {
        return sendResponse(res, 404, [], "No ratings found for this shop");
    }

    // Return the computed stats
    return sendResponse(res, 200, stats[0], "Ratings fetched successfully");
});
