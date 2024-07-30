require("dotenv").config();
const Order = require("../models/order.model");
const shopModel = require("../models/shope.model");
const Wallet = require("../models/wallet.model");
const DeliveryBoy = require("../models/deliveryAgent.model");
const Cart = require("../models/cart.model");
const dataModel = require("../models/data.model");
const Service = require("../models/services.model");
const PromoCode = require("../models/promoCode.model");
const razorpay = require("razorpay");
const key = process.env.RAZORPAY_ID;
const secret = process.env.RAZORPAY_SECRET;

var instance = new razorpay({
    key_id: key,
    key_secret: secret,
});
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

    const { gstPercentage, deliveryCharges, platformFee } = data[0];
    const { userId, code, useWalletPoints, useExpressDelivery, selfService } =
        req.body;

    // Find the user's cart
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.products.length === 0) {
        return sendResponse(res, 400, null, "Cart is empty");
    }
    let expressDeliveryCharges = 0;
    if (useExpressDelivery) {
        const savedShop = await shopModel.findById(cart.shopId);
        if (savedShop.isAcceptExpressService) {
            expressDeliveryCharges = savedShop.expressServiceCharges;
        } else {
            return sendResponse(
                res,
                400,
                null,
                "This Shop Not Accept Express Service",
            );
        }
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

    // Determine delivery charges based on express delivery selection and self service
    let finalDeliveryCharges = 0;
    if (selfService) {
        if (useExpressDelivery) {
            finalDeliveryCharges = expressDeliveryCharges;
        }
    } else {
        finalDeliveryCharges = useExpressDelivery
            ? deliveryCharges + expressDeliveryCharges
            : deliveryCharges;
    }

    // Calculate the initial total amount to pay
    let totalAmountToPay =
        subtotal + gstAmount + finalDeliveryCharges + platformFee;

    let discount = 0;
    let promoCodeId = null;
    let promoCodeDetails = null;
    let promoCodeData;
    let deliveryBoyCompensation = selfService ? 0 : deliveryCharges;

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
                discount = deliveryCharges;
                promoCodeDetails = `FREE_DELIVERY`;
                totalAmountToPay -= deliveryCharges;
                break;
            case 2: // GET_OFF
                discount = promoCode.discountAmount;
                promoCodeDetails = `GET_OFF`;
                totalAmountToPay -= promoCode.discountAmount;
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
                promoCodeDetails = `NEW_USER`;
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
        deliveryCharges: selfService ? 0 : finalDeliveryCharges,
        platformFee,
        expressDeliveryCharges: useExpressDelivery ? expressDeliveryCharges : 0,
        discount,
        walletPointsUsed,
        promoCodeId,
        totalAmountToPay,
        promoCodeDetails: promoCodeData,
        deliveryBoyCompensation,
    };

    // Return the calculated amounts and breakdown
    return sendResponse(res, 200, breakdown, "Amount calculated successfully");
});

// Initiate payment request
exports.initiatePayment = asyncHandler(async (req, res) => {
    const { amount } = req.body;

    const options = {
        amount: amount * 100, // Razorpay expects the amount in paise
        currency: "INR",
    };

    const order = await instance.orders.create(options);
    sendResponse(res, 200, order, "Order Created.");
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
        orderType,
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
        orderType,
    });
    // Deduct the used points from the wallet
    useWalletPoints(userId, priceDetails.walletPointsUsed);

    // send notification to shop owner
    const shop = await shopModel.findById(cart.shopId);
    //check order type is express or not based on that send notification
    if (orderType === 1) {
        sendNotification(shop.ownerId, "New Express Order", order);
    } else {
        sendNotification(shop.partnerId, "New Order", order);
    }

    // Clear the cart after placing the order
    await Cart.deleteOne({ userId });

    // Send response indicating successful order creation
    sendResponse(res, 201, order, "Order created successfully");
});

// generate pickup and drop  otp
exports.generateOtp = asyncHandler(async (req, res) => {
    const { otpType, orderId } = req.body;
    const savedOrder = await Order.findById(orderId);
    if (!savedOrder) {
        return sendResponse(res, 400, null, `Invalid Data`);
    }
    if (otpType == 0) {
        if (savedOrder.pickupOtp != undefined) {
            return sendResponse(res, 400, null, `Pickup Otp Already Generated`);
        }
        savedOrder.pickupOtp = generateOTP();
    }
    if (otpType == 1) {
        if (savedOrder.dropOtp != undefined) {
            return sendResponse(
                res,
                400,
                null,
                `Delivery Otp Already Generated`,
            );
        }
        savedOrder.dropOtp = generateOTP();
    }
    const generatedOtp = await savedOrder.save();
    sendResponse(res, 200, generatedOtp, "Otp generated successfully");
});

