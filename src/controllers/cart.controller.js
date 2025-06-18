const Cart = require("../models/cart.model");
const serviceModel = require("../models/services.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");

exports.addToCart = asyncHandler(async (req, res) => {
    const { userId, serviceId, quantity, selectedQuantityType } = req.body;

    // Find the user's cart
    let cart = await Cart.findOne({ userId });

    // Find the service being added
    const service = await serviceModel.findById(serviceId);

    // Check if the service exists
    if (!service) {
        return res.status(404).json({ message: "Service not found" });
    }

    // If the cart does not exist, create a new one with the shopId from the service
    if (!cart) {
        cart = new Cart({
            userId,
            shopId: service.shopeId, // Set the shopId from the service
            products: [],
            totalPrice: 0,
            selectedQuantityType,
        });
    } else {
        // If the cart exists but no shopId, set it to the current service's shopId
        if (!cart.shopId) {
            cart.shopId = service.shopeId;
        } else if (cart.shopId.toString() !== service.shopeId.toString()) {
            // If the shopId is different, clear the cart and update the shopId
            cart.products = [];
            cart.totalPrice = 0;
            cart.shopId = service.shopeId;
        }
    }

    // Check if the user's selected quantity type is valid for the service
    if (
        (selectedQuantityType === 0 && service.quantityAcceptedIn === 1) ||
        (selectedQuantityType === 1 && service.quantityAcceptedIn === 0)
    ) {
        return res.status(400).json({
            message: "Selected quantity type is not available for this service",
        });
    }

    // Find the product in the cart, if it already exists
    const productIndex = cart.products.findIndex(
        (product) => product.serviceId.toString() === serviceId,
    );

    // Update quantity if the product already exists in the cart
    if (productIndex > -1) {
        cart.products[productIndex].quantity += 1;
    } else {
        // Add new product to the cart
        cart.products.push({ serviceId, quantity });
    }

    // Update the total price based on the selected quantity type
    if (selectedQuantityType === 0) {
        // per piece
        cart.totalPrice += quantity * service.perPeacePrice;
    } else if (selectedQuantityType === 1) {
        // per kg
        cart.totalPrice += quantity * service.perKgPrice;
    }

    // Save the cart
    await cart.save();

    // Send response back to the client
    sendResponse(res, 200, cart, "Item added to cart");
});

// Remove item from cart
exports.removeFromCart = asyncHandler(async (req, res) => {
    const { userId, serviceId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        return sendResponse(res, 404, null, "Cart not found");
    }

    const productIndex = cart.products.findIndex(
        (product) => product.serviceId.toString() === serviceId,
    );

    if (productIndex > -1) {
        const service = await serviceModel.findById(serviceId);

        if (cart.products[productIndex].quantity >= quantity) {
            // Adjust quantity and price
            cart.products[productIndex].quantity -= quantity;
            if (cart.selectedQuantityType == 0) {
                cart.totalPrice -= quantity * service.perPeacePrice;
            } else if (cart.selectedQuantityType == 1) {
                cart.totalPrice -= quantity * service.perKgPrice;
            }

            if (cart.products[productIndex].quantity === 0) {
                cart.products.splice(productIndex, 1);
            }

            await cart.save();
            return sendResponse(res, 200, cart, "Item removed from cart");
        } else {
            return sendResponse(
                res,
                400,
                null,
                "Insufficient quantity in cart",
            );
        }
    } else {
        return sendResponse(res, 404, null, "Item not found in cart");
    }
});

// Get cart items
exports.getCart = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const cart = await Cart.findOne({ userId })
        .populate({
            path: "products.serviceId",
            select: "name perPeacePrice perKgPrice description categoryId image_url",
        })
        .populate({
            path: "shopId",
            select: "name address",
        });

    if (!cart) {
        return sendResponse(res, 404, null, "Cart not found");
    }

    sendResponse(res, 200, cart, "Cart fetched successfully");
});

// Clear cart
exports.clearCart = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    let cart = await Cart.findOne({ userId });

    if (cart) {
        cart.products = [];
        cart.totalPrice = 0;
        await cart.save();
    }

    sendResponse(res, 200, cart, "Cart cleared");
});
