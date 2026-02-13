const express = require("express");
const {
  downloadController,
  downloadStatusController,
  cancelDownloadController,
} = require("../controllers/downloadController");

const router = express.Router();

router.get("/download", (req, res) => {
  res.send("Use POST request to start download.");
});

router.post("/download", downloadController);
router.get("/status/:id", downloadStatusController);
router.post("/cancel/:id", cancelDownloadController);

module.exports = router;
