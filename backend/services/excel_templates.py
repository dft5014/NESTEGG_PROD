import io
from datetime import datetime
from typing import List, Dict, Any

from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.worksheet.datavalidation import DataValidation

# Ensure these exist in backend.utils.constants
from backend.utils.constants import (
    INSTITUTION_LIST,
    ACCOUNT_TYPES,             # kept for compatibility
    ACCOUNT_CATEGORIES,
    ACCOUNT_TYPES_BY_CATEGORY, # dict[str, list[str]]
)

class ExcelTemplateService:
    """Service for generating Excel import templates (Accounts + Positions)."""

    def __init__(self):
        self.header_font = Font(bold=True, color="FFFFFF", size=12)
        self.header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
        self.header_alignment = Alignment(horizontal="center", vertical="center")

        self.required_fill = PatternFill(start_color="FFF9C4", end_color="FFF9C4", fill_type="solid")
        self.sample_fill = PatternFill(start_color="E3F2FD", end_color="E3F2FD", fill_type="solid")

        self.border = Border(
            left=Side(style="thin", color="DDDDDD"),
            right=Side(style="thin", color="DDDDDD"),
            top=Side(style="thin", color="DDDDDD"),
            bottom=Side(style="thin", color="DDDDDD"),
        )

        self.lookup_ranges = {"institutions": None, "categories": None, "types_flat": None}

    # =========================
    # PUBLIC: ACCOUNTS TEMPLATE
    # =========================
    def create_accounts_template(self) -> io.BytesIO:
        wb = Workbook()
        wb.remove(wb.active)

        self._create_instructions_sheet(wb)
        accounts_ws = self._create_accounts_sheet(wb)
        self._create_validation_lists_sheet(wb)

        self._add_institution_validation_named_range(accounts_ws)
        self._add_category_validation_named_range(accounts_ws)
        self._add_account_type_validation(accounts_ws)

        self._create_category_type_reference(wb)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    def _create_instructions_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Instructions", 0)
        ws.sheet_properties.tabColor = "1976D2"

        ws.merge_cells("A1:F1")
        ws["A1"] = "NestEgg Account Import Instructions"
        ws["A1"].font = Font(bold=True, size=16, color="2C3E50")
        ws["A1"].alignment = Alignment(horizontal="center")

        lines = [
            "",
            "Step-by-Step Guide:",
            "1. Go to the 'Accounts' tab",
            "2. Fill in your account information (yellow cells are required)",
            "3. Use the dropdown menus for Institution, Account Type, and Category",
            "4. Save this file",
            "5. Upload to NestEgg using the 'Import Accounts' feature",
            "",
            "Important Notes:",
            "• Required fields are highlighted in YELLOW",
            "• Institution, Account Category, and Account Type must be selected from the dropdowns",
            "• Account names should be unique (avoid duplicates)",
            "• Don't modify the column headers",
            "• Leave cells empty rather than typing 'N/A'",
            "",
            "Field Descriptions:",
            "• Account Name: Your chosen name for the account (e.g., 'My 401k', 'Joint Savings')",
            "• Institution: The financial institution where the account is held",
            "• Account Category: General grouping (retirement, cash, brokerage, etc.)",
            "• Account Type: Specific type within the category (e.g., 401(k), Roth IRA, Checking)",
            "• Notes: Optional info about the account",
            "",
            "After importing accounts, you can:",
            "• Download a customized Positions template with your account names",
            "• Add securities, cash, crypto, metals, and real estate to your accounts",
        ]

        row = 3
        for text in lines:
            ws[f"A{row}"] = text
            ws[f"A{row}"].font = Font(bold=True, size=12, color="2C3E50") if text.endswith(":") else Font(size=11)
            row += 1

        ws.column_dimensions["A"].width = 100
        return ws

    def _create_accounts_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Accounts", 1)
        ws.sheet_properties.tabColor = "4CAF50"

        headers = ["Account Name", "Institution", "Account Category", "Account Type", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border

        samples = [
            ["My 401k", "Fidelity", "retirement", "401(k)", ""],
            ["Joint Brokerage", "Vanguard", "brokerage", "Joint", ""],
            ["Emergency Fund", "Ally Bank", "cash", "High Yield Savings", ""],
            ["Bitcoin Wallet", "Coinbase", "cryptocurrency", "Exchange Account", ""],
        ]
        for r_idx, row_vals in enumerate(samples, start=2):
            for c_idx, val in enumerate(row_vals, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.border = self.border
                cell.fill = self.sample_fill

        for r in range(6, 250):
            for c in range(1, 5+1):
                cell = ws.cell(row=r, column=c, value="")
                cell.border = self.border
                if c <= 4:
                    cell.fill = self.required_fill

        widths = {"A": 30, "B": 25, "C": 22, "D": 25, "E": 40}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w

        ws.freeze_panes = "A2"

        return ws

    def _create_validation_lists_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Lookups", 2)

        ws["A1"] = "Institutions"
        ws["A1"].font = self.header_font
        for i, inst in enumerate(INSTITUTION_LIST, start=2):
            ws.cell(row=i, column=1, value=inst).border = self.border
        ws.column_dimensions["A"].width = 32
        if INSTITUTION_LIST:
            self.lookup_ranges["institutions"] = f"=Lookups!$A$2:$A${1 + len(INSTITUTION_LIST)}"

        ws["C1"] = "Account Categories"
        ws["C1"].font = self.header_font
        for i, cat in enumerate(ACCOUNT_CATEGORIES, start=2):
            ws.cell(row=i, column=3, value=cat).border = self.border
        ws.column_dimensions["C"].width = 22
        if ACCOUNT_CATEGORIES:
            self.lookup_ranges["categories"] = f"=Lookups!$C$2:$C${1 + len(ACCOUNT_CATEGORIES)}"

        ws["E1"] = "Account Types (All)"
        ws["E1"].font = self.header_font
        seen = set()
        flat_types: List[str] = []
        for lst in ACCOUNT_TYPES_BY_CATEGORY.values():
            for t in lst:
                if t not in seen:
                    seen.add(t)
                    flat_types.append(t)
        for i, t in enumerate(flat_types, start=2):
            ws.cell(row=i, column=5, value=t).border = self.border
        ws.column_dimensions["E"].width = 26
        if flat_types:
            self.lookup_ranges["types_flat"] = f"=Lookups!$E$2:$E${1 + len(flat_types)}"

        return ws

    def _add_institution_validation_named_range(self, ws: Worksheet) -> None:
        rng = self.lookup_ranges.get("institutions")
        if not rng:
            return

        dv = DataValidation(
            type="list",
            formula1=rng,
            allow_blank=False,   # must pick from dropdown
            showDropDown=True,
            errorTitle="Invalid Institution",
            error="Please choose a valid institution from the list.",
        )
        ws.add_data_validation(dv)
        dv.add("B2:B5000")

    def _add_category_validation_named_range(self, ws: Worksheet) -> None:
        rng = self.lookup_ranges.get("categories")
        if not rng:
            return
        dv = DataValidation(
            type="list",
            formula1=rng,
            allow_blank=False,
            showDropDown=True,
            errorTitle="Invalid Category",
            error="Choose a valid account category from the list.",
        )
        ws.add_data_validation(dv)
        dv.add("C2:C5000")

    def _add_account_type_validation(self, ws: Worksheet) -> None:
        rng = self.lookup_ranges.get("types_flat")
        if not rng:
            return
        dv = DataValidation(
            type="list",
            formula1=rng,
            allow_blank=False,
            showDropDown=True,
            errorTitle="Invalid Account Type",
            error="Please select a valid account type.",
        )
        ws.add_data_validation(dv)
        dv.add("D2:D5000")

    def _create_category_type_reference(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Category-Type Reference", 3)
        ws.sheet_properties.tabColor = "FFC107"

        ws.merge_cells("A1:C1")
        ws["A1"] = "Valid Account Types by Category"
        ws["A1"].font = Font(bold=True, size=14, color="2C3E50")
        ws["A1"].alignment = Alignment(horizontal="center")

        row = 3
        for category, types in ACCOUNT_TYPES_BY_CATEGORY.items():
            ws.merge_cells(f"A{row}:C{row}")
            ws.cell(row=row, column=1, value=category.replace("_", " ").title())
            ws.cell(row=row, column=1).font = Font(bold=True, size=12, color="FFFFFF")
            ws.cell(row=row, column=1).fill = PatternFill(start_color="34495E", end_color="34495E", fill_type="solid")
            for t in types:
                row += 1
                ws.cell(row=row, column=2, value=t).border = self.border
                ws.cell(row=row, column=3, value="✓").font = Font(color="27AE60", bold=True)
                ws.cell(row=row, column=3).alignment = Alignment(horizontal="center")
            row += 2

        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 30
        ws.column_dimensions["C"].width = 10
        ws.freeze_panes = "A2"
        return ws

    # ==========================
    # PUBLIC: POSITIONS TEMPLATE
    # (simple scaffold; Step 2)
    # ==========================
    async def create_positions_template(self, user_id: Any, database) -> io.BytesIO:
        query = """
            SELECT id, account_name, type, account_category
            FROM accounts
            WHERE user_id = :user_id
            ORDER BY account_name
        """
        accounts: List[Dict[str, Any]] = await database.fetch_all(query=query, values={"user_id": user_id})
        if not accounts:
            raise ValueError("No accounts found. Please create accounts before downloading positions template.")

        wb = Workbook()
        wb.remove(wb.active)

        self._create_accounts_reference_sheet(wb, accounts)

        ws = wb.create_sheet("Positions", 1)
        ws.sheet_properties.tabColor = "4CAF50"

        headers = [
            "Operation", "Position ID", "Account ID", "Account Name",
            "Asset Type", "Symbol", "Name", "Quantity", "Price",
            "Cost Basis", "As Of Date (YYYY-MM-DD)", "Currency", "Notes",
        ]
        for c, h in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c, value=h)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = self.border
            ws.column_dimensions[get_column_letter(c)].width = 18

        examples = [
            ["create", "", accounts[0]["id"], accounts[0]["account_name"], "security", "AAPL", "", 10, "", 1500, datetime.now().strftime("%Y-%m-%d"), "USD", ""],
            ["update", "", accounts[0]["id"], accounts[0]["account_name"], "cash", "", "Checking Balance", "", "", 5000, datetime.now().strftime("%Y-%m-%d"), "USD", ""],
        ]
        for r_idx, row in enumerate(examples, start=2):
            for c_idx, val in enumerate(row, start=1):
                cell = ws.cell(row=r_idx, column=c_idx, value=val)
                cell.border = self.border
                if r_idx < 6:
                    cell.fill = self.sample_fill

        ws.freeze_panes = "A2"

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    def _create_accounts_reference_sheet(self, wb: Workbook, accounts: List[Dict[str, Any]]) -> Worksheet:
        ws = wb.create_sheet("Your Accounts (Reference)", 0)
        ws.sheet_properties.tabColor = "FF9800"

        headers = ["Account Name", "Type", "Category", "Account ID"]
        for c, h in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c, value=h)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = self.border

        for r, acc in enumerate(accounts, start=2):
            ws.cell(row=r, column=1, value=acc["account_name"]).border = self.border
            ws.cell(row=r, column=2, value=acc["type"]).border = self.border
            ws.cell(row=r, column=3, value=acc["account_category"]).border = self.border
            ws.cell(row=r, column=4, value=acc["id"]).border = self.border

        for col in ["A", "B", "C", "D"]:
            ws.column_dimensions[col].width = 24

        ws.freeze_panes = "A2"
        return ws
