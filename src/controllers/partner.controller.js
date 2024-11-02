const partnerModel = require("../models/partner.model");
const partnerDocumentSchema = require("../models/partnerDocument.model");
const shopeModel = require("../models/shope.model");
const servicesModel = require("../models/services.model");
const categoryModel = require("../models/category.model");
const Favorite = require("../models/favorite.model");
const { ObjectId } = require("mongoose").Types;
const {
    asyncHandler,
    sendResponse,
    generateAccessAndRefreshTokens,
    apiResponse,
    deleteFile,
    createSearchRegex,
} = require("../utils/helper.utils");
const { cookieOptions } = require("../constant");

exports.registerUser = asyncHandler(async (req, res, next) => {
    const { name, email, phoneNumber } = req.body;
    const isExistUser = await partnerModel.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistUser) {
        return sendResponse(res, 400, null, "User already exist");
    }
    const user = await partnerModel.create({
        name,
        email,
        phoneNumber,
    });
    // const newUser = await partnerModel.findById(user._id);
    // if (!newUser) {
    //     return sendResponse(
    //         res,
    //         400,
    //         null,
    //         "Something went wrong while registering the user",
    //     );
    // }
    // return sendResponse(res, 201, "newUser", "User created successfully");
    req.body.partnerId = user._id;
    next();
});

