import io
from datetime import datetime
from typing import List, Dict, Any

from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName

# Ensure these exist in backend.utils.constants
from backend.utils.constants import (
    INSTITUTION_LIST,
    ACCOUNT_TYPES,             # kept for compatibility
    ACCOUNT_CATEGORIES,
    ACCOUNT_TYPES_BY_CATEGORY, # dict[str, list[str]]
    CASH_ACCOUNT_TYPES,        # list[str] like ["Checking","Savings","Money Market","CD"]
)

class ExcelTemplateService:
    """
    Service for generating Excel import templates (Accounts + Positions).

    This keeps your existing Accounts template behavior and upgrades the
    Positions template so workbook-level named ranges are created FIRST,
    and all DataValidations reference them via "=Name" so Excel does not
    strip/repair the validations on open.
    """

    def __init__(self):
        # Styles
        self.header_font = Font(bold=True, color="FFFFFF", size=11)
        self.header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
        self.header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        self.left_align = Alignment(horizontal="left", vertical="center")
        self.center_align = Alignment(horizontal="center", vertical="center")

        thin = Side(border_style="thin", color="D0D3D4")
        self.border = Border(left=thin, right=thin, top=thin, bottom=thin)

        self.required_fill = PatternFill(start_color="FFF9C4", end_color="FFF9C4", fill_type="solid") # pale yellow
        self.sample_fill   = PatternFill(start_color="E3F2FD", end_color="E3F2FD", fill_type="solid") # light blue

    # ==========================================================
    # ACCOUNTS TEMPLATE (your original logic preserved as-is)
    # ==========================================================
    def create_accounts_template(self) -> io.BytesIO:
        wb = Workbook()
        wb.remove(wb.active)

        # Create sheets in order
        start = self._create_accounts_start_here_sheet(wb)
        data  = self._create_accounts_data_sheet(wb)
        cats  = self._create_category_type_reference_sheet(wb)
        look  = self._create_validation_lists_sheet(wb)

        # Add data validations for Accounts sheet (as you had)
        self._add_institution_validation(data)
        self._add_category_validation(data)
        self._add_account_type_validation(data)

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out

    # ---------- ACCOUNTS helper sheets ----------

    def _create_accounts_start_here_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("📋 START HERE", 0)

        ws.merge_cells("A1:E1")
        ws["A1"] = "NestEgg — Accounts Import"
        ws["A1"].font = Font(bold=True, size=14)
        ws["A1"].alignment = self.center_align
        ws["A1"].fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")

        lines = [
            "",
            "How this works",
            "• Fill in the Accounts tab with your institutions, categories, and types",
            "• Use the in-cell dropdowns for Category and Account Type",
            "• Category-Type Reference shows what's available per category",
            "",
            "Columns",
            "• Account Name: e.g., 'Schwab Brokerage - Dan' or 'Ally Joint Savings'",
            "• Institution: Where the account is held",
            "• Account Category: e.g., Brokerage, Retirement, Cash, etc.",
            "• Account Type: e.g., Roth IRA, Traditional IRA, Checking, HSA",
            "",
            "After importing accounts, you can download a Positions template customized with your accounts."
        ]
        row = 3
        for t in lines:
            ws.merge_cells(f"A{row}:E{row}")
            ws[f"A{row}"] = t
            ws[f"A{row}"].alignment = self.left_align
            row += 1

        ws.column_dimensions["A"].width = 26
        ws.column_dimensions["B"].width = 24
        ws.column_dimensions["C"].width = 22
        ws.column_dimensions["D"].width = 24
        ws.column_dimensions["E"].width = 40
        return ws

    def _create_accounts_data_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Accounts", 1)

        headers = ["Account Name*", "Institution*", "Account Category*", "Account Type*", "Notes"]
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=1, column=i, value=h)
            c.font = self.header_font
            c.fill = self.header_fill
            c.alignment = self.header_alignment
            c.border = self.border

        widths = {"A": 30, "B": 24, "C": 22, "D": 26, "E": 40}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        # Example rows
        examples = [
            ["Schwab Brokerage - Dan", "Charles Schwab", "Brokerage", "Individual", ""],
            ["Fidelity 401k", "Fidelity", "Retirement", "401k", ""],
            ["Ally Joint Savings", "Ally Bank", "Cash", "Savings", ""],
            ["Vanguard Roth IRA", "Vanguard", "Retirement", "Roth IRA", ""],
        ]
        for r_idx, row_data in enumerate(examples, start=2):
            for c_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.border = self.border
                cell.fill = self.sample_fill

        ws.freeze_panes = "A2"
        # Highlight required columns for a few initial rows
        for row in range(5, 50):
            for col in [1, 2, 3, 4]:
                ws.cell(row=row, column=col).fill = self.required_fill

        return ws

    def _create_category_type_reference_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Category-Type Reference", 2)

        ws["A1"] = "Account Category"
        ws["B1"] = "Account Type"
        ws["A1"].font = self.header_font
        ws["B1"].font = self.header_font

        row = 2
        for cat in ACCOUNT_CATEGORIES:
            types = ACCOUNT_TYPES_BY_CATEGORY.get(cat, [])
            if not types:
                types = [t for t in ACCOUNT_TYPES if t.lower().startswith(cat.lower())] or ACCOUNT_TYPES
            for t in types:
                ws.cell(row=row, column=1, value=cat).border = self.border
                ws.cell(row=row, column=2, value=t).border = self.border
                row += 1

        ws.column_dimensions["A"].width = 26
        ws.column_dimensions["B"].width = 34
        ws.freeze_panes = "A2"
        return ws

    def _create_validation_lists_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Lookups", 3)
        ws.sheet_state = 'hidden'

        # Institutions
        ws["A1"] = "Institutions"
        ws["A1"].font = self.header_font
        for i, inst in enumerate(INSTITUTION_LIST, start=2):
            ws.cell(row=i, column=1, value=inst).border = self.border
        ws.column_dimensions["A"].width = 32

        # Account Categories
        ws["C1"] = "Account Categories"
        ws["C1"].font = self.header_font
        for i, cat in enumerate(ACCOUNT_CATEGORIES, start=2):
            ws.cell(row=i, column=3, value=cat).border = self.border
        ws.column_dimensions["C"].width = 26

        # Account Types by Category — each a named range Types_<CategoryNoSpaces>
        col = 5
        for category, types in ACCOUNT_TYPES_BY_CATEGORY.items():
            safe_cat = self._safe_name(category)
            ws.cell(row=1, column=col, value=f"Types_{safe_cat}").font = self.header_font
            for i, t in enumerate(types, start=2):
                ws.cell(row=i, column=col, value=t).border = self.border
            # Define the name for this category types column
            rng = f"'Lookups'!${get_column_letter(col)}$2:${get_column_letter(col)}${1+len(types)}"
            wb.defined_names.append(DefinedName(name=f"Types_{safe_cat}", attr_text=rng))
            ws.column_dimensions[get_column_letter(col)].width = 28
            col += 1

        # Single flattened list of account types (optional)
        all_types = sorted({t for types in ACCOUNT_TYPES_BY_CATEGORY.values() for t in types})
        ws["L1"] = "All Account Types"
        ws["L1"].font = self.header_font
        for i, t in enumerate(all_types, start=2):
            ws.cell(row=i, column=12, value=t).border = self.border

        # Named ranges used by Accounts template (as in your original)
        inst_range  = f"'Lookups'!$A$2:$A${1+len(INSTITUTION_LIST)}"
        cat_range   = f"'Lookups'!$C$2:$C${1+len(ACCOUNT_CATEGORIES)}"
        types_range = f"'Lookups'!$L$2:$L${1+len(all_types)}"

        wb.defined_names.append(DefinedName(name="AccountsList_Institutions", attr_text=inst_range))
        wb.defined_names.append(DefinedName(name="AccountsList_Categories",   attr_text=cat_range))
        wb.defined_names.append(DefinedName(name="AccountTypesList",          attr_text=types_range))

        return ws

    def _add_institution_validation(self, ws: Worksheet) -> None:
        inst_range = "'Lookups'!$A$2:$A$9999"
        dv = DataValidation(type="list", formula1=inst_range, allow_blank=False)
        dv.showDropDown = False
        ws.add_data_validation(dv)
        dv.add("B2:B5000")

    def _add_category_validation(self, ws: Worksheet) -> None:
        cat_range = "'Lookups'!$C$2:$C$9999"
        dv = DataValidation(type="list", formula1=cat_range, allow_blank=False)
        dv.showInputMessage = True
        dv.promptTitle = "Account Category"
        dv.prompt = "Select the category that best fits this account"
        dv.showDropDown = False
        ws.add_data_validation(dv)
        dv.add("C2:C5000")

    def _add_account_type_validation(self, ws: Worksheet) -> None:
        # Use INDIRECT to pick the matching named range for the chosen category.
        indirect_formula = 'INDIRECT("Types_" & SUBSTITUTE(SUBSTITUTE(C2," ","")," / ",""))'
        dv = DataValidation(type="list", formula1=indirect_formula, allow_blank=False)
        dv.errorTitle = "Invalid type"
        dv.error = "Choose a type from the list linked to the selected category."
        dv.showDropDown = False
        ws.add_data_validation(dv)
        dv.add("D2:D5000")

    # ==========================================================
    # POSITIONS TEMPLATE (improved)
    # ==========================================================
    async def create_positions_template(self, user_id: Any, database) -> io.BytesIO:
        """
        Builds a 5-sheet workbook:
          1) 📋 START HERE - Instructions
          2) 📈 SECURITIES
          3) 💵 CASH
          4) 🪙 CRYPTO
          5) 🥇 METALS
        Plus a hidden Lookups sheet with lists + workbook-level names.

        All DataValidations reference workbook-level names via "=Name"
        so Excel will not strip/repair them on open.
        """
        # Fetch user accounts
        accounts_query = """
            SELECT id, account_name, institution
            FROM accounts
            WHERE user_id = :user_id
            ORDER BY account_name
        """
        accounts = await database.fetch_all(query=accounts_query, values={"user_id": user_id})
        if not accounts:
            raise ValueError("No accounts found. Please create accounts before downloading positions template.")

        # Securities (equities, funds, indexes tracked)
        securities_query = """
            SELECT ticker, company_name
            FROM securities
            WHERE asset_type IN ('security', 'index')
            AND on_yfinance = true
            ORDER BY ticker
            LIMIT 5000
        """
        securities = await database.fetch_all(query=securities_query)

        # Crypto
        crypto_query = """
            SELECT ticker, company_name
            FROM securities
            WHERE asset_type = 'crypto'
            ORDER BY ticker
            LIMIT 500
        """
        cryptos = await database.fetch_all(query=crypto_query)

        # Metals list (static or from DB)
        metals = ["Gold", "Silver", "Platinum", "Palladium"]

        wb = Workbook()
        wb.remove(wb.active)

        # Hidden Lookups with named ranges for ALL lists used below
        self._create_positions_lookups(wb, accounts, securities, cryptos, metals)

        # User-visible tabs
        self._create_master_instructions_sheet(wb)
        self._create_securities_positions_sheet(wb, accounts, securities)
        self._create_cash_positions_sheet(wb, accounts)
        self._create_crypto_positions_sheet(wb, accounts, cryptos)
        self._create_metal_positions_sheet(wb, accounts, metals)

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out

    # ---------- POSITIONS: hidden lists + workbook-level names ----------

    def _create_positions_lookups(self, wb: Workbook, accounts, securities, cryptos, metals) -> None:
        ws = wb.create_sheet("Lookups", 6)
        ws.sheet_state = "hidden"

        # Accounts (A)
        ws["A1"] = "Accounts"
        ws["A1"].font = self.header_font
        for i, a in enumerate(accounts, start=2):
            ws.cell(row=i, column=1, value=a["account_name"]).border = self.border
        acc_range = f"'Lookups'!$A$2:$A${1+len(accounts)}"
        wb.defined_names.append(DefinedName(name="AccountsList", attr_text=acc_range))
        ws.column_dimensions["A"].width = 36

        # Securities tickers + names (E:F)
        ws["E1"] = "Ticker"
        ws["F1"] = "Name"
        ws["E1"].font = self.header_font
        ws["F1"].font = self.header_font
        for i, s in enumerate(securities, start=2):
            ws.cell(row=i, column=5, value=s["ticker"]).border = self.border
            ws.cell(row=i, column=6, value=s["company_name"]).border = self.border
        sec_range = f"'Lookups'!$E$2:$E${1+len(securities)}"
        wb.defined_names.append(DefinedName(name="SecuritiesList", attr_text=sec_range))
        ws.column_dimensions["E"].width = 14
        ws.column_dimensions["F"].width = 40

        # Crypto symbols + names (H:I)
        ws["H1"] = "Symbol"
        ws["I1"] = "Name"
        ws["H1"].font = self.header_font
        ws["I1"].font = self.header_font
        for i, c in enumerate(cryptos, start=2):
            ws.cell(row=i, column=8, value=c["ticker"]).border = self.border
            ws.cell(row=i, column=9, value=c["company_name"]).border = self.border
        crypto_range = f"'Lookups'!$H$2:$H${1+len(cryptos)}"
        wb.defined_names.append(DefinedName(name="CryptoList", attr_text=crypto_range))
        ws.column_dimensions["H"].width = 14
        ws.column_dimensions["I"].width = 32

        # Metal types (K)
        ws["K1"] = "Metal Type"
        ws["K1"].font = self.header_font
        for i, m in enumerate(metals, start=2):
            ws.cell(row=i, column=11, value=m).border = self.border
        metal_range = f"'Lookups'!$K$2:$K${1+len(metals)}"
        wb.defined_names.append(DefinedName(name="MetalsList", attr_text=metal_range))
        ws.column_dimensions["K"].width = 18

        # Cash types (M)
        ws["M1"] = "Cash Types"
        ws["M1"].font = self.header_font
        for i, t in enumerate(CASH_ACCOUNT_TYPES, start=2):
            ws.cell(row=i, column=13, value=t).border = self.border
        cash_range = f"'Lookups'!$M$2:$M${1+len(CASH_ACCOUNT_TYPES)}"
        wb.defined_names.append(DefinedName(name="CashTypesList", attr_text=cash_range))
        ws.column_dimensions["M"].width = 22

    # ---------- POSITIONS: master instructions ----------

    def _create_master_instructions_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("📋 START HERE - Instructions", 0)
        ws.sheet_properties.tabColor = "FF0000"

        ws.merge_cells("A1:H1")
        ws["A1"] = "NestEgg — Positions Import"
        ws["A1"].font = Font(bold=True, size=14, color="FFFFFF")
        ws["A1"].alignment = self.center_align
        ws["A1"].fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")

        instructions = [
            "",
            "This workbook contains 4 position type tabs. Fill in ONLY the tabs for positions you want to import:",
            "",
            "📈 Tab 1: SECURITIES (Blue) - For stocks, ETFs, mutual funds",
            "   • Required: Account, Ticker, Shares, Cost Basis, Purchase Date",
            "   • Ticker dropdown includes all tracked securities",
            "",
            "💵 Tab 2: CASH (Purple) - For savings, checking, money market, CDs",
            "   • Required: Account, Cash Type, Amount",
            "",
            "🪙 Tab 3: CRYPTO (Orange) - For cryptocurrency holdings",
            "   • Required: Account, Symbol, Quantity, Purchase Price, Purchase Date",
            "",
            "🥇 Tab 4: METALS (Gold) - For precious metal holdings",
            "   • Required: Account, Metal Type, Quantity (oz), Purchase Price, Purchase Date",
            "",
            "⚠️ IMPORTANT:",
            "1) Delete ALL sample rows (blue) before importing",
            "2) Yellow cells are REQUIRED",
            "3) Dates must be YYYY-MM-DD",
            "4) Use dropdowns for Account, Ticker/Symbol/Metal",
        ]

        row = 3
        for text in instructions:
            ws.merge_cells(f"A{row}:H{row}")
            ws[f"A{row}"] = text
            ws[f"A{row}"].alignment = self.left_align
            row += 1

        ws.column_dimensions["A"].width = 95
        ws.freeze_panes = "A2"
        return ws

    # ---------- POSITIONS: SECURITIES ----------

    def _create_securities_positions_sheet(self, wb: Workbook, accounts: list, securities: list) -> Worksheet:
        ws = wb.create_sheet("📈 SECURITIES", 1)
        ws.sheet_properties.tabColor = "1E90FF"

        ws.merge_cells("A1:G1")
        ws["A1"] = "SECURITIES POSITIONS"
        ws["A1"].font = Font(bold=True, size=12, color="FFFFFF")
        ws["A1"].fill = PatternFill(start_color="1E90FF", end_color="1E90FF", fill_type="solid")
        ws["A1"].alignment = self.center_align

        headers = ["Account*", "Ticker*", "Name", "Shares*", "Cost Basis*", "Purchase Date*", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border

        widths = {"A": 26, "B": 14, "C": 36, "D": 16, "E": 16, "F": 16, "G": 24}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        # Account dropdown (workbook-level name)
        if accounts:
            dv_acc = DataValidation(type="list", formula1="=AccountsList", allow_blank=False)
            dv_acc.showDropDown = False
            ws.add_data_validation(dv_acc)
            dv_acc.add("A3:A1000")

        # Ticker dropdown
        if securities:
            dv_ticker = DataValidation(type="list", formula1="=SecuritiesList", allow_blank=False)
            dv_ticker.showDropDown = False
            ws.add_data_validation(dv_ticker)
            dv_ticker.add("B3:B1000")

        # Shares numeric
        dv_shares = DataValidation(type="decimal", operator="greaterThan", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_shares)
        dv_shares.add("D3:D1000")

        # Cost basis numeric
        dv_cost = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_cost)
        dv_cost.add("E3:E1000")

        # Date
        dv_date = DataValidation(type="date", operator="between", formula1=datetime(1900, 1, 1), formula2=datetime.now(), allow_blank=False)
        ws.add_data_validation(dv_date)
        dv_date.add("F3:F1000")

        # Example rows
        examples = [
            ["Select Account", "AAPL", "Apple Inc.", "10", "150.00", "2024-01-15", ""],
            ["Select Account", "VTI",  "Vanguard Total Stock Market ETF", "12", "210.50", "2024-02-01", ""],
        ]
        for r_idx, row_data in enumerate(examples, start=3):
            for c_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill

        for row in range(5, 50):
            for col in [1, 2, 4, 5, 6]:
                ws.cell(row=row, column=col).fill = self.required_fill

        ws.freeze_panes = "A3"
        return ws

    # ---------- POSITIONS: CASH ----------

    def _create_cash_positions_sheet(self, wb: Workbook, accounts: list) -> Worksheet:
        ws = wb.create_sheet("💵 CASH", 2)
        ws.sheet_properties.tabColor = "663399"

        ws.merge_cells("A1:F1")
        ws["A1"] = "CASH POSITIONS - Savings, Checking, Money Market, CDs"
        ws["A1"].font = Font(bold=True, size=12, color="FFFFFF")
        ws["A1"].fill = PatternFill(start_color="663399", end_color="663399", fill_type="solid")
        ws["A1"].alignment = self.center_align

        headers = ["Account*", "Cash Type*", "Amount*", "Interest Rate (%)", "Maturity Date", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border

        widths = {"A": 26, "B": 22, "C": 16, "D": 18, "E": 16, "F": 30}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        # Account dropdown
        if accounts:
            dv_acc = DataValidation(type="list", formula1="=AccountsList", allow_blank=False)
            dv_acc.showDropDown = False
            ws.add_data_validation(dv_acc)
            dv_acc.add("A3:A1000")

        # Cash types dropdown
        dv_cash = DataValidation(type="list", formula1="=CashTypesList", allow_blank=False)
        dv_cash.showDropDown = False
        ws.add_data_validation(dv_cash)
        dv_cash.add("B3:B1000")

        # Amount numeric
        dv_amt = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_amt)
        dv_amt.add("C3:C1000")

        # Interest rate numeric (>=0)
        dv_rate = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=True)
        ws.add_data_validation(dv_rate)
        dv_rate.add("D3:D1000")

        # Date
        dv_date = DataValidation(type="date", operator="between", formula1=datetime(1900, 1, 1), formula2=datetime.now(), allow_blank=True)
        ws.add_data_validation(dv_date)
        dv_date.add("E3:E1000")

        # Sample rows
        examples = [
            ["Select Account", "Savings", "5000", "4.50", "2025-06-01", ""],
            ["Select Account", "CD", "10000", "5.00", "2026-12-31", "12-mo term"],
        ]
        for r_idx, row_data in enumerate(examples, start=3):
            for c_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill

        for row in range(5, 50):
            for col in [1, 2, 3]:
                ws.cell(row=row, column=col).fill = self.required_fill

        ws.freeze_panes = "A3"
        return ws

    # ---------- POSITIONS: CRYPTO ----------

    def _create_crypto_positions_sheet(self, wb: Workbook, accounts: list, cryptos: list) -> Worksheet:
        ws = wb.create_sheet("🪙 CRYPTO", 3)
        ws.sheet_properties.tabColor = "FF9900"

        ws.merge_cells("A1:G1")
        ws["A1"] = "CRYPTOCURRENCY POSITIONS"
        ws["A1"].font = Font(bold=True, size=12, color="FFFFFF")
        ws["A1"].fill = PatternFill(start_color="FF9900", end_color="FF9900", fill_type="solid")
        ws["A1"].alignment = self.center_align

        headers = ["Account*", "Symbol*", "Name", "Quantity*", "Purchase Price*", "Purchase Date*", "Storage Type"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border

        widths = {"A": 26, "B": 14, "C": 36, "D": 16, "E": 16, "F": 16, "G": 22}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        # Account dropdown
        if accounts:
            dv_acc = DataValidation(type="list", formula1="=AccountsList", allow_blank=False)
            dv_acc.showDropDown = False
            ws.add_data_validation(dv_acc)
            dv_acc.add("A3:A1000")

        # Crypto symbol dropdown
        if cryptos:
            dv_crypto = DataValidation(type="list", formula1="=CryptoList", allow_blank=False)
            dv_crypto.showDropDown = False
            ws.add_data_validation(dv_crypto)
            dv_crypto.add("B3:B1000")

        # Quantity numeric
        dv_qty = DataValidation(type="decimal", operator="greaterThan", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_qty)
        dv_qty.add("D3:D1000")

        # Price numeric
        dv_price = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_price)
        dv_price.add("E3:E1000")

        # Date
        dv_date = DataValidation(type="date", operator="between", formula1=datetime(1900, 1, 1), formula2=datetime.now(), allow_blank=False)
        ws.add_data_validation(dv_date)
        dv_date.add("F3:F1000")

        # Sample
        examples = [
            ["Select Account", "BTC", "Bitcoin", "0.5", "45000", "2024-01-15", "Exchange"],
            ["Select Account", "ETH", "Ethereum", "2.0", "2500", "2024-02-01", "Cold Wallet"],
        ]
        for r_idx, row_data in enumerate(examples, start=3):
            for c_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill

        for row in range(5, 50):
            for col in [1, 2, 4, 5, 6]:
                ws.cell(row=row, column=col).fill = self.required_fill

        ws.freeze_panes = "A3"
        return ws

    # ---------- POSITIONS: METALS ----------

    def _create_metal_positions_sheet(self, wb: Workbook, accounts: list, metals: list) -> Worksheet:
        ws = wb.create_sheet("🥇 METALS", 4)
        ws.sheet_properties.tabColor = "FFD700"

        ws.merge_cells("A1:G1")
        ws["A1"] = "PRECIOUS METALS POSITIONS"
        ws["A1"].font = Font(bold=True, size=12, color="FFFFFF")
        ws["A1"].fill = PatternFill(start_color="FFD700", end_color="FFD700", fill_type="solid")
        ws["A1"].alignment = self.center_align

        headers = ["Account*", "Metal Type*", "Quantity (oz)*", "Purchase Price/oz*", "Purchase Date*", "Storage Location", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=2, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border

        widths = {"A": 26, "B": 18, "C": 18, "D": 20, "E": 18, "F": 24, "G": 24}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        # Account dropdown
        if accounts:
            dv_acc = DataValidation(type="list", formula1="=AccountsList", allow_blank=False)
            dv_acc.showDropDown = False
            ws.add_data_validation(dv_acc)
            dv_acc.add("A3:A1000")

        # Metal type dropdown
        dv_metal = DataValidation(type="list", formula1="=MetalsList", allow_blank=False)
        dv_metal.showDropDown = False
        ws.add_data_validation(dv_metal)
        dv_metal.add("B3:B1000")

        # Quantity numeric
        dv_qty = DataValidation(type="decimal", operator="greaterThan", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_qty)
        dv_qty.add("C3:C1000")

        # Price/oz numeric
        dv_price = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1=0, allow_blank=False)
        ws.add_data_validation(dv_price)
        dv_price.add("D3:D1000")

        # Date
        dv_date = DataValidation(type="date", operator="between", formula1=datetime(1900, 1, 1), formula2=datetime.now(), allow_blank=False)
        ws.add_data_validation(dv_date)
        dv_date.add("E3:E1000")

        # Samples
        examples = [
            ["Select Account", "Gold", "10", "1900", "2024-01-15", "Safe Deposit Box", "Bars"],
            ["Select Account", "Silver", "100", "25", "2024-02-01", "Home Safe", "Coins"],
        ]
        for r_idx, row_data in enumerate(examples, start=3):
            for c_idx, value in enumerate(row_data, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill

        for row in range(5, 50):
            for col in [1, 2, 3, 4, 5]:
                ws.cell(row=row, column=col).fill = self.required_fill

        ws.freeze_panes = "A3"
        return ws

    # ---------- helpers ----------

    def _safe_name(self, s: str) -> str:
        return "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in s)
