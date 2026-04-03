const multer = require("multer");
const path = require("path");
const fs  = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive: true});
}
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E7);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // ✅ 2 parameter
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|webp/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype); // ✅ mimetype (lowercase)
    if (extName && mimeType) {
        cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (jpeg, jpg, png, webp) yang diperbolehkan!'));
    }
};

const upload = multer({
    storage: storage,
    limits: {fileSize: 10 * 1024 * 1024},
    fileFilter: fileFilter,
});

module.exports = upload;
