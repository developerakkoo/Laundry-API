const Order = require("../models/order.model"); // Assuming the Order model is in models folder

async function getRecentOrders(userId) {
    try {
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("items.item");
        return orders;
    } catch (error) {
        console.error("Error fetching recent orders:", error);
        throw error;
    }
}

function analyzeOrders(orders) {
    const itemFrequency = {};

    orders.forEach((order) => {
        order.items.forEach((orderItem) => {
            const itemId = orderItem.item._id.toString();
            if (itemFrequency[itemId]) {
                itemFrequency[itemId] += orderItem.quantity;
            } else {
                itemFrequency[itemId] = orderItem.quantity;
            }
        });
    });

    const sortedItems = Object.keys(itemFrequency).sort(
        (a, b) => itemFrequency[b] - itemFrequency[a],
    );
    return sortedItems.slice(0, 5); // Return top 5 items
}

module.exports = {
    getRecentOrders,
    analyzeOrders,
};
