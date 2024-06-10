const Cart = require("../models/cart.model");
const serviceModel = require("../models/services.model");
const { asyncHandler, sendResponse } = require("../utils/helper.utils");

// Add item to cart
exports.addToCart = asyncHandler(async (req, res) => {
    const { userId, serviceId, shopId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = new Cart({ userId, products: [], totalPrice: 0 });
    }

    const productIndex = cart.products.findIndex(
        (product) =>
            product.serviceId.toString() === serviceId &&
            product.shopId.toString() === shopId,
    );

    if (productIndex > -1) {
        cart.products[productIndex].quantity += quantity;
    } else {
        cart.products.push({ serviceId, shopId, quantity });
    }

    const service = await serviceModel.findById(serviceId);

    cart.totalPrice += quantity * service.price;
    await cart.save();

    return sendResponse(res, 200, cart, "Item added to cart");
});

// Remove item from cart
exports.removeFromCart = asyncHandler(async (req, res) => {
    const { userId, serviceId, shopId, quantity } = req.body;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        return sendResponse(res, 404, null, "Cart not found");
    }

    const productIndex = cart.products.findIndex(
        (product) =>
            product.serviceId.toString() === serviceId &&
            product.shopId.toString() === shopId,
    );
    const service = await serviceModel.findById(serviceId);

    if (productIndex > -1) {
        if (cart.products[productIndex].quantity >= quantity) {
            cart.products[productIndex].quantity -= quantity;
            cart.totalPrice -= quantity * service.price;

            if (cart.products[productIndex].quantity === 0) {
                cart.products.splice(productIndex, 1);
            }

            await cart.save();
            return sendResponse(res, 200, cart, "Item removed from cart");
        } else {
            return sendResponse(res, 400, null, "Insufficient quantity in cart");
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
            select: "name price description categoryId imagen_url",
        })
        .populate({
            path: "products.shopId",
            select: "name address partnerId",
        });
    if (!cart) {
        return sendResponse(res, 404, "Cart not found");
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
