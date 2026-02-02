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

  http.get('http://localhost:5001/api/files', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const files = JSON.parse(data);
      const hasTxt = files.some(f => f.name === 'test.txt');
      const hasPng = files.some(f => f.name === 'test.png');
      
      if (hasTxt && hasPng) {
        console.log("✅ Sandbox Test Passed: Found expected files in mock_root.");
        process.exit(0);
      } else {
        console.error("❌ Sandbox Test Failed: Missing expected files.", files);
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
