import { spawn } from 'child_process';
import readline from 'readline';

const mcp = spawn('/Users/schneiderjean/.nvm/versions/node/v18.20.8/bin/npx', [
  '-y',
  '@supabase/mcp-server-supabase@latest',
  '--access-token',
  'sbp_102b6ec1c7e991e856f793db320d2d86c3243b71'
]);

const rl = readline.createInterface({
  input: mcp.stdout,
  terminal: false
});

let initialized = false;

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const parsed = JSON.parse(line);
    // Handle initialization response
    if (parsed.id === 1 && parsed.result) {
      initialized = true;
      // Now ask for tools
      mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }) + '\n');
    }
    // Handle tools response
    else if (parsed.id === 2 && parsed.result && parsed.result.tools) {
      console.log(JSON.stringify(parsed.result.tools, null, 2));
      mcp.kill();
      process.exit(0);
    }
  } catch (e) {
    // skip parse errors
  }
});

mcp.stderr.on('data', data => console.error('STDERR:', data.toString()));

// Send initialization
const req1 = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "1.0.0" }
  }
};
mcp.stdin.write(JSON.stringify(req1) + '\n');

setTimeout(() => {
  console.log('Timeout reached');
  mcp.kill();
  process.exit(1);
}, 10000);
