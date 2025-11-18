# Node.js Test Hook Script

This JavaScript script performs the same function as `test-hook.ps1` - it sends a POST request to the workflow hook endpoint.

## Prerequisites

**Node.js** (version 18+ recommended for native `fetch` support)

Check if Node.js is installed:
```powershell
node --version
```

If not installed, download from: https://nodejs.org/

## How to Run

### Option 1: Using Native Fetch (Node.js 18+)

**Simply run:**
```powershell
node test-hook.js
```

No dependencies needed! Node.js 18+ includes `fetch` natively.

### Option 2: Using Node.js 16 or earlier

If you're using Node.js 16 or earlier, you'll need to install `node-fetch`:

1. **Install node-fetch**:
   ```powershell
   npm install node-fetch@2
   ```

2. **Update the script** - Replace the `fetch` call with:
   ```javascript
   const fetch = require('node-fetch');
   ```

   Or use the version below that works with older Node.js versions.

## Customizing the Script

Edit `test-hook.js` to change:
- `baseUrl`: API server URL (default: `"http://localhost:3001"`)
- `slug`: Workflow slug (default: `"my-workflow"`)
- `key`: Station key (default: `"s1"`)
- `instanceId`: Instance UUID (default: `"550e8400-e29b-41d4-a716-446655440000"`)

## Output

The script will:
- Print the request URL in cyan
- Print the request body in gray
- Print success response in green
- Print errors in red/yellow

## Example Output

```
Sending POST request to: http://localhost:3001/api/v1/hook/workflow/my-workflow/station/s1
Body: {
  "instanceId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "message": "test hook data",
    "value": 123
  }
}
Success! Response:
{
  "ok": true
}
```

