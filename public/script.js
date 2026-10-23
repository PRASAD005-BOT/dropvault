// DropVault - Modern File Upload & Download Logic
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');
  const uploadProgressContainer = document.getElementById('uploadProgressContainer');
  const uploadProgressName = document.getElementById('uploadProgressName');
  const uploadProgressPercent = document.getElementById('uploadProgressPercent');
  const progressBarFill = document.getElementById('progressBarFill');

  const filesGrid = document.getElementById('filesGrid');
  const emptyState = document.getElementById('emptyState');
  const filesCountBadge = document.getElementById('filesCountBadge');
  const statFileCount = document.getElementById('statFileCount');
  const statStorageSize = document.getElementById('statStorageSize');
  const serverStatusBadge = document.getElementById('serverStatusBadge');
  const serverStatusText = document.getElementById('serverStatusText');

  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const sortSelect = document.getElementById('sortSelect');
  const filterChips = document.querySelectorAll('.filter-chips .chip');

  // Preview Modal Elements
  const previewModal = document.getElementById('previewModal');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const previewModalTitle = document.getElementById('previewModalTitle');
  const previewModalIcon = document.getElementById('previewModalIcon');
  const previewModalBody = document.getElementById('previewModalBody');
  const previewModalInfo = document.getElementById('previewModalInfo');
  const previewDownloadBtn = document.getElementById('previewDownloadBtn');
  const previewCopyLinkBtn = document.getElementById('previewCopyLinkBtn');

  // QR Modal Elements
  const qrModal = document.getElementById('qrModal');
  const closeQrBtn = document.getElementById('closeQrBtn');
  const qrcodeContainer = document.getElementById('qrcode');
  const qrFileName = document.getElementById('qrFileName');
  const qrUrlInput = document.getElementById('qrUrlInput');
  const qrCopyUrlBtn = document.getElementById('qrCopyUrlBtn');

  const toastContainer = document.getElementById('toastContainer');

  // --- State Variables ---
  let allFiles = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let currentSort = 'newest';
  let activePreviewFile = null;

  // --- Initialize App ---
  checkServerHealth();
  loadFiles();
  loadStats();

  // --- Event Listeners: Drag & Drop ---
  let dragCounter = 0;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  dropzone.addEventListener('dragenter', (e) => {
    dragCounter++;
    dropzone.classList.add('drag-active');
  });

  dropzone.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzone.classList.remove('drag-active');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    dragCounter = 0;
    dropzone.classList.remove('drag-active');
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFilesUpload(droppedFiles);
    }
  });

  // Browse Button & Dropzone Click
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropzone.addEventListener('click', (e) => {
    // Only open picker if clicking background, not buttons/links
    if (e.target !== browseBtn && !uploadProgressContainer.contains(e.target)) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFilesUpload(fileInput.files);
    }
  });

  // --- File Upload via XMLHttpRequest (Real-time Progress) ---
  function handleFilesUpload(filesList) {
    if (!filesList || filesList.length === 0) return;

    const formData = new FormData();
    const count = filesList.length;
    let totalSize = 0;

    for (let i = 0; i < count; i++) {
      formData.append('files', filesList[i]);
      totalSize += filesList[i].size;
    }

    const firstFileName = filesList[0].name;
    const displayName = count === 1 ? firstFileName : `${firstFileName} + ${count - 1} more`;

    // Show Progress Bar
    uploadProgressContainer.style.display = 'flex';
    uploadProgressName.textContent = `Uploading ${displayName}...`;
    uploadProgressPercent.textContent = '0%';
    progressBarFill.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBarFill.style.width = `${percent}%`;
        uploadProgressPercent.textContent = `${percent}%`;
      }
    };

    xhr.onload = () => {
      // Reset input
      fileInput.value = '';

      if (xhr.status >= 200 && xhr.status < 300) {
        progressBarFill.style.width = '100%';
        uploadProgressPercent.textContent = '100%';

        setTimeout(() => {
          uploadProgressContainer.style.display = 'none';
          showToast(`Successfully uploaded ${count} file(s)!`, 'success');
          loadFiles();
          loadStats();
        }, 400);
      } else {
        uploadProgressContainer.style.display = 'none';
        try {
          const err = JSON.parse(xhr.responseText);
          showToast(err.error || 'Upload failed', 'error');
        } catch {
          showToast('Failed to upload files', 'error');
        }
      }
    };

    xhr.onerror = () => {
      fileInput.value = '';
      uploadProgressContainer.style.display = 'none';
      showToast('Network error while uploading', 'error');
    };

    xhr.send(formData);
  }

  // --- Load Files from Server ---
  async function loadFiles() {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      allFiles = data.files || [];
      renderFiles();
    } catch (err) {
      console.error(err);
      showToast('Unable to connect to server files', 'error');
      renderFiles();
    }
  }

  // --- Load Stats ---
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        statFileCount.textContent = data.totalCount;
        statStorageSize.textContent = data.formattedTotal;
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  // --- Server Health / Ping ---
  async function checkServerHealth() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        serverStatusBadge.classList.remove('offline');
        serverStatusText.textContent = 'Server Online';
      } else {
        throw new Error();
      }
    } catch {
      serverStatusBadge.classList.add('offline');
      serverStatusText.textContent = 'Offline Mode';
    }
  }

  // --- Render File Cards ---
  function renderFiles() {
    // Filter by category
    let filtered = allFiles.filter(file => {
      if (currentFilter === 'all') return true;
      const cat = getFileCategory(file.originalName, file.mimetype);
      return cat === currentFilter;
    });

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(f => f.originalName.toLowerCase().includes(q));
    }

    // Sort files
    filtered.sort((a, b) => {
      if (currentSort === 'newest') return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      if (currentSort === 'oldest') return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      if (currentSort === 'name') return a.originalName.localeCompare(b.originalName);
      if (currentSort === 'size-desc') return (b.size || 0) - (a.size || 0);
      if (currentSort === 'size-asc') return (a.size || 0) - (b.size || 0);
      return 0;
    });

    // Update count badge
    filesCountBadge.textContent = `${filtered.length} of ${allFiles.length} file${allFiles.length === 1 ? '' : 's'}`;

    // Handle Empty State
    if (filtered.length === 0) {
      filesGrid.innerHTML = '';
      emptyState.style.display = 'flex';
      const emptyTitle = document.getElementById('emptyStateTitle');
      const emptyDesc = document.getElementById('emptyStateText');

      if (allFiles.length === 0) {
        emptyTitle.textContent = 'No files uploaded yet';
        emptyDesc.textContent = 'Drag and drop any file above or click Browse to upload your first file!';
      } else {
        emptyTitle.textContent = 'No matching files found';
        emptyDesc.textContent = 'Try adjusting your search terms or filter categories.';
      }
      return;
    }

    emptyState.style.display = 'none';
    filesGrid.innerHTML = '';

    filtered.forEach(file => {
      const card = createFileCard(file);
      filesGrid.appendChild(card);
    });
  }

  // --- Create File Card DOM ---
  function createFileCard(file) {
    const ext = getFileExtension(file.originalName);
    const category = getFileCategory(file.originalName, file.mimetype);
    const isImage = category === 'image';
    const downloadUrl = `/api/download/${file.id}`;
    const viewUrl = `/api/view/${file.id}`;
    const timeAgo = formatRelativeTime(new Date(file.uploadedAt));

    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.id = file.id;

    // Card Top: Icon/Thumb + Name + Metadata
    const top = document.createElement('div');
    top.className = 'file-card-top';

    const iconBox = document.createElement('div');
    iconBox.className = 'file-icon-box';

    if (isImage) {
      const img = document.createElement('img');
      img.src = viewUrl;
      img.className = 'thumb';
      img.alt = file.originalName;
      img.loading = 'lazy';
      img.onerror = () => {
        iconBox.innerHTML = getFileIconSvg(category);
      };
      iconBox.appendChild(img);
    } else {
      iconBox.innerHTML = getFileIconSvg(category);
    }

    const details = document.createElement('div');
    details.className = 'file-details';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'file-name-wrap';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.title = file.originalName;
    name.textContent = file.originalName;
    name.addEventListener('click', () => openPreviewModal(file));

    nameWrap.appendChild(name);

    const metaRow = document.createElement('div');
    metaRow.className = 'file-meta-row';

    const badge = document.createElement('span');
    badge.className = `ext-badge ${category}`;
    badge.textContent = ext ? ext.toUpperCase() : 'FILE';

    const size = document.createElement('span');
    size.textContent = file.formattedSize;

    const bullet = document.createElement('span');
    bullet.textContent = '•';

    const time = document.createElement('span');
    time.textContent = timeAgo;

    metaRow.appendChild(badge);
    metaRow.appendChild(size);
    metaRow.appendChild(bullet);
    metaRow.appendChild(time);

    details.appendChild(nameWrap);
    details.appendChild(metaRow);

    top.appendChild(iconBox);
    top.appendChild(details);

    // Card Bottom: Actions (Preview, Copy Link, QR Code, Delete, Download)
    const bottom = document.createElement('div');
    bottom.className = 'file-card-bottom';

    const actionsLeft = document.createElement('div');
    actionsLeft.className = 'file-actions-left';

    // Preview Action Button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'action-icon-btn';
    previewBtn.title = 'Preview File';
    previewBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    `;
    previewBtn.addEventListener('click', () => openPreviewModal(file));

    // Copy Link Button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-icon-btn';
    copyBtn.title = 'Copy Direct Download Link';
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    `;
    copyBtn.addEventListener('click', () => {
      const fullUrl = `${window.location.origin}${downloadUrl}`;
      navigator.clipboard.writeText(fullUrl).then(() => {
        showToast('Direct download link copied to clipboard!', 'info');
      }).catch(() => {
        prompt('Copy this download link:', fullUrl);
      });
    });

    // QR Code Button
    const qrBtn = document.createElement('button');
    qrBtn.className = 'action-icon-btn';
    qrBtn.title = 'Scan QR code to download on mobile';
    qrBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    `;
    qrBtn.addEventListener('click', () => openQrModal(file));

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-icon-btn delete-btn';
    deleteBtn.title = 'Delete File';
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteFile(file));

    actionsLeft.appendChild(previewBtn);
    actionsLeft.appendChild(copyBtn);
    actionsLeft.appendChild(qrBtn);
    actionsLeft.appendChild(deleteBtn);

    // Primary Download Link
    const dlBtn = document.createElement('a');
    dlBtn.className = 'download-btn';
    dlBtn.href = downloadUrl;
    dlBtn.setAttribute('download', file.originalName);
    dlBtn.title = `Download ${file.originalName}`;
    dlBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download
    `;

    bottom.appendChild(actionsLeft);
    bottom.appendChild(dlBtn);

    card.appendChild(top);
    card.appendChild(bottom);

    return card;
  }

  // --- Delete File ---
  async function deleteFile(file) {
    if (!confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted "${file.originalName}"`, 'info');
        loadFiles();
        loadStats();
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (err) {
      showToast('Could not delete file from server', 'error');
    }
  }

  // --- Preview Modal ---
  async function openPreviewModal(file) {
    activePreviewFile = file;
    const category = getFileCategory(file.originalName, file.mimetype);
    const viewUrl = `/api/view/${file.id}`;
    const downloadUrl = `/api/download/${file.id}`;

    previewModalTitle.textContent = file.originalName;
    previewModalInfo.textContent = `Size: ${file.formattedSize} • Type: ${file.mimetype || 'Unknown'}`;
    previewDownloadBtn.href = downloadUrl;
    previewDownloadBtn.setAttribute('download', file.originalName);

    previewModalIcon.textContent = getCategoryEmoji(category);
    previewModalBody.innerHTML = '<div style="color:var(--text-muted);">Loading preview...</div>';
    previewModal.style.display = 'flex';

    if (category === 'image') {
      const img = document.createElement('img');
      img.src = viewUrl;
      img.alt = file.originalName;
      previewModalBody.innerHTML = '';
      previewModalBody.appendChild(img);
    } else if (category === 'video') {
      const video = document.createElement('video');
      video.src = viewUrl;
      video.controls = true;
      video.autoplay = false;
      previewModalBody.innerHTML = '';
      previewModalBody.appendChild(video);
    } else if (category === 'audio') {
      const audio = document.createElement('audio');
      audio.src = viewUrl;
      audio.controls = true;
      audio.autoplay = false;
      previewModalBody.innerHTML = '';
      previewModalBody.appendChild(audio);
    } else if (file.originalName.toLowerCase().endsWith('.pdf')) {
      const iframe = document.createElement('iframe');
      iframe.src = viewUrl;
      previewModalBody.innerHTML = '';
      previewModalBody.appendChild(iframe);
    } else if (isTextOrCodeFile(file.originalName)) {
      try {
        const textRes = await fetch(viewUrl);
        const text = await textRes.text();
        const pre = document.createElement('pre');
        pre.textContent = text;
        previewModalBody.innerHTML = '';
        previewModalBody.appendChild(pre);
      } catch {
        previewModalBody.innerHTML = '<p style="color:var(--text-muted)">Unable to render text preview.</p>';
      }
    } else if (category === 'executable') {
      previewModalBody.innerHTML = `
        <div style="text-align: center; padding: 24px; max-width: 440px; margin: 0 auto;">
          <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 18px rgba(244, 63, 94, 0.5));">⚡</div>
          <h4 style="font-weight: 700; font-size: 1.2rem; margin-bottom: 6px; color: var(--text-main); word-break: break-all;">${escapeHtml(file.originalName)}</h4>
          <div style="display: inline-block; background: rgba(244, 63, 94, 0.2); color: #fda4af; border: 1px solid rgba(244, 63, 94, 0.35); font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 12px; text-transform: uppercase;">Executable Application / Installer</div>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 24px; line-height: 1.5;">This file is a Windows/system executable program. Click below to download and run it directly on your computer.</p>
          <a href="${downloadUrl}" download="${escapeHtml(file.originalName)}" class="btn btn-primary" style="background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); box-shadow: 0 4px 18px rgba(244, 63, 94, 0.45); padding: 12px 24px; font-size: 0.95rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download Executable (${file.formattedSize})
          </a>
        </div>
      `;
    } else {
      // Fallback for binaries / archives / etc.
      previewModalBody.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">${getCategoryEmoji(category)}</div>
          <p style="font-weight: 600; font-size: 1.1rem; margin-bottom: 6px;">${escapeHtml(file.originalName)}</p>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">No inline preview available for this file type.</p>
          <a href="${downloadUrl}" download="${escapeHtml(file.originalName)}" class="btn btn-primary">
            Download File (${file.formattedSize})
          </a>
        </div>
      `;
    }
  }

  closePreviewBtn.addEventListener('click', () => {
    previewModal.style.display = 'none';
    previewModalBody.innerHTML = '';
  });

  previewCopyLinkBtn.addEventListener('click', () => {
    if (activePreviewFile) {
      const url = `${window.location.origin}/api/download/${activePreviewFile.id}`;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'info');
      });
    }
  });

  // --- QR Code Modal ---
  function openQrModal(file) {
    const fullUrl = `${window.location.origin}/api/download/${file.id}`;
    qrFileName.textContent = file.originalName;
    qrUrlInput.value = fullUrl;
    qrcodeContainer.innerHTML = '';

    // Generate QR Code
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrcodeContainer, {
        text: fullUrl,
        width: 180,
        height: 180,
        colorDark: "#090d16",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      // Fallback to QR server API if offline CDN fails
      const qrImg = document.createElement('img');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullUrl)}`;
      qrImg.alt = 'QR Code';
      qrcodeContainer.appendChild(qrImg);
    }

    qrModal.style.display = 'flex';
  }

  closeQrBtn.addEventListener('click', () => {
    qrModal.style.display = 'none';
  });

  qrCopyUrlBtn.addEventListener('click', () => {
    qrUrlInput.select();
    navigator.clipboard.writeText(qrUrlInput.value).then(() => {
      showToast('Download URL copied!', 'info');
    });
  });

  // Close modals on outside backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      previewModal.style.display = 'none';
      previewModalBody.innerHTML = '';
    }
    if (e.target === qrModal) {
      qrModal.style.display = 'none';
    }
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      previewModal.style.display = 'none';
      qrModal.style.display = 'none';
    }
  });

  // --- Search & Filter Listeners ---
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderFiles();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderFiles();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderFiles();
  });

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.category;
      renderFiles();
    });
  });

  // --- Helper Functions ---
  function getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : '';
  }

  function getFileCategory(filename, mimetype) {
    const ext = getFileExtension(filename);
    const mime = (mimetype || '').toLowerCase();

    if (['exe', 'msi', 'apk', 'dmg', 'app', 'bat', 'cmd', 'scr', 'bin', 'deb', 'rpm'].includes(ext) || mime.includes('x-msdownload') || mime.includes('x-executable')) {
      return 'executable';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff'].includes(ext) || mime.startsWith('image/')) {
      return 'image';
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'ods', 'epub'].includes(ext) || mime.includes('pdf') || mime.includes('document')) {
      return 'document';
    }
    if (['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv', 'wmv'].includes(ext) || mime.startsWith('video/')) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma'].includes(ext) || mime.startsWith('audio/')) {
      return 'audio';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
      return 'archive';
    }
    return 'other';
  }

  function getCategoryEmoji(cat) {
    switch (cat) {
      case 'executable': return '⚡';
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'archive': return '📦';
      default: return '📁';
    }
  }

  function isTextOrCodeFile(filename) {
    const ext = getFileExtension(filename);
    const codeExts = ['txt', 'md', 'json', 'js', 'html', 'css', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'sh', 'xml', 'yaml', 'yml', 'env', 'sql'];
    return codeExts.includes(ext);
  }

  function getFileIconSvg(category) {
    switch (category) {
      case 'executable':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;color:#fda4af;"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><polygon points="10 11 15 14 10 17 10 11"/></svg>`;
      case 'image':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      case 'document':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
      case 'video':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
      case 'audio':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
      case 'archive':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
    }
  }

  function formatRelativeTime(date) {
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
      <span style="font-weight:bold;font-size:1.1rem;">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toastContainer.removeChild(toast);
        }
      }, 250);
    }, 3200);
  }
});
