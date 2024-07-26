const cron = require("node-cron");
const moment = require("moment");
const userSubscription = require("../models/subscription.model");
const { asyncHandler } = require("../utils/helper.utils");

cron.schedule(
    "1 0 * * *",
    asyncHandler(async () => {
        console.log("Subscription scheduler...");
        // Get subscriptions that expired today
        const date = moment().subtract(1, "d").format("DD-MM-YYYY");
        const expiredSubscriptions = await userSubscription.find({
            expiryDate: date,
            status: true,
        });

        // Extract subscription IDs associated with expired subscriptions
        const expiredSubscriptionIds = expiredSubscriptions.map(
            (sub) => sub._id,
        );
        // No expired subscriptions found, exit the function
        if (expiredSubscriptionIds.length === 0) {
            return;
        }
        // Update status of expired subscriptions to inactive
        await userSubscription.updateMany(
            { _id: { $in: expiredSubscriptionIds } },
            { $set: { status: false } },
        );
        console.log("Subscription scheduler completed...");
    }),
);
