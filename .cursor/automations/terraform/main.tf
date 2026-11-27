terraform {
  required_providers {
    cursor = {
      source  = "cursor/cursor"
      version = ">= 0.1.0"
    }
  }
}

provider "cursor" {
  # Auth: CURSOR_TOKEN env (team service-account API key). Leave team_id unset for SA keys.
}

resource "cursor_platform_workflow" "bun_native_dts" {
  name           = "bun-native-dts-migration"
  description    = "Weekly: probe native bun build --dts; migrate off bunup when ready; stop acting after BUN_NATIVE_DTS_DONE."
  enabled        = true
  memory_enabled = true
  scope          = "user"

  git_repo   = "github.com/joao-coimbra/archstone"
  git_branch = "main"

  prompt = file("${path.module}/../bun-native-dts-PROMPT.body.md")

  trigger = [
    {
      cron = {
        # Mondays 15:00 UTC = 12:00 America/Sao_Paulo
        schedule = "0 15 * * 1"
      }
    }
  ]

  action = [
    {
      git_pr = {}
    }
  ]
}

output "automation_id" {
  value = cursor_platform_workflow.bun_native_dts.id
}
