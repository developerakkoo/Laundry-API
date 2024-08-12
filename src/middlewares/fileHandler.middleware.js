const multer = require("multer");
const path = require("path");

// Multer configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "..", "uploads")); // Specify the directory where uploaded files will be saved
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Rename file with unique timestamp + original extension
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    },
    fileFilter: function (req, file, cb) {
        // Validate file types
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/x-matroska",
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPEG, PNG,JPG for images and mp4, webm, mkv for videos are allowed.",
                ),
            );
        }
    },
});

const multerUpload = upload.single("file");

module.exports = { multerUpload, upload };
