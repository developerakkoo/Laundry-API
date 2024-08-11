// const Cart = require("../models/cart.model");
// const cron = require("node-cron");
// const { asyncHandler } = require("../utils/asyncHandler");
// const { sendFirebaseNotification } = require("../utils/firebaseNotifier.utils");

// cron.schedule("* * * * *", async () => {
//     try {
//         console.log(`Firebase Notification Scheduler...`);

//         // Check if the user has items in their cart
//         const userCartData = await Cart.find({
//             "products.0": { $exists: true }, // Ensure the products array is not empty
//         })
//             .select("-createdAt -updatedAt -__v")
//             .populate({ path: "userId", select: "firebaseToken" })
//             .lean();

//         if (userCartData.length === 0) {
//             console.log("Cart not found with products...");
//             return;
//         }
//         const userData = userCartData
//             .map((cart) => cart.userId)
//             .filter(
//                 (user) =>
//                     user !== null &&
//                     user.firebaseToken !== null &&
//                     user.firebaseToken !== undefined,
//             );

//         const userFirebaseToken = userData.map((user) => user.firebaseToken);

//         console.log("tokens", userFirebaseToken);

//         if (userFirebaseToken.length === 0) {
//             console.log("No valid Firebase tokens found...");
//             return;
//         }

//         // Send notifications
//         const data = await sendFirebaseNotification(userFirebaseToken);
//         console.log(data);
//     } catch (error) {
//         console.log(error.message);
//     }
// });
