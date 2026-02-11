// 初始化 Express 應用並設定沙箱目錄 (MOCK_ROOT)
const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config(); // 預設讀取當前工作目錄下的 .env

const app = express();
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const start = Date.now();
  
  // Hook res.send to log response summary
  const oldSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;
    let summary = '';
    
    try {
      const body = JSON.parse(typeof data === 'string' ? data : data.toString());
      if (Array.isArray(body)) {
        summary = `Count: ${body.length}`;
      } else if (body && typeof body === 'object') {
        summary = body.error ? `Error: ${body.error}` : 'Object';
      }
    } catch (e) {
      summary = data ? `Size: ${data.length || 'unknown'}` : 'Empty';
    }

    console.log(`[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms) - Res: ${summary}`);
    return oldSend.apply(res, arguments);
  };

  console.log(`[${timestamp}] ${req.method} ${req.url} - Req: ${JSON.stringify(req.body)}`);
  next();
});

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
    // 允許讀取點開頭的隱藏檔案 (dotfiles: 'allow')
    res.sendFile(req.fullPath, { dotfiles: 'allow' });
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

process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] UNCAUGHT EXCEPTION:`, err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] UNHANDLED REJECTION at:`, promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${EXPLORER_DATA_ROOT}`);
});
