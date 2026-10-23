# 🚀 DropVault — Any-File Upload & Download Web App

A clean, modern, and high-performance file sharing website built with pure **HTML, CSS, and JavaScript** with a lightweight Node.js/Express backend. Ready for **1-click deployment on Render**.

---

## ✨ Features

- 📁 **Upload Any File Type**: Supports images, videos, music, PDFs, ZIP/RAR archives, code, executables, documents, and more (up to 250MB per file).
- ⚡ **Instant 1-Click Download**: Direct download action preserving original file names with proper content headers.
- 🎯 **Drag & Drop Interface**: Smooth drag-and-drop zone with animated progress bar and real-time upload percentage.
- 📱 **Mobile QR Code**: Generates an instant QR code for any uploaded file so you can scan and download directly to your smartphone.
- 🔗 **Copy Direct Link**: 1-click copy direct download URL to your clipboard for easy sharing.
- 👁️ **Instant Previews**: Built-in modal viewer for images, videos, audio players, PDFs, and syntax code/text files.
- 🔍 **Real-Time Search & Category Filters**: Search by file name and filter by Images, Documents, Videos, Audio, Archives, and Other.
- 📊 **Live Stats**: Shows total uploaded files and storage usage.
- 🎨 **Modern Cyber Glassmorphic Design**: Deep dark mode, glowing accents, and smooth micro-animations.

---

## 💻 Running Locally

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) installed.

### Steps
1. Open your terminal in this project folder:
   ```bash
   cd uplodet
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and visit:
   ```
   http://localhost:3000
   ```

---

## 🌐 How to Deploy to Render (Free)

Deploying this app to **[Render.com](https://render.com)** takes less than 3 minutes.

### Method 1: Automatic Blueprint (Recommended)
This repository includes a `render.yaml` configuration file for automatic setup:

1. Push this project to your **GitHub** or **GitLab** account.
2. Log into [Render.com](https://render.com).
3. Click **New +** in the top right and select **Blueprint**.
4. Connect your repository.
5. Render will detect `render.yaml` and configure the **Web Service** automatically.
6. Click **Apply** to deploy!

---

### Method 2: Manual Web Service Setup
1. Push this project folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of DropVault"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** > **Web Service**.
4. Select your GitHub repository.
5. Fill in the deployment settings:
   - **Name**: `dropvault` (or any name you like)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Region**: Choose closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Click **Deploy Web Service** at the bottom.
7. Once build finishes, Render will provide your public URL (e.g., `https://dropvault.onrender.com`).

---

## 📂 Project Structure

```
├── public/
│   ├── index.html       # HTML5 structure (Dropzone, file list, modals)
│   ├── style.css        # CSS3 modern glassmorphism styling
│   └── script.js        # JavaScript (Upload progress, download, preview, QR)
├── uploads/             # Directory where uploaded files are stored
│   └── .gitkeep
├── server.js            # Express server (Upload, Download, Stream, Delete APIs)
├── package.json         # Project metadata and dependencies
├── render.yaml          # Render Blueprint deployment config
├── .gitignore           # Git ignore rules
└── README.md            # Documentation and instructions
```

---

## 🔒 License
MIT License - feel free to use and customize!
