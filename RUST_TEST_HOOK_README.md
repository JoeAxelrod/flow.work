# Rust Test Hook Script

This Rust script performs the same function as `test-hook.ps1` - it sends a POST request to the workflow hook endpoint.

## Prerequisites

1. **Install Rust** (if not already installed):
   ```powershell
   # Download and run from: https://rustup.rs/
   # Or use winget:
   winget install Rustlang.Rustup
   ```

2. **Verify installation**:
   ```powershell
   rustc --version
   cargo --version
   ```

## How to Run

### Option 1: Using Cargo (Recommended)

1. **Run directly** (Cargo will compile and run):
   ```powershell
   cargo run --bin test-hook
   ```

2. **Build first, then run**:
   ```powershell
   cargo build --release
   .\target\release\test-hook.exe
   ```

### Option 2: Compile Manually

1. **Compile the script**:
   ```powershell
   rustc --edition 2021 --extern reqwest --extern serde_json --extern tokio test-hook.rs
   ```

   However, this is more complex due to dependencies. **Option 1 is recommended.**

## Customizing the Script

Edit `test-hook.rs` to change:
- `base_url`: API server URL (default: `"http://localhost:3001"`)
- `slug`: Workflow slug (default: `"my-workflow"`)
- `key`: Station key (default: `"s1"`)
- `instance_id`: Instance UUID (default: `"550e8400-e29b-41d4-a716-446655440000"`)

## Dependencies

The script uses:
- **reqwest**: HTTP client
- **serde_json**: JSON serialization
- **tokio**: Async runtime

These are automatically downloaded by Cargo when you run `cargo run`.

## Output

The script will:
- Print the request URL in cyan
- Print the request body in gray
- Print success response in green
- Print errors in red/yellow

## Troubleshooting

If you get compilation errors:
1. Make sure Rust is up to date: `rustup update`
2. Make sure you're in the project root directory
3. Try `cargo clean` then `cargo run` again

