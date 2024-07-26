const Order = require("../models/order.model");
const shopModel = require("../models/shope.model");
const Wallet = require("../models/wallet.model");
const DeliveryBoy = require("../models/deliveryAgent.model");
const Cart = require("../models/cart.model");
const dataModel = require("../models/data.model");
const Service = require("../models/services.model");
const PromoCode = require("../models/promoCode.model");
const {
    apiResponse,
    asyncHandler,
    sendResponse,
    generateOTP,
    apiError,
} = require("../utils/helper.utils");
const {
    useWalletPoints,
    addPointsToWallet,
    calculateCashbackPoints,
} = require("../utils/wallet.utils");
const moment = require("moment");
const { sendNotification } = require("./notification.controller");

exports.calculateAmountToPay = asyncHandler(async (req, res) => {
    const data = await dataModel.find();
    if (!data || data.length === 0) {
        return sendResponse(
            res,
            500,
            null,
            "Server error: Missing configuration data",
        );
    }

    const {
        gstPercentage,
        deliveryCharges,
        platformFee,
        expressDeliveryCharges,
    } = data[0];
    const { userId, code, useWalletPoints, useExpressDelivery } = req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
        return sendResponse(res, 400, null, "Cart is empty");
    }

    // Calculate the subtotal (total product cost)
    const subtotal = (
        await Promise.all(
            cart.products.map(async (product) => {
                const service = await Service.findById(product.serviceId);
                if (!service) {
                    console.error(
                        `Service not found for id ${product.serviceId}`,
                    );
                    throw new apiError(
                        400,
                        `Service not found for id ${product.serviceId}`,
                    );
                }
                const price =
                    (cart.selectedQuantityType == 0
                        ? service.perPeacePrice
                        : service.perKgPrice) * product.quantity;
                console.log(
                    `Service ID: ${product.serviceId}, Price: ${price}`,
                );
                return price;
            }),
        )
    ).reduce((total, price) => total + price, 0);

    // Calculate GST
    const gstAmount = (subtotal * gstPercentage) / 100;

    // Determine delivery charges based on express delivery selection
    const finalDeliveryCharges = useExpressDelivery
        ? expressDeliveryCharges
        : deliveryCharges;

    // Calculate the initial total amount to pay
    let totalAmountToPay =
        subtotal + gstAmount + finalDeliveryCharges + platformFee;

    let discount = 0;
    let promoCodeId = null;
    let promoCodeDetails = null;
    let promoCodeData;
    let deliveryBoyCompensation = 0;

    // If a promo code is provided, validate and apply it
    if (code) {
        const promoCode = await PromoCode.findOne({ code });
        if (!promoCode || !promoCode.isActive) {
            throw new apiError(400, "Invalid promo code");
        }
        if (
            moment(promoCode.expiry, "DD-MM-YYYY").isBefore(
                moment(),
                "DD-MM-YYYY",
            )
        ) {
            throw new apiError(400, "Promo code expired");
        }
        if (subtotal < promoCode.minOrderAmount) {
            throw new apiError(
                400,
                "Order total needs to be greater than the minimum order amount",
            );
        }

        switch (promoCode.codeType) {
            case 1: // FREE_DELIVERY
                discount = finalDeliveryCharges;
                deliveryBoyCompensation = finalDeliveryCharges;
                promoCodeDetails = `FREE_DELIVERY`;
                totalAmountToPay -= finalDeliveryCharges;
                break;
            case 2: // GET_OFF
                discount = promoCode.discountAmount;
                promoCodeDetails = `GET_OFF`;
                totalAmountToPay -= promoCode.discountAmount;
                deliveryBoyCompensation = finalDeliveryCharges;
                break;
            case 3: // NEW_USER
                const userOrderExist = await Order.findOne({ userId });
                if (userOrderExist) {
                    throw new apiError(
                        400,
                        "This code is only valid on the first order",
                    );
                }
                discount = promoCode.discountAmount;
                deliveryBoyCompensation = finalDeliveryCharges;
                promoCodeDetails = `NEW_USER `;
                totalAmountToPay -= promoCode.discountAmount;
                break;
            default:
                throw new apiError(400, "Invalid promo code type");
        }

        promoCodeId = promoCode._id;
        promoCodeData = promoCode;
    }

    // Adjust totalAmountToPay in case it goes negative
    if (totalAmountToPay < 0) {
        totalAmountToPay = 0;
    }

    let walletPointsUsed = 0;

    // Check if the user wants to use wallet points
    if (useWalletPoints) {
        const wallet = await Wallet.findOne({ userId });
        console.log(wallet);
        if (!wallet) {
            throw new apiError(400, "Wallet not found");
        }

        // Use wallet points up to the total amount to pay
        walletPointsUsed = Math.min(wallet.points, totalAmountToPay);
        totalAmountToPay -= walletPointsUsed;

        // If totalAmountToPay goes negative, set it to zero
        if (totalAmountToPay < 0) {
            totalAmountToPay = 0;
        }
    }

    // Construct the detailed breakdown
    const breakdown = {
        subtotal,
        gstAmount,
        deliveryCharges:
            promoCodeDetails && promoCodeDetails.startsWith("FREE_DELIVERY")
                ? 0
                : finalDeliveryCharges,
        platformFee,
        expressDeliveryCharges: useExpressDelivery ? expressDeliveryCharges : 0,
        discount,
        walletPointsUsed,
        promoCodeId,
        totalAmountToPay,
        promoCodeDetails: promoCodeData,
    };

    // Return the calculated amounts and breakdown
    return sendResponse(res, 200, breakdown, "Amount calculated successfully");
});

