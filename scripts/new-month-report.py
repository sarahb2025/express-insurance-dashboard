#!/usr/bin/env python3
"""
Generate a new monthly report from the master template (index.html).

Usage:
    python3 scripts/new-month-report.py 2026 7
    python3 scripts/new-month-report.py 2026 8

This creates reports/YYYY-MM/index.html (a self-contained copy of the master,
pointed at ../../assets and its own local data.json) and, if missing, a fillable
placeholder reports/YYYY-MM/data.json. The master is never modified.

Nothing is fabricated: the generated report renders clearly-labelled
"awaiting data" placeholders (placeholder:true) until real figures are supplied.
See reports/<month>/README.md and docs/DATA-SOURCES.md.
"""
import json
import os
import re
import sys
import calendar

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December']


def die(msg):
    sys.exit(f"ERROR: {msg}")


def sub(pattern, repl, s, what, count=1, flags=0):
    s2, n = re.subn(pattern, lambda m: repl, s, count=count, flags=flags)
    if n != count:
        die(f"substitution [{what}] expected {count}, got {n} — the master template may have changed.")
    return s2


def main():
    if len(sys.argv) != 3:
        die("usage: new-month-report.py <year> <month-number>")
    year, mon = int(sys.argv[1]), int(sys.argv[2])
    if not (1 <= mon <= 12):
        die("month must be 1-12")

    label = f"{MONTHS[mon]} {year}"                       # "July 2026"
    ym = f"{year:04d}-{mon:02d}"                           # "2026-07"
    ndays = calendar.monthrange(year, mon)[1]
    pmon, pyear = (mon - 1, year) if mon > 1 else (12, year - 1)
    pdays = calendar.monthrange(pyear, pmon)[1]
    period = f"1 – {ndays} {MONTHS[mon]} {year}"
    compare = f"1 – {pdays} {MONTHS[pmon]} {pyear}"
    start_iso, end_iso = f"{ym}-01", f"{ym}-{ndays:02d}"

    master = open(os.path.join(REPO, 'index.html'), encoding='utf-8').read()
    src = master

    # 1) DEFAULT_DATA -> placeholder for this month
    placeholder = (
        'var DEFAULT_DATA = {\n'
        f'  "_note": "{label} reporting month — PLACEHOLDER dataset. placeholder:true renders clearly-labelled \'awaiting data\' cells and fabricates nothing until real feeds/inputs are supplied.",\n'
        '  "placeholder": true,\n'
        '  "pmaxNote": "Awaiting Google Ads",\n'
        f'  "monthOrder": ["{label}"],\n'
        '  "months": {\n'
        f'    "{label}": {{ "periodLabel": "{period}", "compareLabel": "{compare}", "kpi": {{}}, "stats": {{}}, "campaigns": [], "geo": {{ "periodLabel": "{period}", "locations": [] }} }}\n'
        '  },\n'
        '  "last30": { "periodLabel": "Last 30 days", "compareLabel": "Previous 30 days", "kpi": {}, "stats": {}, "campaigns": [], "geo": { "locations": [] } },\n'
        '  "custom": { "dailyRates": {}, "campaignDailyRates": {}, "geoDailyRates": {}, "monthFactor": {} }\n'
        '};\n'
        'var DATA = DEFAULT_DATA;'
    )
    src = sub(r'var DEFAULT_DATA = \{.*?\n\};\nvar DATA = DEFAULT_DATA;', placeholder, src, "DEFAULT_DATA", flags=re.S)

    # 2) asset paths -> ../../assets
    src = sub(r'assets/express-insurance-logo-new\.png', '../../assets/express-insurance-logo-new.png', src, "express logo")
    src = sub(r'assets/balmer-agency-logo\.png', '../../assets/balmer-agency-logo.png', src, "balmer logo")

    # 3) banner master -> report
    master_banner = ('<!-- REPORT-KIND BANNER — this file is the reusable MASTER TEMPLATE.\n'
                     '     The per-month report (reports/YYYY-MM/index.html) overrides this to the green "report" banner. -->\n'
                     '<div class="tpl-banner master" id="tpl-banner">\n'
                     '  <span class="tpl-tag">Master template</span>\n'
                     "  <span>Reusable monthly-report template. Do not enter a specific month's figures here — duplicate it into <code>reports/YYYY-MM/</code> for each reporting month. See <code>README.md</code>.</span>\n"
                     '</div>')
    report_banner = (f'<!-- REPORT-KIND BANNER — this is the {label} reporting-month report, generated from the master template. -->\n'
                     '<div class="tpl-banner report" id="tpl-banner">\n'
                     '  <span class="tpl-tag">Reporting month</span>\n'
                     f"  <span><strong>{label}</strong> — Google Ads and GA4 figures are pulled live. Kirsten's manual commentary and the Looker budget split may remain pending. See <code>reports/{ym}/README.md</code>.</span>\n"
                     '</div>')
    src = sub(re.escape(master_banner), report_banner, src, "banner")

    # 4) month-select options -> single option for this month
    opts = ('<select id="month-select" class="ctrl-select" onchange="onMonthChange()">\n'
            '      <option>June 2026</option>\n'
            '      <option>May 2026</option>\n'
            '      <option>April 2026</option>\n'
            '      <option>March 2026</option>\n'
            '      <option>February 2026</option>\n'
            '    </select>')
    opts_new = ('<select id="month-select" class="ctrl-select" onchange="onMonthChange()">\n'
                f'      <option>{label}</option>\n'
                '    </select>')
    src = sub(re.escape(opts), opts_new, src, "month-select")

    # 5) title / header date / footer date
    src = sub(r'<title>Express Insurance — SEM Strategy</title>',
              f'<title>Express Insurance — SEM Strategy · {label}</title>', src, "title")
    src = sub(r'<span class="hdr-date" id="hdr-date-latest">May 2026</span>',
              f'<span class="hdr-date" id="hdr-date-latest">{label}</span>', src, "hdr date")
    src = sub(r'Balmer Agency · Express Insurance SEM Strategy · May 2026',
              f'Balmer Agency · Express Insurance SEM Strategy · {label}', src, "footer date")

    # 6) curMonth init
    src = sub(r"var curMode = 'monthly', curMonth = 'June 2026'",
              f"var curMode = 'monthly', curMonth = '{label}'", src, "curMonth init")

    # 7) MONTH_RANGES -> single month
    mr = ("var MONTH_RANGES = {\n"
          "  'June 2026': ['2026-06-01', '2026-06-30'],\n"
          "  'May 2026': ['2026-05-01', '2026-05-31'],\n"
          "  'April 2026': ['2026-04-01', '2026-04-30'],\n"
          "  'March 2026': ['2026-03-01', '2026-03-31'],\n"
          "  'February 2026': ['2026-02-01', '2026-02-28']\n"
          "};")
    mr_new = ("var MONTH_RANGES = {\n"
              f"  '{label}': ['{start_iso}', '{end_iso}']\n"
              "};")
    src = sub(re.escape(mr), mr_new, src, "MONTH_RANGES")

    outdir = os.path.join(REPO, 'reports', ym)
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8').write(src)

    # fillable placeholder data.json (only if it does not already exist — never clobber real data)
    data_path = os.path.join(outdir, 'data.json')
    if not os.path.exists(data_path):
        data = {
            "_schema": f"{label} reporting-month data feed. FILLABLE TEMPLATE. While placeholder=true the dashboard renders 'awaiting data' cells and fabricates nothing. To publish: set placeholder=false and fill every field from the correct source (see docs/DATA-SOURCES.md).",
            "placeholder": True,
            "pmaxNote": "Awaiting Google Ads",
            "monthOrder": [label],
            "months": {
                label: {
                    "_source": "kpi/stats/campaigns/geo = GOOGLE ADS (source of truth).",
                    "periodLabel": period, "compareLabel": compare,
                    "kpi": {"accountRoas": None, "nonBrand": None, "bestName": None, "bestRoas": None,
                            "pmaxRoas": None, "convValue": None, "convValueNote": period},
                    "stats": {k: {"v": None, "chg": None} for k in
                              ["impressions", "clicks", "conversions", "convValue", "cost", "cpc"]},
                    "campaigns": [
                        {"key": "brand", "cost": None, "conv": None, "cpa": None, "convValue": None, "roas": None},
                        {"key": "pmax", "cost": None, "conv": None, "cpa": None, "convValue": None, "roas": None},
                        {"key": "pi", "cost": None, "conv": None, "cpa": None, "convValue": None, "roas": None},
                        {"key": "acct", "cost": None, "conv": None, "cpa": None, "convValue": None, "roas": None},
                        {"key": "pl", "cost": None, "conv": None, "cpa": None, "convValue": None, "roas": None},
                        {"key": "eng", "paused": True},
                        {"key": "dg", "paused": True, "cost": None},
                    ],
                    "geo": {"_source": "GOOGLE ADS geographic report (NOT GA4).",
                            "periodLabel": f"All campaigns · {period} · User location (Google Ads)",
                            "locations": []},
                }
            },
            "last30": {"periodLabel": "Last 30 days", "compareLabel": "Previous 30 days",
                       "kpi": {}, "stats": {}, "campaigns": [], "geo": {"locations": []}},
            "custom": {"dailyRates": {}, "campaignDailyRates": {}, "geoDailyRates": {}, "monthFactor": {}},
        }
        open(data_path, 'w').write(json.dumps(data, indent=2))
        print(f"wrote reports/{ym}/data.json (placeholder)")
    else:
        print(f"kept existing reports/{ym}/data.json (not overwritten)")

    print(f"wrote reports/{ym}/index.html ({len(src)} bytes) for {label}")


if __name__ == '__main__':
    main()
