# SkyVault CLI Zsh Completion
# Save this file and add to your ~/.zshrc:
#   source /path/to/skv.zsh

# Commands
local -a commands
commands=(
  'add:Add a new secret'
  'get:Retrieve a secret'
  'list:List all secrets'
  'remove:Delete a secret'
  'find:Search secrets'
  'generate:Generate random secret'
  'vault:Vault lifecycle management'
  'context:Context management'
  'backup:Backup management'
  'import:Import secrets'
  'import-env:Import from .env file'
  'export:Export secrets'
  'run:Run command with secrets'
  'doctor:Check environment health'
  'dashboard:Show secret overview'
  'quick-add:Interactive secret wizard'
  'templates:List available templates'
  'share:Share secrets securely'
)

# Vault subcommands
local -a vault_cmds
vault_cmds=(
  'init:Initialize encrypted vault'
  'unlock:Unlock vault'
  'lock:Lock vault'
  'set-password:Change master password'
  'status:Show vault status'
)

# Backup subcommands
local -a backup_cmds
backup_cmds=(
  'create:Create backup'
  'list:List backups'
  'restore:Restore from backup'
  'delete:Delete backup'
)

# Templates
local -a templates
templates=(
  'aws:AWS Access Key'
  'github:GitHub Token'
  'openai:OpenAI API Key'
  'stripe:Stripe API Key'
  'slack:Slack Bot Token'
  'sendgrid:SendGrid API Key'
  'firebase:Firebase Credentials'
  'supabase:Supabase API Key'
  'vercel:Vercel API Token'
  'netlify:Netlify API Token'
)

# Options
local -a options
options=(
  '--help[Show help]'
  '--version[Show version]'
  '--ns[Target namespace]:namespace:'
  '--env[Target environment]:environment:'
  '--raw[Output unmasked value]'
  '--copy[Copy to clipboard]'
  '--json[JSON output]'
  '--quiet[Suppress output]'
  '--verbose[Verbose output]'
  '--no-color[Disable colors]'
  '--no-onboarding,-s[Skip onboarding]'
)

# Main completion
_skv() {
  local -a context line expl
  local cmd
  
  _arguments -C \
    '1: :->command' \
    '*:: :->option' && return 0
  
  case $state in
    command)
      _describe 'command' commands
      ;;
    option)
      cmd=${line[1]}
      case $cmd in
        vault)
          _describe 'subcommand' vault_cmds
          ;;
        backup)
          _describe 'subcommand' backup_cmds
          ;;
        add)
          _arguments \
            '1:secret name:' \
            '--template:template:($templates)' \
            '--provider:provider:' \
            '--type:type:' \
            '--expires:expiry:' \
            '--tags:tags:' \
            '--generate' \
            '--overwrite' && return 0
          ;;
        get|remove)
          _arguments \
            '1:secret name:' \
            '--ns:namespace:' \
            '--env:environment:' && return 0
          ;;
        templates)
          _describe 'subcommand' templates
          ;;
        *)
          _describe 'option' options
          ;;
      esac
      ;;
  esac
}

compdef _skv skv
