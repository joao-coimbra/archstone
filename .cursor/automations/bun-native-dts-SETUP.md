# Setup: Bun native dts migration automation

Cloud Automations run on Cursor’s servers — your laptop can be off.

## Create (dashboard)

1. Open https://cursor.com/automations/new
2. **Name:** `bun-native-dts-migration`
3. **Trigger:** Scheduled → cron `0 15 * * 1` (Mondays 12:00 America/Sao_Paulo)
4. **Repository:** `joao-coimbra/archstone` (single repo), branch `main` (or the prep branch until #71 merges)
5. **Tools:** enable pull request creation
6. **Prompt:** paste the body from [`bun-native-dts-PROMPT.md`](./bun-native-dts-PROMPT.md) (everything under the horizontal rule)
7. Save and activate

## Stop when done

Agents cannot flip the automation off via API. The prompt ends with `BUN_NATIVE_DTS_DONE` when migration is finished or already applied — then disable the automation on its detail page in the dashboard (or destroy the Terraform resource if you manage it that way).

Until then, failed weeks are a one-line status only.
