// Vercel-compatible file upload handler
// For Vercel deployment, file uploads should use cloud storage (S3, Cloudinary, etc.)
// This is a placeholder that shows the intended approach

const multer = require('multer');
const path = require('path');

// For local development - uses disk storage
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// For Vercel deployment - would use memory storage and cloud upload
const vercelStorage = multer.memoryStorage();

// Choose storage based on environment
const storage = process.env.VERCEL ? vercelStorage : localStorage;

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for Vercel
  },
  fileFilter: (req, file, cb) => {
    // Allow common document/image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Vercel deployment helper function
const handleVercelUpload = async (req, res, next) => {
  if (process.env.VERCEL) {
    // In Vercel environment, files are in memory
    // Would integrate with cloud storage service here
    console.log('Vercel environment detected - implement cloud storage integration');
    // Example: upload to S3, Cloudinary, etc.
  }
  next();
};

module.exports = {
  upload,
  handleVercelUpload
};