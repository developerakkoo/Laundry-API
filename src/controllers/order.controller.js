const Order = require("../models/order.model");
const Wallet = require("../models/wallet.model");
const DeliveryBoy = require("../models/deliveryAgent.model");
const Cart = require("../models/cart.model");
const MasterOrder = require("../models/masterOrder.model");
const {
    asyncHandler,
    sendResponse,
    generateOTP,
} = require("../utils/helper.utils");
const {
    useWalletPoints,
    addPointsToWallet,
    calculateCashbackPoints,
} = require("../utils/wallet.utils");
const moment = require("moment");

// Create an order
exports.createOrder = asyncHandler(async (req, res) => {
    const { userId, useWallet } = req.body;

    // Find the cart for the user and populate service and shop details
    const cart = await Cart.findOne({ userId })
        .populate("products.serviceId")
        .populate("products.shopId");

    if (!cart) {
        return sendResponse(res, 404, null, "Cart not found");
    }

    let finalAmount = cart.totalPrice;

    // If using wallet points, deduct points from wallet and reduce final amount
    if (useWallet) {
        const wallet = await Wallet.findOne({ userId });
        if (wallet && wallet.points > 0) {
            const pointsToUse = Math.min(wallet.points, finalAmount);
            finalAmount -= pointsToUse;
            await useWalletPoints(userId, pointsToUse);
        }
    }

    // Calculate cashback points based on final amount
    const cashbackPoints = await calculateCashbackPoints(finalAmount);

    // Group products by shop
    const shopOrders = {};
    cart.products.forEach((product) => {
        if (!shopOrders[product.shopId]) {
            shopOrders[product.shopId] = {
                shopId: product.shopId,
                items: [],
                userId,
                totalAmount: 0,
            };
        }
        shopOrders[product.shopId].items.push({
            item: product.serviceId._id,
            quantity: product.quantity,
        });
        shopOrders[product.shopId].totalAmount +=
            product.quantity * product.serviceId.price;
    });

    // Create orders for each shop
    const orderPromises = Object.keys(shopOrders).map(async (shopId) => {
        const orderData = shopOrders[shopId];
        // Calculate the proportion of total cashback points for this shop's order
        const proportion = orderData.totalAmount / cart.totalPrice;
        const orderCashbackPoints = Math.floor(cashbackPoints * proportion);
        orderData.cashbackPoints = orderCashbackPoints;
        orderData.totalAmount = orderData.totalAmount; // keep the same totalAmount

        const order = new Order(orderData);
        await order.save();
        return order._id;
    });

    // Wait for all orders to be created and get their IDs
    const orderIds = await Promise.all(orderPromises);

    // Create a master order containing all shop orders
    const masterOrder = new MasterOrder({
        userId,
        orders: orderIds,
        totalAmount: finalAmount,
    });
    await masterOrder.save();

    // Clear the cart after placing the order
    await Cart.deleteOne({ userId });

    // Send response indicating successful order creation
    sendResponse(res, 201, masterOrder, "Order created successfully");
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
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }

    order.status = "Completed";
    await order.save();

    // Calculate and add cashback points to the user's wallet
    const cashbackPoints = await calculateCashbackPoints(order.totalAmount);
    await addPointsToWallet(order.userId, cashbackPoints);

    sendResponse(res, 201, order, "Order completed successfully");
});

// Assign delivery boy to order
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

// Change order status
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
