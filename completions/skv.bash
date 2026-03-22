# SkyVault CLI Bash Completion
# Save this file and add to your ~/.bashrc:
#   source /path/to/skv.bash

_skv_completion() {
  local cur prev opts
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  
  # Main commands
  local commands="add get list remove find generate vault context backup import export run doctor dashboard quick-add templates import-env share"
  
  # Vault subcommands
  local vault_cmds="init unlock lock set-password status"
  
  # Backup subcommands
  local backup_cmds="create list restore delete"
  
  # Options
  local options="--help --version --ns --env --raw --copy --json --quiet --verbose --no-color --no-onboarding -s"
  
  # Templates
  local templates="aws github openai stripe slack sendgrid firebase supabase vercel netlify"
  
  # First argument - command
  if [[ ${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    return 0
  fi
  
  # Command-specific completions
  case "${prev}" in
    skv)
      COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
      ;;
    vault)
      COMPREPLY=( $(compgen -W "${vault_cmds}" -- ${cur}) )
      ;;
    backup)
      COMPREPLY=( $(compgen -W "${backup_cmds}" -- ${cur}) )
      ;;
    --template)
      COMPREPLY=( $(compgen -W "${templates}" -- ${cur}) )
      ;;
    --ns|--env)
      # Could dynamically get these from vault
      COMPREPLY=()
      ;;
    --type)
      COMPREPLY=( $(compgen -W "api_key password token certificate secret" -- ${cur}) )
      ;;
    --provider)
      COMPREPLY=( $(compgen -W "${templates}" -- ${cur}) )
      ;;
    *)
      ;;
  esac
  
  # Add option completions if no match
  if [[ ${#COMPREPLY[@]} -eq 0 ]]; then
    COMPREPLY=( $(compgen -W "${options}" -- ${cur}) )
  fi
  
  return 0
}

complete -F _skv_completion skv

# Also enable for npmexec skv
complete -F _skv_completion npm exec --command=skv
