const { asyncHandler, sendResponse } = require("../utils/helper.utils");

/**
 * The function `checkAccessPermission` validates access permissions based on the provided parameters
 * and sends a response if permission is denied.
 * @param accessLevel - The `accessLevel` parameter in the `checkAccessPermission` function represents
 * the level of access permission for a user. It can have three values:
 * @param adminType - Admin type is a variable that stores the type of administrator accessing the
 * system. In the provided function, adminType is checked to determine the level of access permissions
 * for different types of administrators.
 * @param method - The `method` parameter in the `checkAccessPermission` function represents the HTTP
 * method being used for a request, such as "GET", "POST", "PUT", or "DELETE". The function checks the
 * access level and admin type to determine if the user has permission to perform the specified action
 * based
 * @param res - The `res` parameter in the `checkAccessPermission` function is typically used to send
 * the HTTP response back to the client. It is an object that represents the response that an
 * Express.js route sends when it gets an HTTP request. This response object allows you to send data
 * back to the client,
 * @param next - The `next` parameter in the `checkAccessPermission` function is a callback function
 * that is used to pass control to the next middleware function in the stack. When called, it will
 * execute the next middleware function. This is commonly used in Express.js applications to move to
 * the next middleware in the chain
 * @returns In the provided code snippet, the `checkAccessPermission` function is returning a call to
 * the `sendResponse` function with a 403 status code and a message indicating that the user does not
 * have permission to perform the action. This return statement is used to handle cases where the
 * access permissions do not allow the user to perform certain actions based on their `accessLevel`,
 * `adminType`, and `
 */
const checkAccessPermission = (accessLevel, adminType, method, res, next) => {
    if (
        adminType != 0 &&
        accessLevel != 0 &&
        accessLevel != 1 &&
        accessLevel != 2
    ) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action error code:1",
        );
    }
    if (accessLevel == 2 && (method === "PUT" || method === "DELETE" || method === "POST")) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action error code: 2",
        );
    }
    if (accessLevel == 1 && method === "DELETE") {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action error code:3",
        );
    }
    next();
};

exports.categoryPermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.categoryAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.userPermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.userAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.deliveryAgentPermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.deliveryAgentAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.partnerPermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.partnerAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.shopePermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.shopeAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.servicePermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.servicesAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});


exports.cashbackOfferPermission = asyncHandler(async (req, res, next) => {

    checkAccessPermission(
        req.user.cashbackOfferAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.orderPermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.orderAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});

exports.messagePermission = asyncHandler(async (req, res, next) => {
    checkAccessPermission(
        req.user.messageAccess,
        req.user.adminType,
        req.method,
        res,
        next,
    );
});