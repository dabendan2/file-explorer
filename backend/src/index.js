// 初始化 Express 應用並設定沙箱目錄 (MOCK_ROOT)
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const MOCK_ROOT = process.env.MOCK_ROOT || '/home/ubuntu/.openclaw/workspace';

// API: 讀取沙箱目錄內容並返回檔案列表
app.get('/api/files', (req, res) => {
  const files = fs.readdirSync(MOCK_ROOT).map(name => {
    const stats = fs.statSync(path.join(MOCK_ROOT, name));
    return {
      name,
      type: stats.isDirectory() ? 'folder' : 'file',
      size: stats.size,
      modified: stats.mtime.toISOString().split('T')[0]
    };
  });
  res.json(files);
});

// API: 獲取系統版本資訊
app.get('/api/version', (req, res) => {
  res.json({
    version: process.env.REACT_APP_VERSION || '1.0.0',
    gitSha: process.env.REACT_APP_GIT_SHA || 'unknown'
  });
});

// 啟動監聽埠號
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${MOCK_ROOT}`);
});