exports.uploadPartnerDocuments = asyncHandler(async (req, res) => {
    const { userId, documentType, documentNumber } = req.body;

    const isExistUser = await partnerModel.findById(userId);
    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let document_url = `https://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        document_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }

    const isExistDoc = partnerDocumentSchema.findOne({
        userId,
        documentType,
    });
    if (isExistDoc?.relativePath) deleteFile(isExistDoc?.relativePath);

    const document = await partnerDocumentSchema.create({
        userId,
        documentType,
        // documentNumber,
        document_url,
        relativePath,
    });
    return sendResponse(res, 200, document, "Document updated successfully");
});

exports.getDocumentsByPartnerId = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await partnerDocumentSchema.findOne({
        userId,
    });
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "Document fetched successfully");
});

exports.getPartnerDocumentId = asyncHandler(async (req, res) => {
    const document = await partnerDocumentSchema.findById(req.params.id);
    if (!document) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, document, "Document fetched successfully");
});

exports.login = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await partnerModel.findOne({ phoneNumber }); //.select("+password");
    console.log(user);
    
    if (!user) {
        return sendResponse(
            res,
            200,
            { isRegistered: false },
            "User not found",
        );
    }
    // const isMatch = await user.isPasswordCorrect(password);
    // if (!isMatch) {
    //     return sendResponse(res, 400, null, "Incorrect credentials");
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id,
        4,
    );
    const partnerShop = await shopeModel.findOne({ partnerId: user._id });
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                {
                    isRegistered: true,
                    userId: user._id,
                    shop: partnerShop,
                    accessToken,
                    refreshToken,
                },
                "User login successful, Welcome back",
            ),
        );
});

exports.logout = asyncHandler(async (req, res) => {
    await partnerModel.findByIdAndUpdate(req.user._id, {
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

exports.uploadProfileImage = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const isExistUser = await partnerModel.findById(userId);
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

    const user = await partnerModel.findByIdAndUpdate(
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

exports.updatePartnerById = asyncHandler(async (req, res) => {
    const {
        userId,
        name,
        email,
        phoneNumber,
        status,
        password,
        confirmPassword,
    } = req.body;

    const isExistUser = await partnerModel.findById(userId);

    if (!isExistUser) {
        return sendResponse(res, 404, null, "User not found");
    }
    if (password) {
        if (password !== confirmPassword) {
            return sendResponse(res, 401, null, "Invalid credentials");
        }
        const user = await partnerModel.findById(userId);
        user.password = password;
        await user.save({ validateBeforeSave: false });
        user.password = "**********";
        return sendResponse(res, 200, user, "User updated successfully");
    }
    const user = await partnerModel.findByIdAndUpdate(
        userId || req.params.id,
        {
            $set: {
                name,
                email,
                phoneNumber,
                status,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(res, 200, user, "User updated successfully");
});

exports.getCurrentUser = asyncHandler(async (req, res) => {
    const id = req.params.id;

    const user = await partnerModel.findById(id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.getPartnerById = asyncHandler(async (req, res) => {
    const user = await partnerModel.findById(req.params.id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    return sendResponse(res, 200, user, "User fetched successfully");
});

exports.deletePartnerById = asyncHandler(async (req, res) => {
    const user = await partnerModel.findByIdAndDelete(req.params.id);
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    if (user.relativePath) deleteFile(user?.relativePath);
    return sendResponse(res, 200, user._id, "User deleted successfully");
});

exports.getAllPartner = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, status } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery.$or = [
            { name: { $regex: searchRegex } },
            { phoneNumber: { $regex: searchRegex } },
        ];
    }

    if (status) {
        dbQuery.status = Number(status);
    }

    // Get total count of documents
    const dataCount = await partnerModel.countDocuments(dbQuery);

    // Aggregation pipeline with lookups and projection
    const partners = await partnerModel.aggregate([
        { $match: dbQuery }, // Match the search query
        { $skip: skip }, // Pagination skip
        { $limit: pageSize }, // Limit for pagination

        // Lookup for shop data
        {
            $lookup: {
                as: "shope",
                from: "shopes",
                foreignField: "partnerId",
                localField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            as: "category",
                            from: "categories",
                            foreignField: "_id",
                            localField: "category",
                        },
                    },
                ],
            },
        },

        // Lookup for partner documents
        {
            $lookup: {
                from: "partnerdocuments", // The name of the collection for partner documents
                localField: "_id", // Local field in partnerModel
                foreignField: "userId", // Foreign field in partnerDocument model
                as: "partnerDocuments", // Output array field name
            },
        },

        // Project to exclude the password field
        {
            $project: {
                password: 0, // Exclude password
            },
        },
    ]);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + partners.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    if (partners.length === 0) {
        return sendResponse(res, 404, null, "Partner not found");
    }

    return sendResponse(
        res,
        200,
        {
            content: partners,
            startItem,
            endItem,
            totalPages,
            pageSize: partners.length,
            totalDoc: dataCount,
        },
        "Partners fetched successfully",
    );
});

/***** Shope *****/
exports.createShope = asyncHandler(async (req, res) => {
    const {
        shopeName,
        address,
        partnerId,
        category,
        lng,
        lat,
        shopTimeTable,
        isAcceptExpressService,
        expressServiceCharges,
    } = req.body;
    const partner = await partnerModel.findById(partnerId);
    if (!partner) {
        return sendResponse(res, 404, null, "User not found");
    }
    const shopeExistWithName = await shopeModel.findOne({ name: shopeName });
    if (shopeExistWithName) {
        return sendResponse(res, 404, null, "Shope already exists this name");
    }
    const shope = await shopeModel.create({
        name: shopeName,
        address,
        category,
        shopTimeTable,
        location: {
            type: "Point",
            coordinates: [lng, lat],
        },
        isAcceptExpressService,
        expressServiceCharges,
        partnerId,
    });
    return sendResponse(res, 201, shope, "Shope created successfully");
});

exports.uploadShopeImage = asyncHandler(async (req, res) => {
    const { shopeId } = req.body;
    const isExistShope = await shopeModel.findById(shopeId);
    if (!isExistShope) {
        return sendResponse(res, 404, null, "Shope not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let image_url = `https://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        image_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }
    if (isExistShope.relativePath) deleteFile(isExistShope?.relativePath);

    const user = await shopeModel.findByIdAndUpdate(
        shopeId,
        {
            $set: {
                image: image_url,
                relativePath: relativePath,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(res, 200, user, "Shope image updated successfully");
});

exports.updateShope = asyncHandler(async (req, res) => {
    const {
        name,
        status,
        address,
        isOpen,
        isAcceptExpressService,
        expressServiceCharges,
    } = req.body;
    const user = await shopeModel.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                name,
                status,
                isOpen,
                isAcceptExpressService,
                expressServiceCharges,
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
            "Something went wrong while updating the shope",
        );
    }
    return sendResponse(res, 200, user, "Shope updated successfully");
});


exports.getAllShope = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, latitude, longitude } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Ensure latitude and longitude are provided
    // if (!latitude || !longitude) {
    //     return sendResponse(res, 400, null, "Latitude and longitude are required");
    // }

    // const userLocation = [parseFloat(longitude), parseFloat(latitude)];

    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery.$or = [
            { name: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
        ];
    }

    // Fetch shops without the distance (we'll add this via Google Maps API)
    const shops = await shopeModel
        .find(dbQuery)
        .populate({ path: "partnerId" })
        .populate({ path: "category" })
        .skip(skip)
        .limit(pageSize);

    if (shops.length === 0) {
        return sendResponse(res, 404, null, "Shops not found");
    }

    // Google Maps API Key
    //const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    // Create an array of promises to fetch the distances from Google Maps
    // const distancePromises = shops.map(async (shop) => {
    //     const shopLocation = `${shop.location.coordinates[1]},${shop.location.coordinates[0]}`; // shop's latitude, longitude

    //     // Make a request to Google Distance Matrix API to get driving distance
    //     const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
    //         params: {
    //             origins: `${latitude},${longitude}`, // user's location
    //             destinations: shopLocation, // shop's location
    //             key: googleMapsApiKey,
    //             mode: 'driving',
    //         },
    //     });

    //     const distanceData = response.data.rows[0].elements[0];

    //     // Add the calculated distance (in km) to the shop object
    //     return {
    //         ...shop.toObject(),
    //         distance: distanceData.distance ? distanceData.distance.text : 'N/A', // e.g., "5.3 km"
    //         duration: distanceData.duration ? distanceData.duration.text : 'N/A', // e.g., "10 mins"
    //     };
    // });

    // Resolve all distance promises
    // const shopsWithDistances = await Promise.all(distancePromises);

    const startItem = skip + 1;
    const endItem = Math.min(startItem + pageSize - 1, startItem + shops.length - 1);
    const totalPages = Math.ceil(await shopeModel.countDocuments(dbQuery) / pageSize);

    // Send the response
    return sendResponse(
        res,
        200,
        {
            content: shops,
            startItem,
            endItem,
            totalPages,
            pagesize: shops.length,
            totalDoc: shops.length,
        },
        "Shops fetched successfully"
    );
});

