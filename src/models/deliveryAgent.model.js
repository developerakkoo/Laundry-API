const { Schema, model } = require("mongoose");
const { hashCount } = require("../constant");
const { compare, hash } = require("bcrypt");

const deliveryAgent = new Schema(
    {
        name: {
            type: String,
            required: true,
            default: "_",
        },
        profile_image: {
            type: String,
        },
        relativePath: {
            type: String,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            default: "_",
        },
        phoneNumber: {
            type: String,
            required: true,
            unique: true,
            default: "_",
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        refreshToken: {
            type: String,
            require: true,
            default: "-",
            select: false,
        },
        message: {
            type: String, ///if admin rejected or block the delivery bot then provide message of rejection or block
        },
        isOnline: {
            type: Boolean,
            required: true,
            default: false,
        },
        status: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2, 3], // pending,blocked, approved, rejected,
        },
    },
    { timestamps: true },
);

/**
 * Pre-save hook that encrypts the password before saving it to the database.
 * @param {import('mongoose').Document} doc - The document being saved.
 * @param {Function} next - A callback function to invoke after saving the document.
 */
deliveryAgent.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await hash(this.password, hashCount);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
deliveryAgent.methods.isPasswordCorrect = async function (password) {
    return await compare(password, this.password);
};

module.exports = model("deliveryAgent", deliveryAgent);
