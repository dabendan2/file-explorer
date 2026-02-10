const { exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function runContentTest() {
  console.log("Starting Content API Test...");
  
  const backendPath = path.join(__dirname, '../../backend/src/index.js');
  const mockRoot = path.join(__dirname, './mock_root');
  
  // Start server on different port to avoid conflicts
  const server = exec(`MOCK_ROOT=${mockRoot} PORT=5003 node ${backendPath}`);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  const pngPath = 'test.png';
  const expectedBuffer = fs.readFileSync(path.join(mockRoot, pngPath));

  http.get(`http://localhost:5003/file-explorer/api/content?path=${pngPath}`, (res) => {
    console.log('Headers:', res.headers);
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      try {
        const receivedBuffer = Buffer.concat(chunks);
        
        console.log(`Expected size: ${expectedBuffer.length}`);
        console.log(`Received size: ${receivedBuffer.length}`);

        if (Buffer.compare(expectedBuffer, receivedBuffer) !== 0) {
          throw new Error("Content mismatch! Binary data corrupted (likely due to utf8 encoding).");
        }

        console.log("✅ Content Test Passed: Binary data matches.");
        server.kill();
        process.exit(0);
      } catch (err) {
        console.error(`❌ Content Test Failed: ${err.message}`);
        server.kill();
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error("❌ Content Test Failed: Could not connect to backend.", err);
    server.kill();
    process.exit(1);
  });
}

runContentTest();
