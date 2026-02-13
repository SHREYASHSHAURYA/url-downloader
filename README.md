# URL Downloader

A secure, rate-limited URL downloader built with Node.js and yt-dlp.  
Supports direct file streaming and intelligent fallback to yt-dlp for media downloads.

---

## Features

- Direct file streaming (under 200MB)
- Automatic yt-dlp fallback for media content
- Resume partial downloads
- Automatic cleanup of old partial files
- Concurrency limit (max 3 downloads)
- Download rate limiting (5MB/s)
- Disk space safety check
- Process timeout protection (2 hours)
- Cancel active downloads
- Persistent state storage
- Structured logging
- Copy creation if file already exists (no overwrite)

---

## Tech Stack

- Node.js
- Express
- yt-dlp
- Axios
- Helmet
- express-rate-limit

---

## Project Structure

```
url-downloader/
│
├── controllers/
│   └── downloadController.js
│
├── services/
│   ├── downloadManager.js
│   └── downloadService.js
│
├── routes/
│   └── downloadRoutes.js
│
├── utils/
│   └── security.js
│
├── public/
│   └── index.html
│
├── downloads/
├── download_state.json
│
├── server.js
├── .env
├── .gitignore
└── README.md
```

---

## Installation

1. Install dependencies

```
npm install
```

2. Place `yt-dlp.exe` in the root directory

3. Start the server

```
node server.js
```

Server runs on:

```
http://localhost:5000
```

---

## API Endpoints

### Start Download

```
POST /api/download
```

Body:

```
{
  "url": "https://example.com/video",
  "force": false
}
```

---

### Get Status

```
GET /api/status/:id
```

---

### Cancel Download

```
POST /api/cancel/:id
```

---

## Download Behavior

### If file already exists

- Existing file is NOT deleted
- A copy is created automatically
- Example:
  - video.mp4
  - video (1).mp4

---

### If partial file exists

- Download resumes automatically
- If partial is older than 1 hour → auto deleted

---

### Cancel Behavior

- Active process is terminated
- Partial file is deleted
- Status becomes `cancelled`

---

## Limits & Protections

| Feature                  | Value    |
| ------------------------ | -------- |
| Max file size            | 200MB    |
| Max concurrent downloads | 3        |
| Download rate limit      | 5MB/s    |
| Process timeout          | 2 hours  |
| Partial cleanup          | 1 hour   |
| Metadata cleanup         | 24 hours |

---

## Security

- URL validation
- Private network blocking
- Content-type filtering
- Rate limiting per endpoint
- Disk space verification
- No automatic overwrite

---

## Git Ignore

```
node_modules/
.env
.env.local
logs/
*.log
downloads/
download_state.json
```

---

## Notes

- yt-dlp must be available in project root
- Designed for controlled self-hosted environments
- Not intended for large-scale public hosting without further scaling work