const axios = require("axios");

exports.getShopeByCategoryId = asyncHandler(async (req, res) => {
    const { latitude, longitude, categoryId, userId } = req.body;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    let dbQuery = {};

    // Search based on user query
    if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, "i");
        dbQuery.$or = [{ name: { $regex: searchRegex } }];
    }

    // Filter by category
    if (categoryId) {
        dbQuery.category = new ObjectId(categoryId);
    }

    let pipeline = [];

    // If location is provided, use $geoNear to sort by proximity
    if (latitude && longitude) {
        pipeline.push({
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
                distanceField: "geoDistance",
                spherical: true,
                query: dbQuery,
            },
        });
    } else {
        pipeline.push({
            $match: dbQuery,
        });
    }

    // Pagination stages
    pipeline.push({ $skip: skip }, { $limit: pageSize });

    const [shops, dataCount] = await Promise.all([
        shopeModel.aggregate(pipeline),
        shopeModel.countDocuments(dbQuery),
    ]);

    if (shops.length === 0) {
        return sendResponse(res, 404, null, "Shops not found");
    }

    // Fetch user's favorite shops
    let favoriteShops = [];
    if (userId) {
        favoriteShops = await Favorite.find({ userId }).select("shopId").lean();
        favoriteShops = favoriteShops.map((fav) => fav.shopId.toString());
    }

    // Calculate road distances
    const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Replace with your Google Maps API key
    const origins = [`${latitude},${longitude}`];
    const destinations = shops.map(
        (shop) =>
            `${shop.location.coordinates[1]},${shop.location.coordinates[0]}`,
    );

    const response = await axios.get(
        "https://maps.googleapis.com/maps/api/distancematrix/json",
        {
            params: {
                origins: origins.join("|"),
                destinations: destinations.join("|"),
                key: apiKey,
            },
        },
    );

    const distanceMatrix = response.data;

    // Add road distance to each shop
    shops.forEach((shop, index) => {
        const element = distanceMatrix.rows[0].elements[index];
        if (element && element.distance) {
            shop.distance = (element.distance.value * 0.001).toFixed(2); // Convert meters to kilometers
        }
    });

    // Sort shops by distance (nearest first)
    shops.sort((a, b) => a.distance - b.distance);

    // Add isFavorite field to each shop
    shops.forEach((shop) => {
        shop.isFavorite = favoriteShops.includes(shop._id.toString());
    });

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + shops.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    return sendResponse(
        res,
        200,
        {
            content: shops,
            startItem,
            endItem,
            totalPages,
            pageSize: shops.length,
            totalDoc: dataCount,
        },
        "Shops fetched successfully",
    );
});

exports.getShopeById = asyncHandler(async (req, res) => {
    const shope = await shopeModel.findById(req.params.id);
    if (!shope) {
        return sendResponse(res, 404, null, "Shope not found");
    }
    return sendResponse(res, 200, shope, "Shope fetched successfully");
});

exports.getAllShopeByPartnerId = asyncHandler(async (req, res) => {
    const shope = await shopeModel.find({ partnerId: req.params.id });
    if (!shope) {
        return sendResponse(res, 404, null, "Shope's not found");
    }
    return sendResponse(res, 200, shope, "Shope's fetched successfully");
});

