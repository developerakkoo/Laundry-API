const mongoose = require('mongoose');
const {DB_NAME} = require('../constant');
const {apiError} = require('../utils/helper.utils');

const connectDB = async () =>{
    try {
        const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB connected !! DB HOST:${connectionInstance.connection.host}`);
    } catch (error) {
        throw new apiError(500,`MongoDB connection failed ${error.message}`);
    }
}

module.exports = {
    connectDB
}