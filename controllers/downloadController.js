const validator = require("validator");
const { isSafeHost } = require("../utils/security");
const { fetchAndStreamFile } = require("../services/downloadService");
const {
  startDownload,
  getDownloadStatus,
  cancelDownload,
} = require("../services/downloadManager");

async function downloadController(req, res) {
  const { url, force } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (
    !validator.isURL(url, {
      protocols: ["http", "https"],
      require_protocol: true,
    })
  ) {
    return res.status(400).json({
      error: "Invalid URL. Only http and https URLs are allowed.",
    });
  }

  const safe = await isSafeHost(url);

  if (!safe) {
    return res.status(400).json({
      error: "Access to internal or private networks is not allowed.",
    });
  }

  try {
    await fetchAndStreamFile(url, res);
  } catch (error) {
    if (error.message === "FILE_TOO_LARGE") {
      return res.status(400).json({
        error: "File exceeds 200MB limit",
      });
    }

    const downloadId = startDownload(url, force === true);

    if (!downloadId) {
      return res.status(503).json({
        error: "Download rejected. Server busy or unavailable.",
      });
    }

    return res.json({
      message: "Download started",
      downloadId,
    });
  }
}

function downloadStatusController(req, res) {
  const { id } = req.params;
  const status = getDownloadStatus(id);

  if (!status) {
    return res.status(404).json({ error: "Invalid download ID" });
  }

  return res.json(status);
}

function cancelDownloadController(req, res) {
  const { id } = req.params;

  const success = cancelDownload(id);

  if (!success) {
    return res.status(404).json({ error: "Cannot cancel download" });
  }

  return res.json({ message: "Download cancelled" });
}

module.exports = {
  downloadController,
  downloadStatusController,
  cancelDownloadController,
};
