const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deliveryAgentDocumentSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "deliveryAgent",
            required: true,
        },
        documentType: {
            type: Number,
            required: true,
            enum: [11, 22, 33], //"ADHAR","PAN","LC"
        },
        // documentNumber: {
        //     type: String,
        //     required: true,
        // },
        document_url: {
            type: String,
            required: true,
        },
        relativePath: {
            type: String,
            required: true,
        },
        message: {
            type: String, ///if admin rejected the delivery bot then provide message of rejection
        },
        documentStatus: {
            type: Number,
            required: true,
            default: 0,
            enum: [0, 1, 2], // pending, approved, rejected
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("deliveryAgentDocument", deliveryAgentDocumentSchema);