// Create an order
exports.createOrder = asyncHandler(async (req, res) => {
    const {
        userId,
        dropoffAddressId,
        pickupAddressId,
        pickupTime,
        dropoffTime,
        selfService,
        priceDetails,
        paymentDetails,
    } = req.body;

    // Find the cart for the user and populate service and shop details
    const cart = await Cart.findOne({ userId }).populate("products.serviceId");
    if (!cart) {
        return sendResponse(res, 404, null, "Cart not found");
    }
    /*calculating the cashback based on order subtotal and adding to the user wallet
    if admin activate the cashback for user 
    */
    const cashbackPoints = await calculateCashbackPoints(priceDetails.subtotal);

    const order = await Order.create({
        userId,
        shopId: cart.shopId,
        items: cart.products,
        pickupAddress: pickupAddressId,
        dropoffAddress: dropoffAddressId,
        pickupTime,
        dropoffTime,
        selfService,
        paymentDetails,
        orderTimeline: [
            {
                title: "Order Placed",
                status: "PENDING",
                dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
            },
        ],
        priceDetails,
        cashbackPoints,
    });
    // Deduct the used points from the wallet
    useWalletPoints(userId, priceDetails.walletPointsUsed);

    // send notification to shop owner
    const shop = await shopModel.findById(cart.shopId);
    sendNotification(shop.partnerId, "New Order", order);

    // Clear the cart after placing the order
    await Cart.deleteOne({ userId });

    // Send response indicating successful order creation
    sendResponse(res, 201, order, "Order created successfully");
});

// generate pickup and drop  otp
exports.generateOtp = asyncHandler(async (req, res) => {
    const { otpType } = req.query;

    const savedOrder = await Order.findById(req.params.orderId);
    if (!savedOrder) {
        return sendResponse(res, 400, null, `Invalid Data`);
    }
    if (otpType == 0) {
        if (savedOrder.pickupOtp != undefined) {
            return sendResponse(res, 400, null, `Start Otp Already Generated`);
        }
        savedOrder.pickupOtp = generateOTP();
    }
    if (otpType == 1) {
        if (savedOrder.dropOtp != undefined) {
            return sendResponse(res, 400, null, `Stop Otp Already Generated`);
        }
        savedOrder.dropOtp = generateOTP();
    }
    const generatedOtp = await savedOrder.save();
    sendResponse(res, 200, generatedOtp, "Otp generated successfully");
});

// Complete an order
exports.completeOrder = asyncHandler(async (req, res) => {
    const { orderId, otp } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }

    if (order.dropOtp !== otp) {
        return sendResponse(res, 400, null, "Invalid otp");
    }
    order.deliveryOtpVerifyStatus = true;
    order.status = "Completed";
    await order.save();

    // Calculate and add cashback points to the user's wallet
    const cashbackPoints = await calculateCashbackPoints(order.totalAmount);
    await addPointsToWallet(order.userId, cashbackPoints);

    sendResponse(res, 201, order, "Order completed successfully");
});

