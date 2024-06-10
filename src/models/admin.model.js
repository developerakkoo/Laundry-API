const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { hashCount } = require("../constant");
const { compare, hash } = require("bcrypt");

const adminSchema = new Schema(
    {
        adminType: {
            type: Number,
            required: true,
            enum: [0, 1, 2, 3] /* 0 = supperAdmin, 1 = subAdmin, 3 = admin*/,
        },
        adminAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        categoryAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        userAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        deliveryAgentAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        partnerAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        shopeAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        servicesAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        orderAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        messageAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        cashbackOfferAccess: {
            type: Number,
            required: true,
            enum: [
                0, 1, 2,
            ] /* 0 = all access; 1 = read/write access; 2 = only read access*/,
            default: 0,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        refreshToken: {
            type: String,
            default: null,
            select: false,
        },
    },
    { timestamps: true },
);

/**
 * Runs before the user document is saved to the database.
 * If the password field is modified, it hashes the password using bcrypt.
 * @param {import("mongoose").HookNextFunction} next - A callback function to continue the save process.
 */
adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await hash(this.password, hashCount);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
adminSchema.methods.isPasswordCorrect = async function (password) {
    return await compare(password, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