exports.getShopeById = asyncHandler(async (req, res) => {
    const shope = await shopeModel.findById(req.params.id);
    if (!shope) {
        return sendResponse(res, 404, null, "Shope not found");
    }
    return sendResponse(res, 200, shope, "Shope fetched successfully");
});
exports.deleteShopeById = asyncHandler(async (req, res) => {
    const shope = await shopeModel.findByIdAndDelete(req.params.id);
    if (!shope) {
        return sendResponse(res, 404, null, "Shope not found");
    }
    if (shope.relativePath) deleteFile(shope?.relativePath);
    return sendResponse(res, 200, shope._id, "Shope deleted successfully");
});

/***** service *****/

exports.createService = asyncHandler(async (req, res) => {
    const {
        categoryId,
        shopeId,
        name,
        type,
        description,
        perKgPrice,
        perPeacePrice,
        quantityAcceptedIn,
    } = req.body;
    const shope = await shopeModel.findById(shopeId);
    if (!shope) {
        return sendResponse(res, 404, null, "Shope not found");
    }
    const service = await servicesModel.create({
        categoryId,
        shopeId,
        name,
        type,
        description,
        perKgPrice,
        perPeacePrice,
        quantityAcceptedIn,
    });
    return sendResponse(res, 201, service, "Service created successfully");
});

exports.uploadServiceImage = asyncHandler(async (req, res) => {
    const { serviceId } = req.body;
    const isExistService = await servicesModel.findById(serviceId);
    if (!isExistService) {
        return sendResponse(res, 404, null, "Service not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let image_url = `https://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        image_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }
    if (isExistService.relativePath) deleteFile(isExistService?.relativePath);

    const service = await servicesModel.findByIdAndUpdate(
        serviceId,
        {
            $set: {
                image_url,
                relativePath: relativePath,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(
        res,
        200,
        service,
        "Service image updated successfully",
    );
});

exports.updateService = asyncHandler(async (req, res) => {
    const { categoryId, shopeId, name, description, price, status } = req.body;
    if (shopeId) {
        const shope = await shopeModel.findById(shopeId);
        if (!shope) {
            return sendResponse(res, 404, null, "Shope not found");
        }
    }
    const service = await servicesModel.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                categoryId,
                shopeId,
                name,
                description,
                price,
                status,
            },
        },
        { new: true },
    );
    if (!service) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while updating the service",
        );
    }
    return sendResponse(res, 200, service, "Service updated successfully");
});

exports.getServiceById = asyncHandler(async (req, res) => {
    const service = await servicesModel.findById(req.params.id);
    if (!service) {
        return sendResponse(res, 404, null, "Service not found");
    }
    return sendResponse(res, 200, service, "Service fetched successfully");
});

exports.getAllServiceByShopeId = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const dataCount = await servicesModel.countDocuments({
        shopeId: req.params.id,
    });
    const service = await servicesModel
        .find({ shopeId: req.params.id })
        .skip(skip)
        .limit(pageSize);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + service.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    if (!service.length === 0) {
        return sendResponse(res, 404, null, "Service not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: service,
            startItem,
            endItem,
            totalPages,
            pagesize: service.length,
            totalDoc: dataCount,
        },
        "Service fetched successfully",
    );
});

exports.getAllServiceByCategoryId = asyncHandler(async (req, res) => {
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const dataCount = await servicesModel.countDocuments({
        categoryId: req.params.id,
    });
    const service = await servicesModel
        .find({ categoryId: req.params.id })
        .skip(skip)
        .limit(pageSize);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + service.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (service.length === 0) {
        return sendResponse(res, 404, null, "Service not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: service,
            startItem,
            endItem,
            totalPages,
            pagesize: service.length,
            totalDoc: dataCount,
        },
        "Service fetched successfully",
    );
});