//TODO: Need to update this based on pickup and drop agent
exports.assignDeliveryBoyToOrder = asyncHandler(async (req, res) => {
    const { orderId, deliveryBoyId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }

    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    if (!deliveryBoy) {
        return sendResponse(res, 404, null, "Delivery boy not found");
    }

    order.deliveryBoyId = deliveryBoyId;
    await order.save();

    sendResponse(res, 200, order, "Delivery boy assigned successfully");
});

//TODO: need to change order status and  implement the notifications based on order status
exports.changeOrderStatus = asyncHandler(async (req, res) => {
    const { orderId, status } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }

    order.status = status;
    await order.save();

    sendResponse(res, 200, order, "Order status updated successfully");
});

//TODO: Need to update this api get order based on pickup and drop agent id
exports.getAllOrderByDeliveryBoyId = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const { deliveryBoyId } = req.params;
    let dbQuery = { deliveryBoyId };

    if (status) {
        dbQuery.status = status;
    }

    const dataCount = await Order.countDocuments(dbQuery);
    const orders = await Order.find(dbQuery).skip(skip).limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + orders.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (orders.length === 0) {
        return sendResponse(res, 404, null, "Orders not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: orders,
            startItem,
            endItem,
            totalPages,
            pagesize: orders.length,
            totalDoc: dataCount,
        },
        "Orders fetched successfully",
    );
});

exports.getOrderById = asyncHandler(async (req, res) => {
    let order;
    if (req.query.populate) {
        order = await Order.findById(req.params.orderId)
            .populate({
                path: "shopId",
                select: "image name address partnerId",
            })
            .populate({
                path: "items.item",
                select: "name price description categoryId image_url",
            });
    } else {
        order = await Order.findById(req.params.orderId);
    }
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }
    return sendResponse(res, 200, order, "Order fetched successfully");
});

exports.getAllOrders = asyncHandler(async (req, res) => {
    let dbQuery = {};
    const { search, startDate, populate, status } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    //sort by status
    if (status) {
        dbQuery.status = status;
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

    const dataCount = await Order.countDocuments(dbQuery);
    let orders;
    if (populate) {
        orders = await Order.find(dbQuery)
            .populate({
                path: "shopId",
                select: "image name address partnerId",
            })
            .populate({
                path: "items.item",
                select: "name price description categoryId image_url",
            });
    } else {
        orders = await Order.find(dbQuery);
    }
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + orders.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (orders.length === 0) {
        return sendResponse(res, 404, null, "Orders not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: orders,
            startItem,
            endItem,
            totalPages,
            pagesize: orders.length,
            totalDoc: dataCount,
        },
        "Orders fetched successfully",
    );
});

exports.getAllOrdersByUserId = asyncHandler(async (req, res) => {
    let dbQuery = { userId: req.params.userId };
    const { search, startDate, populate, status } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    //sort by status
    if (status) {
        dbQuery.status = status;
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

    const dataCount = await Order.countDocuments(dbQuery);
    const orders = await Order.find(dbQuery).skip(skip).limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + orders.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (orders.length === 0) {
        return sendResponse(res, 404, null, "Orders not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: orders,
            startItem,
            endItem,
            totalPages,
            pagesize: orders.length,
            totalDoc: dataCount,
        },
        "Orders fetched successfully",
    );
});

exports.getOrdersByShopeId = asyncHandler(async (req, res) => {
    let dbQuery = { shopId: req.params.shopId };
    const { search, startDate, populate, status } = req.query;
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const pageNumber = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (pageNumber - 1) * pageSize;

    //sort by status
    if (status) {
        dbQuery.status = status;
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

    const dataCount = await Order.countDocuments(dbQuery);
    const orders = await Order.find(dbQuery).skip(skip).limit(pageSize);
    const startItem = skip + 1;
    const endItem = Math.min(
        startItem + pageSize - 1,
        startItem + orders.length - 1,
    );
    const totalPages = Math.ceil(dataCount / pageSize);
    if (orders.length === 0) {
        return sendResponse(res, 404, null, "Orders not found");
    }
    return sendResponse(
        res,
        200,
        {
            content: orders,
            startItem,
            endItem,
            totalPages,
            pagesize: orders.length,
            totalDoc: dataCount,
        },
        "Orders fetched successfully",
    );
});
