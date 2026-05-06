# Template Placeholders Reference

If you'd rather have the script fill in your **existing** Weekly Report
Structure document instead of generating a new one, edit
`WEEKLY REPORT STRUCTURE.docx` and replace the relevant numbers/labels with
the placeholder strings below. Then run:

```
python weekly_report.py --template "WEEKLY REPORT STRUCTURE.docx"
```

The script will read the template, do a find-and-replace on every placeholder
it recognises (in both paragraphs and table cells), and save the filled-in
copy as `Weekly_Report_<MONDAY>.docx`.

## Supported placeholders

### Date / week
| Placeholder       | Replaced with                              |
|-------------------|--------------------------------------------|
| `{{WEEK_LABEL}}`  | e.g. `Apr 20 – Apr 26, 2026`               |
| `{{WEEK_START}}`  | e.g. `2026-04-20`                          |
| `{{WEEK_END}}`    | e.g. `2026-04-26`                          |
| `{{GENERATED_AT}}`| Timestamp the report was produced          |

### Overall totals
| Placeholder              | Replaced with               |
|--------------------------|-----------------------------|
| `{{REVENUE}}`            | e.g. `$78,940.92`           |
| `{{COMMISSION}}`         | e.g. `$12,345.67`           |
| `{{PROFIT}}`             | e.g. `$66,595.25`           |
| `{{CONVERSIONS}}`        | e.g. `2,607`                |
| `{{ACTIVE_AFFILIATES}}`  | e.g. `45`                   |
| `{{NEW_AFFILIATES}}`     | e.g. `47`                   |

### Without Top 1
| Placeholder                  | Replaced with               |
|------------------------------|-----------------------------|
| `{{REVENUE_EXCL}}`           | Revenue excluding Top 1     |
| `{{COMMISSION_EXCL}}`        | Commission excluding Top 1  |
| `{{PROFIT_EXCL}}`            | Profit excluding Top 1      |
| `{{CONVERSIONS_EXCL}}`       | Conversions excluding Top 1 |
| `{{ACTIVE_AFFILIATES_EXCL}}` | Active affiliates excluding |

### Top 1 affiliate
| Placeholder            | Replaced with                |
|------------------------|------------------------------|
| `{{TOP1_NAME}}`        | e.g. `James DiNicolantonio`  |
| `{{TOP1_REVENUE}}`     | Top 1's revenue              |
| `{{TOP1_COMMISSION}}`  | Top 1's commission           |
| `{{TOP1_PROFIT}}`      | Top 1's profit               |
| `{{TOP1_CONVERSIONS}}` | Top 1's conversions          |

### Leaderboard table

Place `{{LEADERBOARD_TABLE}}` on its own paragraph (own line) where you want
the full ranked leaderboard inserted. The script will replace it with a real
Word table containing every active affiliate for the week, sorted by revenue,
with the Top 1 marked.

## Example template snippet

```
Weekly Affiliate Report
{{WEEK_LABEL}}

Overall Totals
- Revenue: {{REVENUE}}
- Commission: {{COMMISSION}}
- Profit: {{PROFIT}}
- Conversions: {{CONVERSIONS}}
- Active Affiliates: {{ACTIVE_AFFILIATES}}
- New Affiliates Onboarded: {{NEW_AFFILIATES}}

Without Top 1 ({{TOP1_NAME}})
- Revenue: {{REVENUE_EXCL}}
- Commission: {{COMMISSION_EXCL}}
- Profit: {{PROFIT_EXCL}}

Leaderboard:
{{LEADERBOARD_TABLE}}

Generated: {{GENERATED_AT}}
```

## Tip

If your template is a **table** with a column for last week and another for
this week, you can put placeholders inside individual cells — the script
replaces inside table cells too.
