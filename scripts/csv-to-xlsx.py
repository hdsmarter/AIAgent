#!/usr/bin/env python3
"""csv-to-xlsx.py — Convert GAS-exported CSV to xlsx with proper types.

Usage: python3 csv-to-xlsx.py <input.csv> <output.xlsx>

Design decisions:
  - All columns read as str first (preserves ROC dates like 1130215)
  - Known numeric columns converted to float (same list as _utils.py)
  - openpyxl engine for Excel compatibility
"""
import sys
from pathlib import Path

import pandas as pd

# Same numeric columns as _utils.py — keep in sync
NUMERIC_COLS = [
    "qty", "price", "mny", "mnyb", "itbuypri", "itprice",
    "itcost", "xa1par", "RealCost", "lowestsaleprice",
    "itqtyf", "itqty", "cudisc", "gross_profitrate",
    "prs", "rate", "taxprice", "priceb", "taxpriceb",
    "taxmnyf", "taxmnyb", "taxmny", "totmny", "totmnyb",
    "tax", "taxb", "discount", "qtyout", "qtyin", "qtyNotOut", "qtyNotIn",
    "transport", "tranpar", "premium", "prempar", "tariff", "taripar",
]

# cost_item has monthly columns: begqty01..24, begcost01..24, etc.
COST_PREFIXES = ["begqty", "begcost", "addqty", "addcost", "avgcost"]


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.csv> <output.xlsx>", file=sys.stderr)
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    xlsx_path = Path(sys.argv[2])

    if not csv_path.exists():
        print(f"Error: {csv_path} not found", file=sys.stderr)
        sys.exit(1)

    # Read CSV with all values as string (GAS exports everything as string)
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)

    # Convert known numeric columns
    for col in df.columns:
        if col in NUMERIC_COLS:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        elif any(col.startswith(prefix) for prefix in COST_PREFIXES):
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Write xlsx
    xlsx_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(xlsx_path, index=False, engine="openpyxl")

    print(f"Converted: {csv_path.name} → {xlsx_path.name} ({len(df)} rows, {len(df.columns)} cols)",
          file=sys.stderr)


if __name__ == "__main__":
    main()
