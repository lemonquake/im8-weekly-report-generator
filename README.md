# IM8 Weekly Affiliate Report — Workflow

End-to-end pipeline for the weekly Social Snowball affiliate report.

## What's in this folder

| File                              | Purpose                                              |
|-----------------------------------|------------------------------------------------------|
| `weekly_report.py`                | Main script — terminal report + .docx generation     |
| `week_dates.py`                   | Prints last week's Mon-Sun dates in M/D/YYYY format  |
| `CHROME_PROMPT.md`                | Prompt to paste into Claude in Chrome each Monday    |
| `placeholders_reference.md`       | Placeholders for filling your existing .docx template|
| `README.md`                       | This file                                            |
| `conversions-export-*.csv`        | Weekly CSVs from Social Snowball (drop them here)    |
| `Weekly_Report_<DATE>.docx`       | Generated weekly reports                             |
| `WEEKLY REPORT STRUCTURE.docx`    | (optional) Your template, if using `--template` mode |

## One-time setup

Install Python deps:

```
pip install pandas python-docx
```

That's it.

## Weekly checklist (every Monday)

### 1. Get last week's dates

```
python week_dates.py
```

Copy the printed Mon-Sun range (e.g. `4/20/2026 - 4/26/2026`).

### 2. Pull data from Social Snowball

Open Social Snowball in Chrome (already logged in). Open Claude in Chrome.
Paste the prompt from `CHROME_PROMPT.md`, replacing `<<START_DATE>>` and
`<<END_DATE>>` with the dates from step 1.

Claude will:
- Set the Date Range and apply it
- Click Export → choose Conversions → save the CSV to this folder
- Open Analytics → Programs, set the same date range, and read back the
  **New Affiliates** number (plus the other tile values for sanity checking)

### 3. Generate the report

```
python weekly_report.py --new-affiliates <NUMBER_FROM_DASHBOARD>
```

This will:
- Auto-find the newest `conversions-export*.csv` in this folder
- Use the actual date span in the CSV as the reporting period (so a
  Mon-Fri export gets a Mon-Fri report; force a Mon-Sun week with
  `--week YYYY-MM-DD`)
- Pick the highest-revenue affiliate as Top 1 (override with `--top1 "Name"`)
- Print the report to the terminal
- Generate `Weekly_Report_<START_DATE>.docx` in this folder

### 4. (Optional) Fill your existing template instead

If you'd rather have the script populate your existing
`WEEKLY REPORT STRUCTURE.docx` (with placeholders inserted — see
`placeholders_reference.md`):

```
python weekly_report.py --template "WEEKLY REPORT STRUCTURE.docx" --new-affiliates 47
```

### 5. Sanity check

Cross-check the script's totals against the Analytics tiles Claude in Chrome
read back in step 2. They should match. If they don't, the date range in
Reports vs Analytics may be off.

## Common commands

```
# Auto-everything (newest CSV, auto-detect week, auto-pick Top 1)
python weekly_report.py

# Explicit week
python weekly_report.py --week 2026-04-20

# Explicit Top 1
python weekly_report.py --top1 "James DiNicolantonio"

# Explicit CSV file
python weekly_report.py --csv conversions-export-1777527523.csv

# Manual new-affiliates count from dashboard
python weekly_report.py --new-affiliates 47

# Skip Word doc, terminal-only
python weekly_report.py --no-docx

# Use template mode
python weekly_report.py --template "WEEKLY REPORT STRUCTURE.docx"
```

## How "new affiliates" is computed

By default the script counts an affiliate as **new** if their Affiliate ID
appears in this week's CSV but in **none** of the older `conversions-export*.csv`
files in this folder. This is "first-converting affiliate," which is **not**
the same as Social Snowball's "New Affiliates" tile (which counts new
**sign-ups**).

If those two numbers disagree, trust the dashboard tile — pass it via
`--new-affiliates`. Keeping older CSVs in this folder makes the auto-detect
more accurate over time.

## Troubleshooting

**"No CSV found"** — Drop the SS export into this folder, or pass `--csv`.

**"No data found for week …"** — The CSV doesn't contain that week's data.
Either the SS export's date range was different from what you expected, or
`--week` is wrong. Check the printed CSV span.

**Top 1 found by mistake** — The script picks the highest-revenue affiliate.
If that's the wrong one for your "without Top 1" comparison, override with
`--top1 "Full Name"` (must match the CSV's First + Last Name exactly).

**python-docx not installed** — `pip install python-docx`.

**Template placeholders not replaced** — Make sure the placeholder is on a
line by itself (or in its own table cell) and is spelled exactly as in
`placeholders_reference.md`, including the double curly braces.

## What's NOT automated yet (future work)

- **Login to Social Snowball.** You stay logged in manually; Claude in Chrome
  uses your existing session.
- **Scheduling.** You run the Chrome prompt and the script manually each
  Monday. A scheduled-task wrapper is doable later.
- **Distribution.** The .docx lands in this folder; you still send/share it.
- **Social Snowball API.** If SS exposes an API key, this whole Chrome step
  could be replaced with a single HTTP request — much more reliable. Worth
  asking SS support.
