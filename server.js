const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const downloadRoutes = require("./routes/downloadRoutes");

const app = express();

/* Global limiter */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/* Strict limiter for starting downloads */
app.use(
  "/api/download",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
  }),
);

/* Higher limit for status polling */
app.use(
  "/api/status",
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api", downloadRoutes);

app.get("/", (req, res) => {
  res.send("URL Downloader API is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
