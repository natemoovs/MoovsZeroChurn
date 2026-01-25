# Slack Reference

Central reference for Slack user IDs and channel IDs. **Always use this file when sending Slack messages.**

## Member Lookup

All active Slack members are stored in:

```
knowledge/team/slack-members.csv
```

**CSV columns:** username, email, status, billing-active, has-2fa, has-sso, userid, fullname, displayname

### Quick User ID Reference

| Name                 | User ID     | Email                     |
| -------------------- | ----------- | ------------------------- |
| Amir Ghorbani        | U0XU5AB35   | amir@swoopapp.com         |
| Tyler Montz          | U0YAK5481   | tyler@theswoopapp.io      |
| Peter Evenson        | U0YGNGQ13   | peter@swoopapp.com        |
| Ruben Schultz        | UCX9GF8BS   | ruben@swoopapp.com        |
| Joan Badia           | U073U0TAEB1 | joan@moovsapp.com         |
| Aaron                | U02E7TA2678 | aaron@swoopapp.com        |
| Chris Behan          | U078QQA0D9R | chris@moovsapp.com        |
| Marton Szots         | U010TLSMQH1 | m@szotsmarton.com         |
| Kelvin Quintanilla   | UE8EC94Q4   | kelvin@laxviplimo.com     |
| Sofia Mugica         | UKPC2EPPA   | sofia@swoopapp.com        |
| Kimberly Lin         | U02C532F0ES | kimberly@swoopapp.com     |
| Alex Merced          | U02KYCP31PE | alex@swoopapp.com         |
| Austin Kelly         | U02URS46EUF | austin@swoopapp.com       |
| Justin Dai           | U03HJTE629W | justin@swoopapp.com       |
| Jeffrey Sassone      | U040UDGMJQP | jeffrey@swoopapp.com      |
| Azul Aldao           | U04M8CD3R4L | azul@swoopapp.com         |
| Jorrit               | U05KQD1C119 | jorrit@swoopapp.com       |
| Jonathan Esller      | U05NX5W4VKN | jonathan.esller@gmail.com |
| Isabel Bathan        | U06CDL38DT6 | isabel@swoopapp.com       |
| Maria Pavlovsky      | U06MBE5UE15 | maria@swoopapp.com        |
| Mark Esller          | U0700BDD61F | mark@swoopapp.com         |
| Matias               | U0734S143GV | matias@swoopapp.com       |
| Kate Co              | U0788M9QS8P | katexnc@gmail.com         |
| Santiago Lopez Gallo | U07E8AXD456 | santiago@moovsapp.com     |
| Pol Cervantes        | U07F6335QP4 | johnpaul@moovsapp.com     |
| Sebastian Contreras  | U08KPF0JE00 | sebastian@moovsapp.com    |
| Arwen                | U098ENG90MD | arwen@moovsapp.com        |
| Mike Bieronski       | U09DPRLH82Y | mike.bieronski@gmail.com  |
| Nate Bullock         | U0A6AQPRJ1W | nate@moovsapp.com         |
| Andrea Montealegre   | U0A7R7XFKB7 | andrea@moovsapp.com       |
| Ramin                | UE6LK1HR6   | raminschultz@gmail.com    |

## Channel Reference

| Channel              | ID          | Purpose                        |
| -------------------- | ----------- | ------------------------------ |
| #moovs-factory       | C0A7A5PEXRP | Claude Code session summaries  |
| #general             | CK24K9GHK   | Company-wide announcements     |
| #moovs_team          | C010NCG8H4P | Product team discussions       |
| #moovs_design        | CCS5PNWPL   | Design discussions with Marton |
| #bugs_life           | C3RHQQKG8   | Bug reports                    |
| #feature_request     | CA0D02L02   | Feature requests               |
| #knowledge           | CK25M6ED6   | Knowledge sharing              |
| #love                | C0109KLQ1RS | Team appreciation              |
| #moovs_alerts        | CJQMSV2HH   | System alerts                  |
| #businessdevelopment | CK4ACBD4N   | Sales/BD discussions           |

## Usage

### Mentioning Users

To mention a user in a Slack message, use: `<@USER_ID>`

Example: `<@U0XU5AB35>` mentions Amir

### Posting to Channels

Use the channel ID (not the name) when posting messages via API/MCP tools.

Example: Post to #moovs-factory using channel ID `C0A7A5PEXRP`

### Looking Up Users

If you need to find a user ID not in the quick reference:

```bash
grep "search_term" knowledge/team/slack-members.csv
```

---

_Last updated: January 2026_
