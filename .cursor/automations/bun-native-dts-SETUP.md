# Setup: Bun native dts migration automation

Cloud Automations run on Cursor’s servers — your laptop can be off.

A Cloud Agent **cannot** create Automations via MCP alone. Use one of:

## A) Local Cursor — `/automate` (simplest)

In a **local** Agent on this repo, run `/automate` and ask it to create a weekly cron automation using [`bun-native-dts-PROMPT.body.md`](./bun-native-dts-PROMPT.body.md). Approve the draft and save in the Automations editor.

## B) Dashboard UI

1. Open https://cursor.com/automations/new
2. **Name:** `bun-native-dts-migration`
3. **Trigger:** Scheduled → cron `0 15 * * 1` (Mondays 12:00 America/Sao_Paulo)
4. **Repository:** `joao-coimbra/archstone`, branch `main`
5. **Tools:** enable pull request creation
6. **Prompt:** paste [`bun-native-dts-PROMPT.body.md`](./bun-native-dts-PROMPT.body.md)
7. Save and activate

## C) Terraform (for the Cloud Agent to apply)

Needs env `CURSOR_TOKEN` = team/user API key that can manage Automations.

```bash
cd .cursor/automations/terraform
terraform init
terraform apply
```

## Stop when done

When migration is finished the agent replies `BUN_NATIVE_DTS_DONE` and no-ops later runs. Then disable the automation in the dashboard (or `terraform destroy`).
