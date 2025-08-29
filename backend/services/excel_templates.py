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
        self.named_ranges = {
            "institutions": "InstitutionsList",
            "categories": "AccountCategoriesList",
            "types_flat": "AccountTypesList",
        }
    # =========================
    # PUBLIC: ACCOUNTS TEMPLATE
    # =========================
    def create_accounts_template(self) -> io.BytesIO:
        wb = Workbook()
        wb.remove(wb.active)

        # Create sheets in order
        self._create_instructions_sheet(wb)
        accounts_ws = self._create_accounts_sheet(wb)
        lookups_ws = self._create_validation_lists_sheet(wb)
        
        # Add validations AFTER creating lookups sheet with the workbook context
        self._add_institution_validation_named_range(accounts_ws)
        self._add_category_validation_named_range(accounts_ws)
        self._add_account_type_validation_with_indirect(accounts_ws, wb)
        
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    def _add_account_type_validation_with_indirect(self, ws: Worksheet, wb: Workbook) -> None:
        """
        Add account type validation that dynamically changes based on category selection.
        Uses INDIRECT formula to reference the appropriate named range.
        """
        # Create a helper column in Lookups sheet for the mapping
        lookups_ws = wb["Lookups"]
        
        # Add mapping table starting at column M (column 13)
        lookups_ws["M1"] = "Category Display"
        lookups_ws["N1"] = "Range Name"
        lookups_ws["M1"].font = self.header_font
        lookups_ws["N1"].font = self.header_font
        
        mappings = [
            ("Brokerage", "Types_Brokerage"),
            ("Retirement", "Types_Retirement"),
            ("Cash / Banking", "Types_CashBanking"),
            ("Cryptocurrency", "Types_Cryptocurrency"),
            ("Metals", "Types_Metals")
        ]
        
        for i, (display, range_name) in enumerate(mappings, start=2):
            lookups_ws.cell(row=i, column=13, value=display).border = self.border
            lookups_ws.cell(row=i, column=14, value=range_name).border = self.border
        
        # Use VLOOKUP with INDIRECT to get the right list
        # This formula looks up the category name and gets the corresponding range name
        indirect_formula = 'INDIRECT(VLOOKUP(C2,Lookups!$M$2:$N$6,2,FALSE))'
        
        dv = DataValidation(
            type="list",
            formula1=indirect_formula,
            allow_blank=True,
            showDropDown=True,
            errorTitle="Select Category First",
            error="Please select an Account Category first, then choose the Account Type.",
            showErrorMessage=True,
            showInputMessage=True,
            promptTitle="Account Type",
            prompt="Select a type based on your chosen category"
        )
        ws.add_data_validation(dv)
        dv.add("D2:D5000")

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
            "4. Delete the example rows on the 'Accounts' sheet (rows 2–5) before importing",
            "5. Save this file",
            "6. Upload to NestEgg using the 'Import Accounts' feature",
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
            "• Account Type: Specific type within the category (e.g., 'Roth IRA', 'Checking')",
            "",
            "Need Help?:",
            "• Missing an institution? Contact support@nesteggfinapp.com",
            "• For account type questions, refer to the Category-Type Reference tab",
            "",
            "After importing accounts, you can:",
            "• Download a customized Positions template with your account names",
            "• Add securities, cash, crypto, and metals to your accounts",
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
            ["My 401k", "Fidelity", "Retirement", "401(k)", ""],
            ["Joint Brokerage", "Vanguard", "Brokerage", "Joint", ""],
            ["Emergency Fund", "Ally Bank", "Cash / Banking", "High Yield Savings", ""],
            ["Bitcoin Wallet", "Coinbase", "Cryptocurrency", "Exchange Account", ""],
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

        note_row = 6
        ws.merge_cells(f"A{note_row}:E{note_row}")
        ws[f"A{note_row}"] = "Important: Delete the example rows (2–5) before uploading."
        ws[f"A{note_row}"].font = Font(bold=True, color="9C6500")
        ws[f"A{note_row}"].fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
        ws[f"A{note_row}"].alignment = Alignment(horizontal="center")

        ws.freeze_panes = "A2"

        return ws

    def _create_validation_lists_sheet(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Lookups", 2)
        # Hide this sheet from users
        ws.sheet_state = 'hidden'

        # Institutions column
        ws["A1"] = "Institutions"
        ws["A1"].font = self.header_font
        for i, inst in enumerate(INSTITUTION_LIST, start=2):
            ws.cell(row=i, column=1, value=inst).border = self.border
        ws.column_dimensions["A"].width = 32
        
        # Account Categories column
        ws["C1"] = "Account Categories"
        ws["C1"].font = self.header_font
        category_display_names = []
        row_idx = 2  # Start at row 2
        for cat in ACCOUNT_CATEGORIES:
            if cat == "real_estate":
                continue
            # Display user-friendly names
            display_name = cat.replace("_", " ").title()
            if cat == "cash":
                display_name = "Cash / Banking"
            elif cat == "cryptocurrency":
                display_name = "Cryptocurrency"
            category_display_names.append((cat, display_name))
            ws.cell(row=row_idx, column=3, value=display_name).border = self.border
            row_idx += 1  # Increment row for next category
        ws.column_dimensions["C"].width = 22
        
        # Create dynamic category-type mapping columns for INDIRECT formula use
        col_index = 5  # Start at column E
        for category, display_name in category_display_names:
            if category == "real_estate":
                continue  # Skip real estate
                
            types = ACCOUNT_TYPES_BY_CATEGORY.get(category, [])
            
            # Header for this category's types
            ws.cell(row=1, column=col_index, value=display_name).font = self.header_font
            
            # List types for this category
            for i, t in enumerate(types, start=2):
                ws.cell(row=i, column=col_index, value=t).border = self.border
            
            # Define named range for this category's types
            # The named range should match what INDIRECT will look for
            # Remove spaces and special chars from the display name for the range name
            clean_name = display_name.replace(" / ", "").replace(" ", "")
            cat_range_addr = f"Lookups!${get_column_letter(col_index)}$2:${get_column_letter(col_index)}${1 + len(types)}"
            cat_range_name = f"Types_{clean_name}"
            
            # Create the defined name
            defined_name = DefinedName(name=cat_range_name, attr_text=cat_range_addr)
            wb.defined_names.add(defined_name)
            
            ws.column_dimensions[get_column_letter(col_index)].width = 26
            col_index += 1

        return ws

    def _add_institution_validation_named_range(self, ws: Worksheet) -> None:
        # Use direct range reference like positions template does
        inst_range = f"Lookups!$A$2:$A${1 + len(INSTITUTION_LIST)}"
        
        dv = DataValidation(
            type="list",
            formula1=inst_range,
            allow_blank=True,
            errorTitle="Invalid Institution",
            error="Please choose a valid institution from the list or type a custom name.",
            showErrorMessage=True,
            showInputMessage=True,
            promptTitle="Institution",
            prompt="Select from the list or type a custom name"
        )
        # Explicitly set showDropDown to ensure in-cell dropdown appears
        dv.showDropDown = False  # This is counterintuitive but correct for openpyxl
        ws.add_data_validation(dv)
        dv.add("B2:B5000")

    def _add_category_validation_named_range(self, ws: Worksheet) -> None:
        # Use direct range reference
        # Count actual categories excluding real_estate
        cat_count = len([c for c in ACCOUNT_CATEGORIES if c != "real_estate"])
        cat_range = f"Lookups!$C$2:$C${1 + cat_count}"
        
        dv = DataValidation(
            type="list",
            formula1=cat_range,
            allow_blank=True,
            errorTitle="Invalid Category",
            error="Choose a valid account category from the list.",
            showErrorMessage=True,
            showInputMessage=True,
            promptTitle="Account Category",
            prompt="Select the category that best fits this account"
        )
        # Explicitly set showDropDown to ensure in-cell dropdown appears
        dv.showDropDown = False  # This is counterintuitive but correct for openpyxl
        ws.add_data_validation(dv)
        dv.add("C2:C5000")

    def _add_account_type_validation(self, ws: Worksheet) -> None:
        # Use INDIRECT formula to dynamically reference the category's type list
        # This formula will look up the named range based on the category selected in column C
        indirect_formula = 'INDIRECT("Types_" & SUBSTITUTE(SUBSTITUTE(C2," ","")," / ",""))'
        
        dv = DataValidation(
            type="list",
            formula1=indirect_formula,
            allow_blank=True,
            errorTitle="Select Category First",
            error="Please select an Account Category first, then choose the Account Type.",
            showErrorMessage=True,
            showInputMessage=True,
            promptTitle="Account Type",
            prompt="Select a type based on your chosen category"
        )
        # Explicitly set showDropDown to ensure in-cell dropdown appears
        dv.showDropDown = False  # This is counterintuitive but correct for openpyxl
        ws.add_data_validation(dv)
        dv.add("D2:D5000")

    def _create_category_type_reference(self, wb: Workbook) -> Worksheet:
        ws = wb.create_sheet("Category-Type Reference", 3)
        ws.sheet_properties.tabColor = "FFC107"
        # Hide this reference sheet from users
        ws.sheet_state = 'hidden'

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
            SELECT id, account_name
            FROM accounts
            WHERE user_id = :user_id
            ORDER BY account_name
        """
        accounts = await database.fetch_all(query=query, values={"user_id": user_id})
        if not accounts:
            raise ValueError("No accounts found. Please create accounts before downloading positions template.")

        wb = Workbook()
        wb.remove(wb.active)

        # Instructions - Positions
        inst = wb.create_sheet("Instructions - Positions", 0)
        inst.sheet_properties.tabColor = "9B59B6"
        inst.merge_cells("A1:F1")
        inst["A1"] = "NestEgg Positions Import Instructions"
        inst["A1"].font = Font(bold=True, size=16, color="2C3E50")
        inst["A1"].alignment = Alignment(horizontal="center")

        pos_lines = [
            "",
            "Step-by-Step Guide:",
            "1. Go to the 'Positions' tab",
            "2. Choose your Account from the dropdown",
            "3. Select Asset Type (cash, crypto, metal)",
            "4. Fill Identifier/Ticker, Quantity, Purchase Price, and Purchase Date",
            "5. Delete the example rows before importing",
            "",
            "Important Notes:",
            "• Accounts must already exist (import accounts first)",
            "• Required fields are highlighted in YELLOW",
            "• Purchase Date format: YYYY-MM-DD",
            "",
            "Field Descriptions:",
            "• Account: The account that will hold this position",
            "• Asset Type: cash, crypto, or metal",
            "• Identifier / Ticker: e.g., BTC, Gold; leave empty for cash",
            "• Quantity: shares/units/ounces/amount",
            "• Purchase Price per Share: unit cost paid",
            "• Purchase Date: date of acquisition",
        ]
        r = 3
        for t in pos_lines:
            inst[f"A{r}"] = t
            inst[f"A{r}"].font = Font(bold=True, size=12, color="2C3E50") if t.endswith(":") else Font(size=11)
            r += 1
        inst.column_dimensions["A"].width = 100

        # Lookups sheet
        lookups = wb.create_sheet("Lookups", 1)

        lookups["A1"] = "Account Name"
        for i, acc in enumerate(accounts, start=2):
            lookups.cell(row=i, column=1, value=acc["account_name"]).border = self.border
        acc_range = f"=Lookups!$A$2:$A${1+len(accounts)}"

        # Asset types
        lookups["C1"] = "Asset Types"
        for i, t in enumerate(["cash", "crypto", "metal"], start=2):
            lookups.cell(row=i, column=3, value=t).border = self.border
        type_range = "=Lookups!$C$2:$C$4"

        # Positions sheet
        ws = wb.create_sheet("Positions", 1)
        ws.sheet_properties.tabColor = "4CAF50"
        headers = ["Account", "Asset Type", "Identifier / Ticker", "Quantity", "Purchase Price per Share", "Purchase Date"]
        for c, h in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=c, value=h)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = self.border
            ws.column_dimensions[get_column_letter(c)].width = 22

        # Dropdowns
        dv_acc = DataValidation(type="list", formula1=acc_range, allow_blank=False)
        ws.add_data_validation(dv_acc)
        dv_acc.add("A2:A5000")

        dv_type = DataValidation(type="list", formula1=type_range, allow_blank=False)
        ws.add_data_validation(dv_type)
        dv_type.add("B2:B5000")

        # Example rows
        examples = [
            [accounts[0]["account_name"], "cash", "", "", "", ""],
            [accounts[0]["account_name"], "crypto", "BTC", "0.5", "20000", "2024-01-01"],
            [accounts[0]["account_name"], "metal", "Gold", "2", "1800", "2023-10-15"],
        ]
        for r_idx, row in enumerate(examples, start=2):
            for c_idx, val in enumerate(row, start=1):
                ws.cell(row=r_idx, column=c_idx, value=val).border = self.border
                if r_idx < 6:
                    ws.cell(row=r_idx, column=c_idx).fill = self.sample_fill

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