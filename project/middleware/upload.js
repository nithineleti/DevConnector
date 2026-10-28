const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const filename = `project-${req.params.id}${path.extname(file.originalname)}`;
        cb(null, filename);
    }
});

const upload = multer({ storage });

module.exports = upload;