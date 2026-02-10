const { exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function runHiddenFileTest() {
  console.log("Starting Sandbox Hidden File Test...");
  
  const backendPath = path.join(__dirname, '../../backend/src/index.js');
  const mockRoot = path.join(__dirname, './mock_root');
  const dotEnvPath = path.join(mockRoot, '.env');
  
  // Ensure .env exists in mock root
  fs.writeFileSync(dotEnvPath, 'PORT=PLACEHOLDER');
  
  const server = exec(`EXPLORER_DATA_ROOT=${mockRoot} PORT=5004 node ${backendPath}`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  http.get(`http://localhost:5004/file-explorer/api/content?path=.env`, (res) => {
    console.log('Status Code:', res.statusCode);
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      try {
        const content = Buffer.concat(chunks).toString();
        console.log('Content:', content);

        if (res.statusCode !== 200) {
          throw new Error(`Expected status 200, but got ${res.statusCode}. Body: ${content}`);
        }

        if (content !== 'PORT=PLACEHOLDER') {
          throw new Error(`Content mismatch! Expected 'PORT=PLACEHOLDER', but got '${content}'`);
        }

        console.log("✅ Hidden File Sandbox Test Passed: .env is accessible.");
        server.kill();
        process.exit(0);
      } catch (err) {
        console.error(`❌ Hidden File Sandbox Test Failed: ${err.message}`);
        server.kill();
        process.exit(1);
      }
    });
  }).on('error', (err) => {
    console.error("❌ Hidden File Sandbox Test Failed: Connection error.", err);
    server.kill();
    process.exit(1);
  });
}

runHiddenFileTest();
