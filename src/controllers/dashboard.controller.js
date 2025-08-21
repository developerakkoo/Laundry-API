const Order = require("../models/order.model");
const mongoose = require("mongoose");

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // Total Revenue
        const totalRevenue = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } }, // Only completed orders
            { $group: { _id: null, total: { $sum: "$priceDetails.totalAmountToPay" } } }
        ]);

        // Net Profit (assuming profit is 20% of total amount - adjust as per your business logic)
        const netProfit = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } },
            { $group: { _id: null, total: { $sum: { $multiply: ["$priceDetails.totalAmountToPay", 0.2] } } } }
        ]);

        // Total Orders
        const totalOrders = await Order.countDocuments(dateFilter);

        // Cancelled Orders
        const cancelledOrders = await Order.countDocuments({ ...dateFilter, status: 8 });

        // Orders by Status
        const ordersByStatus = await Order.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        // Monthly Revenue for Chart
        const monthlyRevenue = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    revenue: { $sum: "$priceDetails.totalAmountToPay" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 }
        ]);

        // Recent Orders
        const recentOrders = await Order.find(dateFilter)
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('userId', 'name email')
            .populate('shopId', 'name')
            .select('orderId status createdAt priceDetails.totalAmountToPay pickupAddress dropoffAddress');

        // Current Deliveries (orders in progress)
        const currentDeliveries = await Order.find({
            ...dateFilter,
            status: { $in: [2, 3, 4, 5, 6] } // Orders being processed
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name')
        .populate('orderPickupAgentId', 'name')
        .populate('orderDeliveryAgentId', 'name')
        .select('orderId status createdAt pickupTime dropoffTime pickupAddress dropoffAddress');

        // Top Performing Shops
        const topShops = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } },
            {
                $group: {
                    _id: "$shopId",
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$priceDetails.totalAmountToPay" }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 }
        ]);

        // Average Order Value
        const avgOrderValue = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } },
            { $group: { _id: null, avg: { $avg: "$priceDetails.totalAmountToPay" } } }
        ]);

        // Express vs Regular Orders
        const orderTypeStats = await Order.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$orderType", count: { $sum: 1 } } }
        ]);

        // Format monthly revenue data
        const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            revenue: item.revenue
        }));

        // Format orders by status for chart
        const statusLabels = ['Pending', 'Confirmed', 'Agent Assigned', 'Picked Up', 'In Process', 'Ready for Drop', 'Drop Agent Assigned', 'Completed', 'Cancelled'];
        const formattedStatusData = statusLabels.map((label, index) => {
            const statusData = ordersByStatus.find(item => item._id === index);
            return {
                status: label,
                count: statusData ? statusData.count : 0
            };
        });

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalRevenue: totalRevenue[0]?.total || 0,
                    netProfit: netProfit[0]?.total || 0,
                    totalOrders: totalOrders,
                    cancelledOrders: cancelledOrders,
                    avgOrderValue: avgOrderValue[0]?.avg || 0
                },
                charts: {
                    monthlyRevenue: formattedMonthlyRevenue,
                    orderStatus: formattedStatusData,
                    orderType: orderTypeStats
                },
                recentOrders: recentOrders.map(order => ({
                    id: order.orderId,
                    status: statusLabels[order.status] || 'Unknown',
                    time: order.createdAt,
                    location: order.pickupAddress ? 'Pickup: ' + order.pickupAddress : 'N/A',
                    amount: order.priceDetails.totalAmountToPay,
                    customer: order.userId?.name || 'N/A',
                    shop: order.shopId?.name || 'N/A'
                })),
                currentDeliveries: currentDeliveries.map(delivery => ({
                    id: delivery.orderId,
                    status: statusLabels[delivery.status] || 'Unknown',
                    time: delivery.createdAt,
                    location: delivery.pickupAddress ? 'Pickup: ' + delivery.pickupAddress : 'N/A',
                    pickupAgent: delivery.orderPickupAgentId?.name || 'N/A',
                    deliveryAgent: delivery.orderDeliveryAgentId?.name || 'N/A'
                })),
                topShops: topShops
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics',
            error: error.message
        });
    }
};

// Get orders with pagination and filters
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, startDate, endDate, shopId } = req.query;
        
        let filter = {};
        
        if (status !== undefined) filter.status = parseInt(status);
        if (shopId) filter.shopId = shopId;
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const orders = await Order.find(filter)
            .populate('userId', 'name email')
            .populate('shopId', 'name')
            .populate('pickupAddress')
            .populate('dropoffAddress')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get order by ID
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findOne({ orderId })
            .populate('userId', 'name email phone')
            .populate('shopId', 'name address')
            .populate('pickupAddress')
            .populate('dropoffAddress')
            .populate('orderPickupAgentId', 'name phone')
            .populate('orderDeliveryAgentId', 'name phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, timelineUpdate } = req.body;

        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Add timeline update if provided
        if (timelineUpdate) {
            order.orderTimeline.push({
                title: timelineUpdate.title,
                dateTime: new Date().toISOString(),
                status: timelineUpdate.status
            });
        }

        order.status = status;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order',
            error: error.message
        });
    }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'month' } = req.query;
        
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        let groupStage = {};
        if (groupBy === 'month') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                }
            };
        } else if (groupBy === 'week') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    week: { $week: "$createdAt" }
                }
            };
        } else if (groupBy === 'day') {
            groupStage = {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                }
            };
        }

        const revenueData = await Order.aggregate([
            { $match: { ...dateFilter, status: { $in: [7] } } },
            {
                $group: {
                    ...groupStage,
                    revenue: { $sum: "$priceDetails.totalAmountToPay" },
                    orderCount: { $sum: 1 },
                    avgOrderValue: { $avg: "$priceDetails.totalAmountToPay" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: revenueData
        });

    } catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching revenue analytics',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getOrders,
    getOrderById,
    updateOrderStatus,
    getRevenueAnalytics
};