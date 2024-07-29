const partnerModel = require("../models/partner.model");
const shopeModel = require("../models/shope.model");
const servicesModel = require("../models/services.model");
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

exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    const isExistUser = await partnerModel.findOne({
        $or: [{ email }, { phoneNumber }],
    });
    if (isExistUser) {
        return sendResponse(res, 400, null, "User already exist");
    }
    const user = await partnerModel.create({
        name,
        email,
        password,
        phoneNumber,
    });
    const newUser = await partnerModel.findById(user._id);
    if (!newUser) {
        return sendResponse(
            res,
            400,
            null,
            "Something went wrong while registering the user",
        );
    }
    return sendResponse(res, 201, newUser, "User created successfully");
});

exports.login = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const user = await partnerModel.findOne({ phoneNumber }); //.select("+password");
    if (!user) {
        return sendResponse(res, 404, null, "User not found");
    }
    // const isMatch = await user.isPasswordCorrect(password);
    // if (!isMatch) {
    //     return sendResponse(res, 400, null, "Incorrect credentials");
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id,
        4,
    );
    // user.password = "**********";
    return res
        .status(200)
        .cookie("access-token", accessToken, cookieOptions)
        .cookie("refresh-token", refreshToken, cookieOptions)
        .json(
            new apiResponse(
                200,
                { userId: user._id, accessToken, refreshToken },
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
    const id = req.user._id || req.query.userId;

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
    const { search } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery.$or = [
            { name: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
        ];
    }

    const dataCount = await partnerModel.countDocuments(dbQuery);
    const user = await partnerModel.find(dbQuery).skip(skip).limit(pageSize);
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

/***** Shope *****/
exports.createShope = asyncHandler(async (req, res) => {
    const {
        name,
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
    const shopeExistWithName = await shopeModel.findOne({ name });
    if (shopeExistWithName) {
        return sendResponse(res, 404, null, "Shope already exists this name");
    }
    const shope = await shopeModel.create({
        name,
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
    let image_url = `${req.protocol}://${req.hostname}/uploads/${filename}`;
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
    const { search } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    // Search based on user query
    if (search) {
        const searchRegex = createSearchRegex(search);
        dbQuery.$or = [
            { name: { $regex: searchRegex } },
            { name: { $regex: searchRegex } },
        ];
    }

    const dataCount = await shopeModel.countDocuments(dbQuery);
    const shope = await shopeModel.find(dbQuery).skip(skip).limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + shope.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);

    if (shope.length === 0) {
        return sendResponse(res, 404, null, "Shope's not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: shope,
            startItem,
            endItem,
            totalPages,
            pagesize: shope.length,
            totalDoc: dataCount,
        },
        "Shope's fetched successfully",
    );
});

exports.getShopeByCategoryId = asyncHandler(async (req, res) => {
    const { search, latitude, longitude, categoryId, userId } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    let dbQuery = {};

    // Search based on user query
    if (search) {
        const searchRegex = new RegExp(search, "i");
        dbQuery.$or = [{ name: { $regex: searchRegex } }];
    }

    // Filter by category
    if (categoryId) {
        dbQuery.category = mongoose.Types.ObjectId(categoryId);
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
                distanceField: "distance",
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
        Shope.aggregate(pipeline),
        Shope.countDocuments(dbQuery),
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
    let image_url = `${req.protocol}://${req.hostname}/uploads/${filename}`;
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
