---
name: jira-bug-reporter
description: >-
  Use this skill whenever the user asks to create, draft, preview, or upload QA bug reports
  to Jira (project "Internship Program 2026") with attached screenshots/F12 evidence, or
  when cross-referencing goodNstay Confluence specs before filing a Jira ticket.
---

# goodNstay Jira Bug Reporter (Confluence MCP + Inline Screenshot Uploader)

This skill connects **Atlassian Official Remote MCP** (for reading Confluence specs and searching Jira issues) with the local zero-dependency CLI [`jira_bug_reporter.py`](./scripts/jira_bug_reporter.py) (for formatting 7-field QA bug reports, uploading local `.png`/video evidence, and embedding screenshots inline inside the Jira ticket description).

## Architecture & Live Board Mapping (`optibide-org.atlassian.net`)

1. **Atlassian MCP (`atlassian` server in `~/.gemini/config/mcp_config.json`)**:
   - Authenticated headlessly via `agy mcp add --header "Authorization: Basic ..."` (26 tools verified: `getConfluenceContent`, `searchConfluence`, `getJiraIssue`, etc.).
   - Used to read approved contracts on Confluence (`https://optibide-org.atlassian.net/wiki/...`) and search existing Jira issues to avoid duplicates.
2. **Local Python Uploader ([`scripts/jira_bug_reporter.py`](./scripts/jira_bug_reporter.py))**:
   - **Target Mapping:** **"Internship Program 2026"** is **Scrum Board `#135`** inside Jira Project **`Optibide` (`OP`)**, filtered by `Filter 10233` (`project = OP AND issuetype IN (Bug[10009], ...) AND assignee IN (...)`).
   - **Auto-Visibility:** `JIRA_AUTO_ASSIGN_SELF=true` automatically sets `assignee` to the reporter's `accountId` (`Nguyen Bao Minh`) on creation so tickets immediately appear on **Board `#135` (`Internship Program 2026`)**, and automatically skips `labels` when not present on `OP`'s `Bug` Create Screen.
   - **Full `OP` Custom Tab Population (`Reporting` / `Expectation` / `RCA`):** Automatically populates all 12 `OP` structured fields (`customfield_10053` Environment, `customfield_10170` Pre-condition, `customfield_10135` Step-by-step, `customfield_10137` Actual Result, `customfield_10136` Expected Result, `customfield_10057` UI References, `customfield_10049` Signals and Clues, `customfield_10051` Detailed Analysis, `customfield_10004` Impact, `customfield_10038` Platform, `customfield_10039` Original Source Location, and `priority`) alongside `description`.
   - Uploads binary `.png`/`.mp4` files via `POST /rest/api/3/issue/{key}/attachments`, extracts pixel dimensions + Atlassian Media UUIDs, and embeds screenshots directly inside `description`, `UI References`, and `Detailed Analysis`.

## Mandatory Workflow

1. **Check Credentials Once (when needed):**
   Run connection & project discovery verification:
   ```bash
   python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/jira-bug-reporter/scripts/jira_bug_reporter.py --verify
   ```
   If `JIRA_API_TOKEN` is not yet configured in `/Users/iannwendy/Desktop/goodNstay/.env.jira`, ask the user to paste their Personal API Token from `https://id.atlassian.com/manage-profile/security/api-tokens`.

2. **Cross-Check Confluence & Existing Issues (Optional / Recommended):**
   - If the `atlassian` MCP tools are available, check relevant Confluence specs (`166952975` Accommodation route, `165937257` Payment & Localization Contract, `171376745` Design Standards) to set accurate `expected_result` and `classification` (`Needs Verification — (need to brainstorming with team or observe)` vs `Confirmed Bug`).

3. **Prepare JSON Payload (One Issue – One Report):**
   Save a JSON file (e.g. in `/Users/iannwendy/Desktop/goodNstay/bug_report_3-11-2026/` or conversation scratch) matching [`examples/sample_bug.json`](./examples/sample_bug.json):
   - `title` *(required, <= 255 chars)*: `<Component/Action> + <Actual Problem> + <Context>`
   - `environment` *(required)*: `<Env> · <Device/Viewport> · <Browser> · <Locale>`
   - `steps_to_reproduce` *(required, array of strings)*: Numbered atomic steps
   - `actual_result` *(required)*: Objective observed behavior only
   - `expected_result` *(required)*: Expected behavior grounded in contract/runtime
   - `evidence` *(required, object)*: `url`, `datetime`, `console` (F12 Console), `network` (F12 Network), optional `reference_url`
   - `classification` *(defaults to `Needs Verification — (need to brainstorming with team or observe)`)*
   - `attachments` *(array of file paths)*: Full or relative paths to `.png` / `.mp4` evidence files

4. **Run Safe Preview First (`dry-run` default):**
   ```bash
   python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/jira-bug-reporter/scripts/jira_bug_reporter.py \
     --input /path/to/bug_payload.json
   ```
   Show the preview summary to the user and **wait for user approval** unless the user explicitly instructed to post immediately.

5. **Publish Live Ticket with Inline Screenshots (`--confirm`):**
   Only after user confirmation:
   ```bash
   python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/jira-bug-reporter/scripts/jira_bug_reporter.py \
     --input /path/to/bug_payload.json --confirm
   ```
   - To update/backfill an existing Jira ticket without creating a duplicate, pass `--update OP-XXXX --confirm`.
   - For multi-bug batches, check `GET /rest/agile/1.0/board/135/issue` by `summary` before creating, persist each created key immediately to `uploaded_jira_tickets.json`, and verify live on Board `#135` (`on_board == True`, attachment count, inline media count, and custom fields) before reporting completion.
   - Report back the returned `issue_key` and clickable `issue_url` (`https://optibide-org.atlassian.net/browse/<KEY>`).
