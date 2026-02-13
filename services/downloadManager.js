const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const downloads = {};
const runningProcesses = {};

const MAX_FILE_SIZE = "200M";
const MAX_CONCURRENT_DOWNLOADS = 3;
const PARTIAL_CLEANUP_MS = 60 * 60 * 1000;
const METADATA_CLEANUP_MS = 24 * 60 * 60 * 1000;
const PROCESS_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT = "5M";
const MIN_FREE_SPACE_BYTES = 1 * 1024 * 1024 * 1024;

const DOWNLOADS_DIR = path.join(__dirname, "../downloads");
const STATE_FILE = path.join(__dirname, "../download_state.json");

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(downloads, null, 2));
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    const data = JSON.parse(fs.readFileSync(STATE_FILE));
    Object.assign(downloads, data);
  }
}

function cleanupOldPartials() {
  if (!fs.existsSync(DOWNLOADS_DIR)) return;

  fs.readdirSync(DOWNLOADS_DIR).forEach((file) => {
    if (file.endsWith(".part")) {
      const filePath = path.join(DOWNLOADS_DIR, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > PARTIAL_CLEANUP_MS) {
        fs.unlinkSync(filePath);
        log(`Deleted old partial: ${file}`);
      }
    }
  });
}

function cleanupOldMetadata() {
  const now = Date.now();
  Object.keys(downloads).forEach((id) => {
    if (downloads[id].finishedAt) {
      if (now - downloads[id].finishedAt > METADATA_CLEANUP_MS) {
        delete downloads[id];
      }
    }
  });
  saveState();
}

function hasEnoughDiskSpace() {
  try {
    const stats = fs.statfsSync(DOWNLOADS_DIR);
    const freeBytes = stats.bavail * stats.bsize;
    return freeBytes > MIN_FREE_SPACE_BYTES;
  } catch {
    return true;
  }
}

setInterval(cleanupOldPartials, 15 * 60 * 1000);
setInterval(cleanupOldMetadata, 60 * 60 * 1000);

loadState();

function startDownload(url, force = false) {
  if (Object.keys(runningProcesses).length >= MAX_CONCURRENT_DOWNLOADS) {
    log("Rejected: concurrency limit reached");
    return null;
  }

  if (!hasEnoughDiskSpace()) {
    log("Rejected: insufficient disk space");
    return null;
  }

  const id = uuidv4();

  downloads[id] = {
    status: "downloading",
    progress: "0%",
    filename: null,
    startedAt: Date.now(),
  };

  saveState();

  const outputTemplate = path.join(DOWNLOADS_DIR, "%(title)s.%(ext)s");

  const formats = [
    "bestvideo+bestaudio",
    "bestvideo[height<=720]+bestaudio",
    "bestvideo[height<=480]+bestaudio",
    "best",
  ];

  let currentIndex = 0;

  const run = () => {
    if (currentIndex >= formats.length) {
      downloads[id].status = "too_large";
      downloads[id].finishedAt = Date.now();
      saveState();
      return;
    }

    const args = [
      "--newline",
      "--no-playlist",
      "--continue",
      "--limit-rate",
      RATE_LIMIT,
      "--max-filesize",
      MAX_FILE_SIZE,
      "-f",
      formats[currentIndex],
      "-o",
      outputTemplate,
    ];

    if (force) {
      args.push("--no-overwrites");
    }

    args.push(url);

    const proc = spawn(path.join(__dirname, "../yt-dlp.exe"), args);
    runningProcesses[id] = proc;

    let sizeExceeded = false;

    const handleOutput = (data) => {
      const text = data.toString();

      if (text.includes("File is larger than max-filesize")) {
        sizeExceeded = true;
      }

      const progressMatch = text.match(/(\d+(\.\d+)?)%/);
      if (progressMatch) {
        downloads[id].progress = progressMatch[1] + "%";
      }

      const fileMatch = text.match(/Destination:\s(.+)/);
      if (fileMatch) {
        downloads[id].filename = path.basename(fileMatch[1].trim());
      }

      if (text.includes("has already been downloaded")) {
        downloads[id].status = "exists";
        downloads[id].progress = "100%";
      }

      saveState();
    };

    proc.stdout.on("data", handleOutput);
    proc.stderr.on("data", handleOutput);

    const timeout = setTimeout(() => {
      if (runningProcesses[id]) {
        runningProcesses[id].kill("SIGKILL");
        downloads[id].status = "failed";
        downloads[id].finishedAt = Date.now();
        delete runningProcesses[id];
        saveState();
        log(`Process timeout: ${id}`);
      }
    }, PROCESS_TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timeout);
      delete runningProcesses[id];

      if (downloads[id].status === "exists") {
        downloads[id].finishedAt = Date.now();
        saveState();
        return;
      }

      if (sizeExceeded) {
        downloads[id].status = "too_large";
        downloads[id].finishedAt = Date.now();
        saveState();
        return;
      }

      if (code === 0) {
        downloads[id].status = "completed";
        downloads[id].progress = "100%";
        downloads[id].finishedAt = Date.now();
        log(`Download completed: ${id}`);
      } else {
        currentIndex++;
        run();
        return;
      }

      saveState();
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      delete runningProcesses[id];
      downloads[id].status = "failed";
      downloads[id].finishedAt = Date.now();
      saveState();
    });
  };

  run();
  return id;
}

function getDownloadStatus(id) {
  return downloads[id] || null;
}

function cancelDownload(id) {
  const proc = runningProcesses[id];
  const record = downloads[id];

  if (!proc || !record) return false;

  proc.kill("SIGINT");

  if (record.filename) {
    const filePath = path.join(DOWNLOADS_DIR, record.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  record.status = "cancelled";
  record.progress = "0%";
  record.finishedAt = Date.now();

  delete runningProcesses[id];
  saveState();
  log(`Download cancelled: ${id}`);

  return true;
}

module.exports = {
  startDownload,
  getDownloadStatus,
  cancelDownload,
};
