# Chrome Automation Prompt — Social Snowball Weekly Pull

This is the prompt to paste into **Claude in Chrome** every Monday after you've
opened a tab on Social Snowball where you're already logged in.

---

## Step 0: Get this week's dates

Run this in a terminal first:

```
python week_dates.py
```

It will print last week's Monday-Sunday range in `M/D/YYYY` format. Copy that
date range and substitute it into the prompt below (two places).

---

## The Prompt

> On the Social Snowball tab (https://app.socialsnowball.io), do the following
> and report back the values you collected. **Do not type a password — assume
> I'm already logged in.** If a login screen appears at any point, stop and
> tell me to log in.
>
> ### Step 1 — Export the per-conversion CSV
>
> 1. Navigate to **Reports** → **Affiliates** tab.
> 2. Click **Date Range**. In the "Choose a date range..." input, enter
>    `<<START_DATE>> - <<END_DATE>>` (e.g. `4/20/2026 - 4/26/2026`). Click **Apply**.
> 3. Wait for the table to refresh. Confirm the chip
>    `DATE RANGE: <<START_DATE>> - <<END_DATE>>` appears under the filters.
> 4. Click the **Export** button (top-right).
> 5. In the **Export raw data** dialog:
>    - Confirm the **Export type** dropdown is set to **Conversions**.
>    - Confirm all 9 field checkboxes are checked (Affiliate ID, Affiliate first
>      name, Affiliate last name, Order ID, Conversion date, Total revenue,
>      Payout method, Commission, Payable status).
>    - Confirm **Applied filters** shows `DATE RANGE: <<START_DATE>> - <<END_DATE>>`.
>    - Click **Export**.
> 6. The CSV will land in my Downloads folder. Move it to my
>    `im8-weekly-report` folder. Tell me the final filename.
>
> ### Step 2 — Read the Analytics dashboard
>
> 1. Navigate to **Analytics** → **Programs** tab.
> 2. Click **Date Range**, enter the same range
>    `<<START_DATE>> - <<END_DATE>>`, click **Apply**.
> 3. Wait for the tiles to refresh. Read these values and report them back:
>    - **Orders**
>    - **Average Order Value**
>    - **New Affiliates**  ← this is the number I need for the report
>    - **Commissions**
>    - **One-Time Payments**
>
> ### Step 3 — Hand off to the script
>
> Once the CSV is in the folder and you've given me the New Affiliates number,
> tell me the exact command I should run, e.g.:
>
> ```
> python weekly_report.py --new-affiliates <<NEW_AFFILIATES>>
> ```
>
> ### Failure cases
>
> If at any step:
> - The login screen appears → stop, tell me to log in.
> - A 2FA prompt appears → stop, tell me to handle 2FA.
> - The date range chip doesn't update → stop, tell me what you see.
> - The Export dialog has different fields than described → stop, screenshot
>   what you see and tell me.
> - A CAPTCHA appears → stop, tell me to solve it.

---

## After the Chrome run

You'll have:
- A fresh `conversions-export-*.csv` in `A:\Python\im8-weekly-report`
- The "New Affiliates" number Claude in Chrome read off the dashboard

Run:

```
python weekly_report.py --new-affiliates <NUMBER_FROM_DASHBOARD>
```

The script auto-finds the newest CSV and writes
`Weekly_Report_<MONDAY>.docx` into the same folder.
