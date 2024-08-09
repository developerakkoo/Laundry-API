const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { hashCount } = require("../constant");
const { hash, compare } = require("bcrypt");

const partnerSchema = new Schema(
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
            default: "_",
        },
        phoneNumber: {
            type: String,
            required: true,
            default: "_",
        },
        password: {
            type: String,
            select: false,
        },
        status: {
            type: Number,
            required: true,
            default: 0, // default
            enum: [0, 1], //  1= block
        },
        refreshToken: {
            type: String,
            require: true,
            default: "-",
            select: false,
        },
    },
    { timestamps: true },
);

/**
 * Pre-save hook that encrypts the password before saving it to the database.
 * @param {import('mongoose').Document} doc - The document being saved.
 * @param {Function} next - A callback function to invoke after saving the document.
 */
partnerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await hash(this.password, hashCount);
});

/**
 * Compares the given plaintext password with the hashed password stored in the database.
 * @param {string} password - The plaintext password to compare with the hashed password.
 * @returns {boolean} `true` if the passwords match, `false` otherwise.
 */
partnerSchema.methods.isPasswordCorrect = async function (password) {
    return await compare(password, this.password);
};

module.exports = mongoose.model("partner", partnerSchema);
