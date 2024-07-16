const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { asyncHandler, apiError } = require("../utils/helper.utils");
const userModel = require("../models/user.model");
const partnerModel = require("../models/partner.model");
const deliveryAgentModel = require("../models/deliveryAgent.model");

exports.isAuthenticated = asyncHandler(async (req, res, next) => {
    let user;
    const token =
        req.headers["x-access-token"] || req.cookies["accessToken"];

    // console.log('token',token);


    if (!token) throw new apiError(403, "Access Denied:Invalid access token");
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET_KEY);
    // console.log(decoded);
    // console.log('====================================');
    if (decoded.userType === 1) {
        user = await Admin.findById(decoded.user._id);
    }
    if (decoded.userType === 2) {
        user = await userModel.findById(decoded.user._id);
    }

    if (decoded.userType === 3) {
        user = await deliveryAgentModel.findById(decoded.user._id);
    }

    if (decoded.userType === 4) {
        user = await partnerModel.findById(decoded.user._id);
    }

    if (!user) {
        throw new apiError(401, "Access Denied:Unauthorized request");
    }

    req.user = user;
    next();
});
