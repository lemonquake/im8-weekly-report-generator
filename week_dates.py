#!/usr/bin/env python3
"""
Print last week's date range (Mon-Sun) in the format Social Snowball expects
(M/D/YYYY). Useful for pasting into the Chrome prompt or the SS date picker.

USAGE:
    python week_dates.py            # last completed Mon-Sun
    python week_dates.py --offset 0 # this week (Mon to today)
    python week_dates.py --offset 2 # two weeks ago
"""
import argparse
from datetime import date, timedelta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offset", type=int, default=1,
                        help="How many weeks back (1=last week, 0=this week)")
    args = parser.parse_args()

    today = date.today()
    this_monday = today - timedelta(days=today.weekday())
    start = this_monday - timedelta(weeks=args.offset)
    end = start + timedelta(days=6)

    fmt = lambda d: f"{d.month}/{d.day}/{d.year}"
    print(f"Mon-Sun (M/D/YYYY): {fmt(start)} - {fmt(end)}")
    print(f"ISO              : {start.isoformat()} to {end.isoformat()}")
    print()
    print("Paste this into the Social Snowball Date Range picker:")
    print(f"  {fmt(start)} - {fmt(end)}")


if __name__ == "__main__":
    main()
