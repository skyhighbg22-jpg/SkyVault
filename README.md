# SkyVault

A local-first CLI secret manager built with Node.js. Store and manage secrets securely with AES-256-GCM encryption.

## Installation

```bash
npm install
```

## Quick Start

```bash
# Initialize the vault
node bin/skv.js vault init

# Add a secret
node bin/skv.js add my-api-key --provider aws --type api

# Retrieve a secret (masked by default)
node bin/skv.js get my-api-key

# Copy to clipboard
node bin/skv.js get my-api-key --copy

# List all secrets
node bin/skv.js list
```

## Features Implemented

### Day 1 - Core CLI
- ✅ Project scaffolding with ES modules
- ✅ Commander.js CLI framework
- ✅ Core commands: add, get, list, remove, context, find, generate, doctor
- ✅ Namespace and environment organization
- ✅ Input validation
- ✅ Terminal UI with chalk styling
- ✅ Tabular output with cli-table3

### Day 2 - Security & Encryption
- ✅ **AES-256-GCM encryption** for all secret values
- ✅ **PBKDF2 key derivation** (600,000 iterations, SHA-512)
- ✅ **HMAC-SHA256 integrity checking**
- ✅ **Session tokens** with 15-minute TTL
- ✅ **Atomic file writes** (temp + rename pattern)
- ✅ **Advisory file locking** (PID-based)
- ✅ Vault lifecycle: init, unlock, lock, status, set-password
- ✅ Clipboard auto-clear (configurable TTL)
- ✅ Import/export (env, JSON formats)
- ✅ Run command with environment variable injection

## Commands

### Vault Management
```bash
skv vault init              # Initialize encrypted vault
skv vault unlock            # Unlock vault (creates session)
skv vault lock              # Lock vault (destroys session)
skv vault status            # Show vault status
skv vault set-password      # Change master password
```

### Secret Operations
```bash
skv add <name> [options]    # Add a new secret
  --provider <provider>     # Secret provider (aws, github, etc.)
  --type <type>             # Secret type (api, password, token)
  --expires <expiry>        # Expiry (90d, 6m, 1y, or ISO date)
  --tags <tags>             # Comma-separated tags
  --generate                # Generate random secret
  --length <n>              # Generated secret length

skv get <name> [options]    # Retrieve a secret
  --raw                     # Show unmasked value
  --copy                    # Copy to clipboard
  --ttl <seconds>           # Clipboard clear timeout (default: 30)

skv list [options]          # List secrets
  --ns <namespace>          # Filter by namespace
  --env <environment>       # Filter by environment
  --expired                 # Show only expired
  --json                    # JSON output

skv remove <name> [options] # Delete a secret
  --force                   # Skip confirmation
  --all                     # Remove all secrets in context

skv find <query> [options]  # Search secrets
  --regex                   # Use regex pattern

skv generate [options]      # Generate random secret
  --length <n>              # Secret length (default: 32)
  --copy                    # Copy to clipboard
```

### Context Management
```bash
skv context create <ns> [env]     # Create namespace/environment
skv context use <ns> [env]         # Switch context
skv context list                    # Show all contexts
skv context remove <ns> [env]       # Remove context
```

### Import/Export
```bash
skv import <file> [options] # Import secrets
  --format <format>         # env, json
  --dry-run                 # Preview only

skv export [name] [options] # Export secrets
  --format <format>         # env, json
  --out <file>              # Output file
  --all                     # Export all
```

### Environment Injection
```bash
skv run --use db-pass=DB_PASSWORD -- npm start
skv run --all -- ./start.sh
```

### Utilities
```bash
skv doctor                  # Environment health check
skv generate                # Generate secure random secret
```

## Security Features

- **Encryption at Rest**: All secrets encrypted with AES-256-GCM
- **Key Derivation**: PBKDF2 with 600,000 iterations
- **Session Management**: 15-minute TTL with auto-lock
- **Integrity**: HMAC-SHA256 verification on every load
- **Atomic Writes**: Never leaves vault in partially-written state
- **File Locking**: Prevents concurrent modification
- **Clipboard Protection**: Auto-clears after timeout

## Architecture

```
src/
├── bin/skv.js              # CLI entry point
├── commands/               # Command implementations
│   ├── add.js
│   ├── get.js
│   ├── list.js
│   ├── remove.js
│   ├── context.js
│   ├── find.js
│   ├── generate.js
│   ├── doctor.js
│   ├── vault-cmd.js        # Vault lifecycle
│   ├── import-cmd.js
│   ├── export-cmd.js
│   └── run.js
├── core/                   # Core modules
│   ├── vault.js            # Plaintext vault ops
│   ├── encrypted-vault.js # Encrypted vault
│   ├── crypto.js           # Encryption utilities
│   ├── session.js          # Session management
│   └── vault-manager.js    # Unified access layer
└── ui/
    └── output.js           # Terminal output
```

## Storage Format

Vault is stored at `~/.skyvault/vault.json`:

```json
{
  "_header": {
    "schema_version": 2,
    "kdf": "pbkdf2",
    "kdf_params": { "iterations": 600000, "hash": "sha512" },
    "salt": "base64-salt",
    "hmac": "base64-hmac",
    "created": "2026-03-19T..."
  },
  "namespaces": {
    "default": {
      "dev": {
        "secret-name": {
          "ciphertext": "base64",
          "iv": "base64",
          "authTag": "base64",
          "type": "api",
          "provider": "aws",
          "created": "...",
          "updated": "..."
        }
      }
    }
  }
}
```

## Planned Features (Day 3+)

- 🔲 Secret versioning and history (rollback)
- 🔲 Secret rotation
- 🔲 Fuzzy search with fuse.js
- 🔲 Tab completion
- 🔲 Shell integration (direnv)
- 🔲 Health dashboard
- 🔲 Secret analysis (entropy, breach check)
- 🔲 Backup/restore
- 🔲 Check expiry notifications
- 🔲 Alias system
- 🔲 Config file support
- 🔲 Plugin system

## Testing

```bash
npm test
```

## License

ISC

## Status

✅ **Day 1 Complete**: Core CLI and commands
✅ **Day 2 Complete**: Encryption, sessions, security features
⏳ **Day 3**: Advanced features and polish
