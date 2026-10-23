const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for metadata storage
function getMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading metadata.json:', err);
  }
  return {};
}

function saveMetadata(meta) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving metadata.json:', err);
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate unique storage filename with original extension
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  }
});

// Allow any file type, limit max file size to 250MB per file (generous for Render)
const upload = multer({
  storage: storage,
  limits: { fileSize: 250 * 1024 * 1024 }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API: Upload files (supports single or multiple files)
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const metadata = getMetadata();
    const uploadedRecords = [];

    for (const file of req.files) {
      const fileId = path.parse(file.filename).name;
      const record = {
        id: fileId,
        storedName: file.filename,
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'), // handle utf8 filenames correctly
        size: file.size,
        formattedSize: formatBytes(file.size),
        mimetype: file.mimetype || 'application/octet-stream',
        uploadedAt: new Date().toISOString()
      };

      metadata[fileId] = record;
      uploadedRecords.push(record);
    }

    saveMetadata(metadata);

    res.status(200).json({
      message: `${uploadedRecords.length} file(s) uploaded successfully!`,
      files: uploadedRecords
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file upload: ' + error.message });
  }
});

// API: Get all files list
app.get('/api/files', (req, res) => {
  try {
    const metadata = getMetadata();
    const fileList = [];

    // Verify files still exist on disk
    for (const [id, info] of Object.entries(metadata)) {
      const filePath = path.join(UPLOADS_DIR, info.storedName);
      if (fs.existsSync(filePath)) {
        fileList.push(info);
      } else {
        delete metadata[id];
      }
    }
    saveMetadata(metadata);

    // Sort newest first
    fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files: fileList });
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// API: Force Download File with original name
app.get('/api/download/:id', (req, res) => {
  try {
    const metadata = getMetadata();
    const fileInfo = metadata[req.params.id];

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, fileInfo.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File does not exist on disk' });
    }

    // res.download sets Content-Disposition header and preserves original filename
    res.download(filePath, fileInfo.originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// API: View / Preview File inline (for images, audio, video, pdf, text)
app.get('/api/view/:id', (req, res) => {
  try {
    const metadata = getMetadata();
    const fileInfo = metadata[req.params.id];

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, fileInfo.storedName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File does not exist on disk' });
    }

    res.setHeader('Content-Type', fileInfo.mimetype);
    res.sendFile(filePath);
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

// API: Delete File
app.delete('/api/files/:id', (req, res) => {
  try {
    const metadata = getMetadata();
    const fileInfo = metadata[req.params.id];

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(UPLOADS_DIR, fileInfo.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    delete metadata[req.params.id];
    saveMetadata(metadata);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// API: Stats
app.get('/api/stats', (req, res) => {
  try {
    const metadata = getMetadata();
    const files = Object.values(metadata);
    const totalCount = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

    res.json({
      totalCount,
      totalBytes,
      formattedTotal: formatBytes(totalBytes)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Catch-all fallback for SPA / static index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 File Vault Server running on port ${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
});
