const axios = require("axios");
const path = require("path");
const { execFile } = require("child_process");

const MAX_FILE_SIZE = 200 * 1024 * 1024;

async function fetchAndStreamFile(url, res) {
  const headResponse = await axios.head(url, {
    timeout: 10000,
    maxRedirects: 5,
  });

  const contentType =
    headResponse.headers["content-type"] || "application/octet-stream";

  if (contentType.includes("text/html")) {
    throw new Error("USE_YTDLP");
  }

  const contentLength = headResponse.headers["content-length"];

  if (contentLength && Number(contentLength) > MAX_FILE_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  const fileResponse = await axios.get(url, {
    responseType: "stream",
    timeout: 20000,
    maxRedirects: 5,
  });

  const parsedUrl = new URL(url);
  const filename = path.basename(parsedUrl.pathname) || "download";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  let downloadedBytes = 0;

  fileResponse.data.on("data", (chunk) => {
    downloadedBytes += chunk.length;

    if (downloadedBytes > MAX_FILE_SIZE) {
      fileResponse.data.destroy();
      res.destroy();
    }
  });

  fileResponse.data.on("error", () => {
    res.destroy();
  });

  fileResponse.data.pipe(res);
}

function downloadWithYTDLP(url) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(__dirname, "../downloads/%(title)s.%(ext)s");

    execFile(
      path.join(__dirname, "../yt-dlp.exe"),
      ["-f", "best", "-o", outputPath, url],
      (error, stdout, stderr) => {
        if (error) {
          return reject(stderr || error.message);
        }
        resolve(stdout);
      },
    );
  });
}

module.exports = {
  fetchAndStreamFile,
  downloadWithYTDLP,
};
