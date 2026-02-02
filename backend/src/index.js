const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const MOCK_ROOT = process.env.MOCK_ROOT || path.join(__dirname, '../../tests/sandbox/mock_root');

app.get('/api/files', (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}, Root: ${MOCK_ROOT}`);
});
