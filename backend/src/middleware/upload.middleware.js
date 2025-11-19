import multer from "multer";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
});

export const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = `avatar-${uuidv4()}-${Date.now()}.webp`;
    const outputPath = path.join("uploads", "avatars", filename);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toFile(outputPath);

    req.processedImage = {
      filename,
      path: outputPath,
      url: `/uploads/avatars/${filename}`,
    };

    next();
  } catch (error) {
    next(error);
  }
};
