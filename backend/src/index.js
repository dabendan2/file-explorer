// 初始化 Express 應用並設定沙箱目錄 (MOCK_ROOT)
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const MOCK_ROOT = process.env.MOCK_ROOT || '/home/ubuntu/.openclaw/workspace';

// API: 讀取目錄內容並返回檔案列表 (支援路徑參數)
app.get('/explorer/api/files', (req, res) => {
  try {
    const subPath = req.query.path || '';
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
    version: process.env.REACT_APP_VERSION || '1.0.0',
    gitSha: process.env.REACT_APP_GIT_SHA || 'unknown'
  });
});

// API: 讀取檔案內容
app.get('/explorer/api/content', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    
    const fullPath = path.join(MOCK_ROOT, filePath);
    if (!fullPath.startsWith(MOCK_ROOT)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return res.status(404).json({ error: 'File not found' });

    const content = fs.readFileSync(fullPath, 'utf8');
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 啟動監聽埠號
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${MOCK_ROOT}`);
});
