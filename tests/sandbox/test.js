const { exec } = require('child_process');
const http = require('http');
const path = require('path');

async function runSandboxTest() {
  console.log("Starting Sandbox Test...");
  
  const backendPath = path.join(__dirname, '../../backend/src/index.js');
  const mockRoot = path.join(__dirname, './mock_root');
  
  const server = exec(`MOCK_ROOT=${mockRoot} PORT=5001 node ${backendPath}`);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  http.get('http://localhost:5001/explorer/api/files', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const files = JSON.parse(data);
        
        // 1. 驗證檔案是否存在
        const hasTxt = files.some(f => f.name === 'test.txt');
        const hasPng = files.some(f => f.name === 'test.png');
        if (!hasTxt || !hasPng) throw new Error("Missing expected files");

        // 2. 驗證結構欄位
        files.forEach(f => {
          if (!f.name || !f.type || f.size === undefined || !f.modified) {
            throw new Error(`Invalid file object structure: ${JSON.stringify(f)}`);
          }
          if (!['file', 'folder'].includes(f.type)) {
            throw new Error(`Invalid type: ${f.type}`);
          }
        });

        // 3. 驗證屬性正確性 (例如 test.txt 應該是 file)
        const txtFile = files.find(f => f.name === 'test.txt');
        if (txtFile.type !== 'file') throw new Error("test.txt should be a file");
        if (txtFile.size !== 12288) throw new Error(`test.txt size mismatch: expected 12288, got ${txtFile.size}`);

        const pngFile = files.find(f => f.name === 'test.png');
        if (pngFile.size !== 70) throw new Error(`test.png size mismatch: expected 70, got ${pngFile.size}`);

        console.log("✅ Sandbox Test Passed: All checks passed (presence, structure, types, size).");
        process.exit(0);
      } catch (err) {
        console.error(`❌ Sandbox Test Failed: ${err.message}`);
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error("❌ Sandbox Test Failed: Could not connect to backend.", err);
    process.exit(1);
  });

  // Cleanup server on exit
  process.on('exit', () => server.kill());
}

runSandboxTest();
