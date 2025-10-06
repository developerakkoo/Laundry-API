/**
 * @description Common Error class to throw an error from anywhere.
 * The {@link errorHandler} middleware will catch this error at the central place and it will return an appropriate response to the client
 */

class apiError extends Error {
    /**
     *
     * @param {number} statusCode
     * @param {string} message
     * @param {any[]} errors
     * @param {string} stack
     */
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = "",
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * @class apiResponse
 * @description Represents the structure of API responses with a standardized format.
 */

class apiResponse {
    /**
     * @constructor
     * @param {number} statusCode - HTTP status code of the response.
     * @param {any} data - Data to be included in the response.
     * @param {string} [message='Success'] - Message describing the result of the response.
     */

    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode;
        this.data = data || {};
        this.message = message;
        this.success = statusCode < 400;
    }
}

// Example Usage:
// const response = new apiResponse(200, { key: 'value' }, 'Operation successful');
// console.log(response);

/**
 * @function asyncHandler
 * @description Wraps an asynchronous route handler to ensure proper error handling.
 * @param {function} requestHandler - Asynchronous route handler function.
 * @returns {function} Express middleware function with error handling.
 */

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) =>
            next(err),
        );
    };
};

/* Example Usage:
 *  const asyncRouteHandler = asyncHandler(async (req, res, next) => {
 *      Asynchronous operations
 * });
 * router.get('/example', asyncRouteHandler);
 */

/**
 * The function `sendResponse` sends a JSON response with a specified status code, data, and optional
 * message.
 * @param res - The `res` parameter is typically the response object in Node.js, which is used to send
 * a response back to the client making the request.
 * @param statusCode - The `statusCode` parameter is the HTTP status code that will be sent in the
 * response. It indicates the status of the HTTP request, such as 200 for a successful request, 404 for
 * not found, 500 for server error, etc.
 * @param [data] - The `data` parameter in the `sendResponse` function is used to pass any relevant
 * data that you want to send back in the response. This data could be in the form of an object, array,
 * string, etc., depending on what information you want to include in the response.
 * @param message - The `message` parameter in the `sendResponse` function is a string that represents
 * a message or description related to the response being sent. It can be used to provide additional
 * information or context along with the response data.
 */
const sendResponse = (res, statusCode, data = null, message) => {
    res.status(statusCode).json(new apiResponse(statusCode, data, message));
};

/**
 * @function generateAccessAndRefreshTokens
 * @async
 * @param {string} userId - The unique identifier of the user for whom tokens are generated.
 * @returns {object} An object containing the generated access and refresh tokens.
 * @throws {ApiError} Throws an API error with a 500 status if something goes wrong during token generation.
 * @description This asynchronous function generates access and refresh tokens for a user based on their user ID.
 * It retrieves the user from the database using the provided user ID, generates an access token and a refresh token,
 * associates the refresh token with the user, saves the user with the updated refresh token, and returns the generated tokens.
 */

const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const partnerModel = require("../models/partner.model");
const Admin = require("../models/admin.model");
const deliveryAgentModel = require("../models/deliveryAgent.model");

const generateAccessAndRefreshTokens = async (incomingUser, userType) => {
    try {
        let user;
        // Retrieve user details from the database based on the provided user ID
        if (userType === 1) {
            user = await Admin.findById(incomingUser._id);
        }
        if (userType === 2) {
            user = await User.findById(incomingUser._id);
        }
        if (userType === 3) {
            user = await deliveryAgentModel.findById(incomingUser._id);
        }
        if (userType === 4) {
            user = await partnerModel.findById(incomingUser._id);
        }

        let payload = {
            user,
            userType,
        };

        // Generate access and refresh tokens using the user's details
        const accessToken = jwt.sign(
            payload,
            process.env.JWT_ACCESS_SECRET_KEY,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            },
        );
        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET_KEY,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
            },
        );

        // Associate the generated refresh token with the user and save it to the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        // Return the generated access and refresh tokens
        return Promise.resolve({ accessToken, refreshToken });
    } catch (error) {
        return Promise.reject(error);
    }
};

const deleteFile = (filePath) => {
    filePath = path.join(__dirname, "..", filePath);
    fs.unlink(filePath, (err) => console.log(err));
};

/**
 * Creates a regular expression for searching based on the provided query.
 *
 * @param {string} query - The search query string.
 * @return {RegExp} - The constructed regular expression for the search query.
 * Example usage:
 * Replace 'search' with your search query string
 * const searchRegex = createSearchRegex(search);
 */
function createSearchRegex(query) {
    // Trim leading and trailing whitespace from the query string
    const trimmedQuery = query.trim();

    // Check if the trimmed query contains any spaces, indicating multiple words
    if (trimmedQuery.includes(" ")) {
        // Split the query into individual words
        const words = trimmedQuery
            .split(" ") // Split the query string by spaces
            .map((word) => `\\b${word}\\b`) // Add word boundary anchors to each word
            .join("|"); // Join the words with the OR operator '|'

        // Create a case-insensitive regular expression to match any of the words
        return new RegExp(words, "i");
    } else {
        // If the query is a single word or phrase, create a case-insensitive regex for it
        return new RegExp(trimmedQuery, "i");
    }
}

/**
 * Generates a 4-digit random number (OTP) for authentication purposes.
 *
 * @function generateOTP
 * @returns {number} A 4-digit random number between 1000 and 9999.
 *
 * @example
 * const otp = generateOTP();
 * console.log('Generated OTP:', otp); // Output: Generated OTP: 1234
 */
function generateOTP() {
    // Generate a random number between 1000 and 9999
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
}

/**
 * ==========================
 * 🚚 DRIVER EARNINGS FORMULA
 * ==========================
 * Formula:
 * Earnings = (Base Rate × Distance) + (Weight/Volume × Rate per Unit) + (Tips/Incentives)
 */
const calculateDriverEarnings = (baseRate, distance, weightOrVolume, ratePerUnit, tipsOrIncentives = 0) => {
    const distanceEarnings = baseRate * distance;
    const weightEarnings = weightOrVolume * ratePerUnit;
    const totalEarnings = distanceEarnings + weightEarnings + tipsOrIncentives;

    return {
        totalEarnings,
        breakdown: {
            baseRate,
            distance,
            distanceEarnings,
            weightOrVolume,
            ratePerUnit,
            weightEarnings,
            tipsOrIncentives
        }
    };
};

/**
 * ==========================
 * 🧺 PARTNER EARNINGS FORMULA
 * ==========================
 * Formula:
 * Earnings = (Commission Percentage × Total Order Value) − (Operational Costs + Service Fees)
 */
const calculatePartnerEarnings = (commissionPercentage, totalOrderValue, operationalCosts, serviceFees) => {
    const commissionAmount = (commissionPercentage / 100) * totalOrderValue;
    const totalCosts = operationalCosts + serviceFees;
    const totalEarnings = commissionAmount - totalCosts;

    return {
        totalEarnings: Math.max(0, totalEarnings),
        breakdown: {
            commissionPercentage,
            totalOrderValue,
            commissionAmount,
            operationalCosts,
            serviceFees,
            totalCosts
        }
    };
};


module.exports = {
    apiError,
    apiResponse,
    asyncHandler,
    createSearchRegex,
    sendResponse,
    deleteFile,
    generateOTP,
    generateAccessAndRefreshTokens,
    calculatePartnerEarnings,
    calculateDriverEarnings,
};
