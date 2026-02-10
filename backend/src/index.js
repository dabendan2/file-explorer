// 初始化 Express 應用並設定沙箱目錄 (MOCK_ROOT)
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config(); // 預設讀取當前工作目錄下的 .env

const app = express();
app.use(express.json());

const EXPLORER_DATA_ROOT = process.env.EXPLORER_DATA_ROOT || path.join(__dirname, '../../tests/sandbox/mock_root');

// 中間件：路徑安全檢查與完整路徑解析
const resolveSafePath = (req, res, next) => {
  const subPath = req.query.path || req.body.oldPath || req.body.newPath || '';
  const fullPath = path.join(EXPLORER_DATA_ROOT, subPath);

  if (!fullPath.startsWith(EXPLORER_DATA_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  req.fullPath = fullPath;
  next();
};

// API: 讀取目錄內容並返回檔案列表 (支援路徑參數)
app.get('/file-explorer/api/files', resolveSafePath, (req, res) => {
  try {
    if (!fs.existsSync(req.fullPath)) return res.status(404).json({ error: 'Path not found' });

    const files = fs.readdirSync(req.fullPath).map(name => {
      const stats = fs.statSync(path.join(req.fullPath, name));
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
app.get('/file-explorer/api/version', (req, res) => {
  res.json({
    gitSha: process.env.REACT_APP_GIT_SHA || 'unknown',
    dataRoot: EXPLORER_DATA_ROOT
  });
});

// API: 讀取檔案內容
app.get('/file-explorer/api/content', resolveSafePath, (req, res) => {
  try {
    if (!fs.existsSync(req.fullPath) || !fs.statSync(req.fullPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(req.fullPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: 刪除檔案或目錄
app.delete('/file-explorer/api/delete', resolveSafePath, (req, res) => {
  try {
    if (req.fullPath === EXPLORER_DATA_ROOT) return res.status(403).json({ error: 'Cannot delete root' });
    if (!fs.existsSync(req.fullPath)) return res.status(404).json({ error: 'Not found' });

    fs.rmSync(req.fullPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: 重命名
app.post('/file-explorer/api/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    const oldFullPath = path.join(EXPLORER_DATA_ROOT, oldPath || '');
    const newFullPath = path.join(EXPLORER_DATA_ROOT, newPath || '');

    if (!oldFullPath.startsWith(EXPLORER_DATA_ROOT) || !newFullPath.startsWith(EXPLORER_DATA_ROOT)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(oldFullPath)) return res.status(404).json({ error: 'Source not found' });
    if (fs.existsSync(newFullPath)) return res.status(400).json({ error: 'Target already exists' });

    fs.renameSync(oldFullPath, newFullPath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 啟動監聽埠號
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${EXPLORER_DATA_ROOT}`);
});