// Verify otp and update order status
exports.verifyOtpAndUpdateOrderStatus = asyncHandler(async (req, res) => {
    const { otpType, otp, orderId } = req.body;
    const savedOrder = await Order.findById(orderId);
    if (!savedOrder) {
        return sendResponse(res, 400, null, `Invalid Data`);
    }
    if (otpType == 0) {
        if (savedOrder.pickupOtp !== otp) {
            return sendResponse(res, 400, null, `Invalid Otp`);
        }
        savedOrder.pickupOtpVerifyStatus = true;
        savedOrder.status = 3;
        savedOrder.orderTimeline.push({
            title: "Order Picked Up",
            status: "ORDER_PICKED_UP",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        sendNotification(
            savedOrder.userId,
            "Your Order is picked up confirmation",
            savedOrder,
        );
    }
    if (otpType == 1) {
        if (savedOrder.dropOtp != otp) {
            return sendResponse(res, 400, null, `Stop Otp Already Generated`);
        }
        savedOrder.status == 7;
        savedOrder.orderTimeline.push({
            title: "Order Delivered",
            status: "ORDER_DELIVERED",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        sendNotification(
            savedOrder.userId,
            "Your Order Delivered ",
            savedOrder,
        );
        savedOrder.deliveryOtpVerifyStatus = true;
    }
    const updatedOrder = await savedOrder.save();
    sendResponse(res, 200, updatedOrder, "Order status updated successfully");
});

//Assign order delivery agent
exports.assignDeliveryBoyToOrder = asyncHandler(async (req, res) => {
    const { orderId, orderPickupAgentId, orderDeliveryAgentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }
    if (orderPickupAgentId) {
        const deliveryBoy = await DeliveryBoy.findById(orderPickupAgentId);
        if (!deliveryBoy) {
            return sendResponse(res, 404, null, "Delivery boy not found");
        }
        // Check for pickup agent already assigned or not
        if (
            order.orderPickupAgentId !== null &&
            order.orderPickupAgentId !== undefined
        ) {
            return sendResponse(
                res,
                400,
                null,
                "Order pickup agent already assigned",
            );
        }
        order.orderPickupAgentId = orderPickupAgentId;
        order.orderTimeline.push({
            title: "Assigned Pickup Agent",
            status: "ASSIGNED_PICKUP_AGENT",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        //send notification to pickup agent
        sendNotification(
            orderDeliveryAgentId,
            "Order Assign To You For Pickup",
            order,
        );
        order.status = 2;
    }
    if (orderDeliveryAgentId) {
        const deliveryBoy = await DeliveryBoy.findById(orderDeliveryAgentId);
        if (!deliveryBoy) {
            return sendResponse(res, 404, null, "Delivery boy not found");
        }
        // Check for delivery agent already assigned or not
        if (
            order.orderDeliveryAgentId !== null &&
            order.orderDeliveryAgentId !== undefined
        ) {
            return sendResponse(
                res,
                400,
                null,
                "Order delivery agent already assigned",
            );
        }
        order.orderDeliveryAgentId = orderDeliveryAgentId;
        order.orderTimeline.push({
            title: "Assigned Delivery Agent",
            status: "ASSIGNED_DELIVERY_AGENT",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        order.status = 6;
        //send notification to delivery agent
        sendNotification(
            orderDeliveryAgentId,
            "Order Assign To You For Delivery",
            order,
        );
    }
    await order.save();

    sendResponse(res, 200, order, "Delivery boy assigned successfully");
});

// update order status
exports.changeOrderStatus = asyncHandler(async (req, res) => {
    const { orderId, status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
        return sendResponse(res, 404, null, "Order not found");
    }
    if (status == 2) {
        order.orderTimeline.push({
            title: "Order Confirmed",
            status: "ORDER_CONFIRMED",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        sendNotification(order.userId, "Your Order is confirmed", order);
    }
    if (status == 4) {
        order.orderTimeline.push({
            title: "Order On The Way",
            status: "ORDER_ON_THE_WAY",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        sendNotification(order.userId, "Your Order is in process", order);
    }
    if (status == 5) {
        order.orderTimeline.push({
            title: "Order Ready to deliver",
            status: "ORDER_READY_TO_DELIVERED",
            dateTime: moment().format("MMMM Do YYYY, h:mm:ss a"),
        });
        sendNotification(order.userId, "Your Order ready to deliver", order);
    }
    order.status = status;
    await order.save();
    sendResponse(res, 200, order, "Order status updated successfully");
});

//Get all orders by delivery boy Id
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
    const orders = await Order.find({
        $or: [
            { orderPickupAgentId: deliveryBoyId },
            { orderDeliveryAgentId: deliveryBoyId },
        ],
    })
        .skip(skip)
        .limit(pageSize);
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
