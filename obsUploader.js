require("dotenv").config();
const chokidar = require("chokidar");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

// 🔥 CONFIGURE CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔥 YOUR OBS FOLDER
const OBS_FOLDER = "C:/Users/calde/Desktop/VERTICAL RECORDING";

// 🔥 TRACK FILES BEING PROCESSED
const processing = new Set();

// 🧠 WAIT UNTIL FILE IS FULLY WRITTEN
function waitForFileReady(filePath, timeout = 60000) {
  return new Promise((resolve, reject) => {
    let lastSize = 0;
    let stableCount = 0;

    const interval = setInterval(() => {
      if (!fs.existsSync(filePath)) return;

      const { size } = fs.statSync(filePath);

      if (size === lastSize) {
        stableCount++;
        if (stableCount >= 3) {
          clearInterval(interval);
          resolve();
        }
      } else {
        lastSize = size;
        stableCount = 0;
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
      reject("File not stable in time");
    }, timeout);
  });
}

// 🚀 UPLOAD FUNCTION
async function uploadToCloudinary(filePath) {
  try {
    console.log("🎬 Uploading:", filePath);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
      folder: "karaoke_videos",
      timeout: 120000,
      format: "mp4", // 🔥 ensures compatibility
    });

    console.log("✅ Uploaded:", result.secure_url);

    // OPTIONAL: delete local file after upload
    // fs.unlinkSync(filePath);

  } catch (err) {
    console.error("❌ Upload failed:", err.message);
  }
}

// 👀 WATCH OBS FOLDER
chokidar.watch(OBS_FOLDER, {
  ignoreInitial: true,
}).on("add", async (filePath) => {

  if (!filePath.match(/\.(mp4|mkv|webm)$/i)) return;
  if (processing.has(filePath)) return;

  processing.add(filePath);

  console.log("📁 New recording detected:", filePath);

  try {
    await waitForFileReady(filePath);
    await uploadToCloudinary(filePath);
  } catch (err) {
    console.log("⚠️ Skipped:", err);
  }

  processing.delete(filePath);
});