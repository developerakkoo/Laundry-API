const categoryModel = require("../models/category.model");
const {
    asyncHandler,
    sendResponse,
    deleteFile,
} = require("../utils/helper.utils");

exports.addCategory = asyncHandler(async (req, res, next) => {
    const { name } = req.body;
    const isExistCategory = await categoryModel.findOne({ name });
    if (isExistCategory) {
        return sendResponse(res, 400, null, "Category already exist");
    }
    const category = await categoryModel.create({ name });
    req.body.categoryId = category._id;
    next();
});

exports.getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
        return sendResponse(res, 404, null, "Category not found");
    }
    return sendResponse(res, 200, category, "Category fetched successfully");
});

exports.getAllCategory = asyncHandler(async (req, res) => {
    const category = await categoryModel.find();
    if (category.length === 0) {
        return sendResponse(res, 404, null, "Category not found");
    }
    return sendResponse(res, 200, category, "Category fetched successfully");
});

exports.updateCategory = asyncHandler(async (req, res) => {
    if (
        req.user.adminType !== 0 ||
        (req.user.categoryAccess !== 0 && req.user.categoryAccess !== 1)
    ) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action",
        );
    }
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
        return sendResponse(res, 404, null, "Category not found");
    }
    const updatedCategory = await categoryModel.findByIdAndUpdate(
        req.params.id,
        { $set: { name: req.body.name } },
        { new: true },
    );
    sendResponse(res, 200, updatedCategory, "Category updated successfully");
});

exports.uploadCategoryImage = asyncHandler(async (req, res) => {
    const { categoryId } = req.body;
    const isExistCategory = await categoryModel.findById(categoryId);
    if (!isExistCategory) {
        return sendResponse(res, 404, null, "Category not found");
    }
    const { filename } = req.file;
    const relativePath = `uploads/${filename}`;
    let image_url = `${req.protocol}://${req.hostname}/uploads/${filename}`;
    if (process.env.NODE_ENV !== "PROD") {
        image_url = `${req.protocol}://${req.hostname}:3000/uploads/${filename}`;
    }
    if (isExistCategory.relativePath) deleteFile(isExistCategory?.relativePath);

    const category = await categoryModel.findByIdAndUpdate(
        categoryId,
        {
            $set: {
                image_url: image_url,
                relativePath: relativePath,
            },
        },
        {
            new: true,
        },
    );
    return sendResponse(
        res,
        200,
        category,
        "Category image updated successfully",
    );
});

exports.deleteCategory = asyncHandler(async (req, res) => {
    if (req.user.adminType != 0 || req.user.categoryAccess != 0) {
        return sendResponse(
            res,
            403,
            null,
            "You don't have permission to perform this action",
        );
    }
    const category = await categoryModel.findById(req.params.id);
    if (!category) {
        return sendResponse(res, 404, null, "Category not found");
    }
    deleteFile(category?.relativePath);
    await categoryModel.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, {}, "Category deleted successfully");
});
