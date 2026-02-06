// 初始化 Express 應用並設定沙箱目錄 (MOCK_ROOT)
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config(); // 預設讀取當前工作目錄下的 .env

const app = express();

const EXPLORER_DATA_ROOT = process.env.EXPLORER_DATA_ROOT || path.join(__dirname, '../../tests/sandbox/mock_root');

const MOCK_ROOT = EXPLORER_DATA_ROOT; // 保持變數名相容性

// API: 讀取目錄內容並返回檔案列表 (支援路徑參數)
app.get('/explorer/api/files', (req, res) => {
  try {
    const subPath = req.query.path || '';
    const explorerMode = req.query.mode || 'local';
    
    if (explorerMode === 'google') {
      const { execSync } = require('child_process');
      try {
        const cmd = subPath 
          ? `gog drive ls --parent "${subPath}" --json --no-input`
          : `gog drive ls --json --no-input`;
        const output = execSync(cmd, { encoding: 'utf8' });
        const driveOutput = JSON.parse(output);
        console.log('Drive Output Type:', typeof driveOutput, 'IsArray:', Array.isArray(driveOutput));
        const driveFiles = Array.isArray(driveOutput) ? driveOutput : (driveOutput.files || []);
        const mapped = driveFiles.map(f => ({
          name: f.name,
          id: f.id, // Include ID for gdrive
          type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
          size: f.size || '-',
          modified: f.modifiedTime ? f.modifiedTime.split('T')[0] : '-'
        }));
        return res.json(mapped);
      } catch (err) {
        return res.status(500).json({ error: 'Google Drive access failed: ' + err.message });
      }
    }

    const fullPath = path.join(MOCK_ROOT, subPath);

    // 安全檢查：確保路徑在 MOCK_ROOT 內
    if (!fullPath.startsWith(MOCK_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const files = fs.readdirSync(fullPath).map(name => {
      const stats = fs.statSync(path.join(fullPath, name));
      return {
        name,
        type: stats.isDirectory() ? 'folder' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString().split('T')[0]
      };
    });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: 獲取系統版本資訊
app.get('/explorer/api/version', (req, res) => {
  res.json({
    gitSha: process.env.REACT_APP_GIT_SHA || 'unknown',
    dataRoot: EXPLORER_DATA_ROOT
  });
});

// API: 讀取檔案內容
app.get('/explorer/api/content', (req, res) => {
  try {
    const filePath = req.query.path;
    const explorerMode = req.query.mode || 'local';
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    
    if (explorerMode === 'google') {
      const { execSync } = require('child_process');
      try {
        // Assume filePath is fileId in google mode
        const cmd = `gog drive download "${filePath}" --stdout --no-input`;
        const output = execSync(cmd);
        return res.send(output);
      } catch (err) {
        return res.status(500).json({ error: 'Google Drive download failed: ' + err.message });
      }
    }

    const fullPath = path.join(MOCK_ROOT, filePath);
    if (!fullPath.startsWith(MOCK_ROOT)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return res.status(404).json({ error: 'File not found' });

    const content = fs.readFileSync(fullPath);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: 刪除檔案或目錄
app.delete('/explorer/api/delete', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path required' });

    const fullPath = path.join(MOCK_ROOT, filePath);
    if (!fullPath.startsWith(MOCK_ROOT)) return res.status(403).json({ error: 'Access denied' });
    if (fullPath === MOCK_ROOT) return res.status(403).json({ error: 'Cannot delete root' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Not found' });

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 啟動監聽埠號
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${MOCK_ROOT}`);
});