exports.getAllServices = asyncHandler(async (req, res) => {
    const {
        search,
        categoryId,
        shopeId,
        lowerPrice,
        upperPrice,
        quantityAcceptedIn,
    } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    let dbQuery = {};

    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery.$or = [
            { name: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
        ];
    }

    // Filter based on category ID(s)
    if (categoryId) {
        const categoryArray = categoryId.split(",").map((id) => id.trim());
        if (categoryArray.length === 1) {
            dbQuery.categoryId = categoryArray[0];
        } else {
            dbQuery.categoryId = { $in: categoryArray };
        }
    }

    // Sort by price range
    if (lowerPrice && upperPrice) {
        dbQuery.price = {
            $gte: lowerPrice,
            $lte: upperPrice,
        };
    }

    // filter based on shopId
    if (shopeId) {
        dbQuery.shopeId = shopeId;
    }

    // filter based on quantityAcceptedIn
    if (quantityAcceptedIn) {
        dbQuery.quantityAcceptedIn = quantityAcceptedIn;
    }

    const dataCount = await servicesModel.countDocuments(dbQuery);
    const service = await servicesModel
        .find(dbQuery)
        .populate({ path: "categoryId", select: "_id name image_url" })
        .populate({
            path: "shopeId",
            select: "_id name address partnerId",
            populate: {
                path: "partnerId",
                select: "_id name phoneNumber profile_image",
            },
        })
        .skip(skip)
        .limit(pageSize);

    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + service.length - 1,
    );

    const totalPages = Math.ceil(dataCount / pageSize);

    return sendResponse(
        res,
        200,
        {
            content: service,
            startItem,
            endItem,
            totalPages,
            pagesize: service.length,
            totalDoc: dataCount,
        },
        "Service fetched successfully",
    );
});

exports.deleteService = asyncHandler(async (req, res) => {
    const service = await servicesModel.findByIdAndDelete(req.params.id);
    if (!service) {
        return sendResponse(res, 404, null, "Service not found");
    }
    if (service.relativePath) deleteFile(service?.relativePath);
    return sendResponse(res, 200, service._id, "Service deleted successfully");
});

const moment = require("moment");
const Order = require("../models/order.model");
exports.getPartnerDashData = asyncHandler(async (req, res) => {
    const shopId = req.query.shopId;

    if (!shopId) {
        return sendResponse(res, 400, null, "shopId is required");
    }

    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const startOfWeek = moment().startOf("week").toDate();
    const endOfWeek = moment().endOf("week").toDate();

    // Create an array of promises
    const [totalStats, currentMonthStats, weeklyStats] = await Promise.all([
        Order.aggregate([
            { $match: { shopId: new ObjectId(shopId) } },
            {
                $group: {
                    _id: "$shopId",
                    totalOrders: { $sum: 1 },
                    totalEarnings: { $sum: "$priceDetails.totalAmountToPay" },
                },
            },
        ]),
        Order.aggregate([
            {
                $match: {
                    shopId: new ObjectId(shopId),
                    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
                },
            },
            {
                $group: {
                    _id: "$shopId",
                    totalOrders: { $sum: 1 },
                    totalEarnings: { $sum: "$priceDetails.totalAmountToPay" },
                },
            },
        ]),
        Order.aggregate([
            {
                $match: {
                    shopId: new ObjectId(shopId),
                    createdAt: { $gte: startOfWeek, $lte: endOfWeek },
                },
            },
            {
                $group: {
                    _id: {
                        day: { $dayOfWeek: "$createdAt" },
                        year: { $year: "$createdAt" },
                        week: { $week: "$createdAt" },
                    },
                    totalOrders: { $sum: 1 },
                    totalEarnings: { $sum: "$priceDetails.totalAmountToPay" },
                },
            },
            {
                $sort: { "_id.year": 1, "_id.week": 1, "_id.day": 1 },
            },
        ]),
    ]);

    // Format results
    const totalStatsResult = totalStats[0] || {
        totalOrders: 0,
        totalEarnings: 0,
    };
    const currentMonthStatsResult = currentMonthStats[0] || {
        totalOrders: 0,
        totalEarnings: 0,
    };

    // Generate days of the current week
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => ({
        day: moment().startOf("week").add(i, "days").format("dddd"),
        totalOrders: 0,
        totalEarnings: 0,
    }));

    // Map the weeklyStats to include days with zero orders and earnings
    const weeklyData = weeklyStats.reduce((acc, stat) => {
        const dayName = moment().day(stat._id.day).format("dddd");
        const dayData = acc.find((d) => d.day === dayName);
        if (dayData) {
            dayData.totalOrders = stat.totalOrders;
            dayData.totalEarnings = stat.totalEarnings;
        }
        return acc;
    }, daysOfWeek);

    sendResponse(
        res,
        200,
        {
            totalStats: totalStatsResult,
            currentMonthStats: currentMonthStatsResult,
            weeklyStats: weeklyData,
        },
        "Partner dashboard data fetched successfully",
    );
});


exports.getAllCategory = asyncHandler(async (req, res) => {
    const category = await categoryModel.find({});
    if (category.length === 0) {
        return sendResponse(res, 404, null, "Category not found");
    }
    return sendResponse(res, 200, category, "Category fetched successfully");
});