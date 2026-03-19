# SkyVault

<div align="center">

A **local-first CLI secret manager** for developers. Store and manage secrets securely with AES-256-GCM encryption. No cloud, no accounts, no tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

</div>

---

## Features

- 🔒 **Military-Grade Encryption** - AES-256-GCM with PBKDF2 key derivation
- 🚀 **Local-First** - No cloud dependency, works offline forever
- 🎯 **Developer-Focused** - Namespace/environment organization, import/export, env injection
- ⚡ **Fast & Simple** - Easy to use CLI, works out of the box
- 🛡️ **Secure by Default** - Secrets encrypted at rest, HMAC integrity checking, session auto-lock
- 📦 **Versioning** - Track secret history and rollback changes

---

## Installation

### Option 1: Install from npm (Recommended)

```bash
npm install -g skyvault
```

Then verify:
```bash
skv --help
```

### Option 2: Install from GitHub

```bash
# Install latest from main branch
npm install -g github:YOUR_USERNAME/skyvault

# Or install a specific release
npm install -g github:YOUR_USERNAME/skyvault#v1.0.0
```

### Option 3: Install from Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/skyvault.git
cd skyvault

# Install dependencies
npm install

# Install globally
npm install -g .

# Or run directly
node bin/skv.js --help
```

### Option 4: Download Release

1. Go to the [Releases page](https://github.com/YOUR_USERNAME/skyvault/releases)
2. Download the latest `.tgz` file
3. Install: `npm install -g /path/to/skyvault-1.0.0.tgz`

---

## Quick Start

### 1. Initialize Your Vault

```bash
skv vault init
```

You'll be prompted to create a master password. This encrypts your entire vault.

### 2. Add Secrets

```bash
# Add a secret interactively
skv add my-api-key

# Add with metadata
skv add github-token --provider github --type token --tags ci,automation

# Generate a random secure password
skv add db-password --generate --length 32
```

### 3. Retrieve Secrets

```bash
# View a secret (masked)
skv get my-api-key

# Reveal the secret
skv get my-api-key --raw

# Copy to clipboard (auto-clears after 30s)
skv get my-api-key --copy
```

### 4. List & Search

```bash
# List all secrets
skv list

# Search for secrets
skv find github

# Filter by namespace/environment
skv list --ns myapp --env production
```

---

## All Commands

### Vault Management

| Command | Description |
|---------|-------------|
| `skv vault init` | Initialize encrypted vault |
| `skv vault unlock` | Unlock vault (starts session) |
| `skv vault lock` | Lock vault (ends session) |
| `skv vault status` | Show vault status |
| `skv vault set-password` | Change master password |

### Secret Operations

| Command | Description |
|---------|-------------|
| `skv add <name>` | Add a new secret |
| `skv get <name>` | Retrieve a secret |
| `skv list` | List all secrets |
| `skv remove <name>` | Delete a secret |
| `skv find <query>` | Search secrets |
| `skv generate` | Generate random secret |

### Advanced Operations

| Command | Description |
|---------|-------------|
| `skv history <name>` | View secret version history |
| `skv rollback <name>` | Restore previous version |
| `skv rotate <name>` | Rotate secret value |
| `skv backup create` | Create vault backup |
| `skv backup list` | List all backups |
| `skv backup restore <name>` | Restore from backup |
| `skv import <file>` | Import secrets (.env, JSON) |
| `skv export [name]` | Export secrets |
| `skv run -- <cmd>` | Run with secrets as env vars |

### Context Management

| Command | Description |
|---------|-------------|
| `skv context create <ns> [env]` | Create namespace/environment |
| `skv context use <ns> [env]` | Switch context |
| `skv context list` | List all contexts |
| `skv context remove <ns> [env]` | Remove context |

### Utilities

| Command | Description |
|---------|-------------|
| `skv doctor` | Check environment health |
| `skv help` | Show help |

---

## Command Options

### Global Options

```
--ns <namespace>     Target namespace (default: default)
--env <environment>  Target environment (default: dev)
--raw                Output unmasked secret value
--copy               Copy to clipboard
--json               JSON output
-q, --quiet          Suppress non-essential output
-v, --verbose       Show debug output
--no-color           Disable colors
```

### skv add Options

```
--provider <name>     Secret provider (e.g., aws, github)
--type <type>         Secret type (api, password, token, secret)
--expires <expiry>    Expiry: 90d, 6m, 1y, or ISO date
--tags <tags>         Comma-separated tags
--generate            Generate random value
--length <n>          Generated secret length (default: 32)
--overwrite           Overwrite existing secret
```

### skv get Options

```
--ttl <seconds>       Clipboard auto-clear timeout (default: 30)
--field <field>       Get specific field (value, provider, type, etc.)
```

---

## Security Architecture

### Encryption Stack

| Layer | Algorithm | Details |
|-------|----------|---------|
| Key Derivation | PBKDF2-SHA512 | 600,000 iterations |
| Encryption | AES-256-GCM | 12-byte random IV per secret |
| Integrity | HMAC-SHA256 | Verified on every load |
| Hashing | SHA-256 | Names anonymized in logs |

### Session Security

- **15-minute session TTL** (configurable)
- **Session tokens** stored in `/tmp/skyvault-<uid>.session`
- **Auto-clear clipboard** after configurable timeout
- **Key never written to disk** - memory only

### Threat Mitigation

| Threat | Protection |
|--------|------------|
| Filesystem read | AES-256-GCM encryption |
| Vault tampering | HMAC integrity verification |
| Weak passwords | PBKDF2 high iteration count |
| Clipboard theft | Auto-clear after timeout |
| Shell history | Env injection, not arguments |

---

## File Structure

```
skyvault/
├── bin/
│   └── skv.js              # CLI entry point
├── src/
│   ├── commands/            # Command implementations (16 commands)
│   ├── core/                # Core modules
│   │   ├── vault.js        # Vault operations
│   │   ├── encrypted-vault.js
│   │   ├── crypto.js       # Encryption utilities
│   │   └── session.js      # Session management
│   ├── ui/
│   │   └── output.js       # Terminal output
│   └── utils/              # Utility functions
├── tests/                   # Test files
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

## Configuration

### Vault Location

Default: `~/.skyvault/`

```
~/.skyvault/
├── vault.json         # Encrypted vault
├── vault.json.lock    # Advisory lock
├── vault.json.tmp     # Atomic write staging
├── context           # Current namespace/environment
├── backups/          # Vault backups
└── audit.log         # Operation audit log
```

---

## Requirements

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0 (for installation)

---

## Troubleshooting

### "skv: command not found"

1. Make sure npm global bin is in your PATH
2. Try: `npm config get prefix`
3. Add to PATH if needed

### "Vault integrity check failed"

- Wrong master password
- Corrupted vault file
- Try restoring from backup: `skv backup restore <name>`

### "Session expired"

- Run `skv vault unlock` to start a new session

### "Permission denied" on vault file

- On Linux/Mac: `chmod 600 ~/.skyvault/vault.json`

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

---

## Roadmap

- [x] Core CLI commands
- [x] AES-256-GCM encryption
- [x] Session management
- [x] Secret versioning
- [x] Backup/restore
- [ ] Fuzzy search (fuse.js)
- [ ] Tab completion
- [ ] Secret sharing
- [ ] Plugin system
- [ ] TUI interface

---

<div align="center">

**Built with 🔒 by developers, for developers**

</div>
