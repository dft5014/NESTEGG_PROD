import openpyxl
from openpyxl import Workbook
from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from datetime import datetime
import io
from typing import List, Dict, Optional

# Import from your existing constants (you'll need to create this)
from backend.utils.constants import INSTITUTION_LIST, ACCOUNT_TYPES, ACCOUNT_CATEGORIES

class ExcelTemplateService:
    """Service for generating Excel import templates"""
    
    def __init__(self):
        # Define reusable styles
        self.header_font = Font(bold=True, color="FFFFFF", size=12)
        self.header_fill = PatternFill(start_color="2C3E50", end_color="2C3E50", fill_type="solid")
        self.header_alignment = Alignment(horizontal="center", vertical="center")
        
        self.required_fill = PatternFill(start_color="FFF9C4", end_color="FFF9C4", fill_type="solid")
        self.sample_fill = PatternFill(start_color="E3F2FD", end_color="E3F2FD", fill_type="solid")
        
        self.border = Border(
            left=Side(style='thin', color='DDDDDD'),
            right=Side(style='thin', color='DDDDDD'),
            top=Side(style='thin', color='DDDDDD'),
            bottom=Side(style='thin', color='DDDDDD')
        )
    
    def create_accounts_template(self) -> io.BytesIO:
        """
        Creates the accounts import template and returns it as BytesIO
        """
        wb = Workbook()
        wb.remove(wb.active)
        
        # Create sheets
        self._create_instructions_sheet(wb)
        self._create_accounts_sheet(wb)
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output
    
    def _create_instructions_sheet(self, wb: Workbook):
        """Create the instructions sheet"""
        instructions_ws = wb.create_sheet("Instructions", 0)
        instructions_ws.sheet_properties.tabColor = "1976D2"
        
        # Title
        instructions_ws.merge_cells('A1:F1')
        instructions_ws['A1'] = "NestEgg Account Import Instructions"
        instructions_ws['A1'].font = Font(bold=True, size=16, color="2C3E50")
        instructions_ws['A1'].alignment = Alignment(horizontal="center")
        
        # Instructions content
        instructions = [
            [""],
            ["Step-by-Step Guide:"],
            ["1. Go to the 'Accounts' tab"],
            ["2. Fill in your account information (yellow cells are required)"],
            ["3. Use the dropdown menus for Institution, Account Type, and Category"],
            ["4. Save this file"],
            ["5. Upload to NestEgg using the 'Import Accounts' feature"],
            [""],
            ["Important Notes:"],
            ["• Required fields are highlighted in YELLOW and marked with *"],
            ["• Institution names must be selected from the dropdown list"],
            ["• If your institution isn't listed, select 'Other' and add details in Notes"],
            ["• Account names must be unique - you cannot have duplicate names"],
            ["• Don't modify the column headers"],
            ["• Leave cells empty rather than typing 'N/A' or similar"],
            [""],
            ["Field Descriptions:"],
            ["• Account Name: Your chosen name for the account (e.g., 'My 401k', 'Joint Savings')"],
            ["• Institution: The financial institution where the account is held"],
            ["• Account Type: The specific type of account (401k, IRA, Taxable, etc.)"],
            ["• Account Category: General category for grouping (retirement, cash, etc.)"],
            ["• Notes: Optional additional information about the account"],
            [""],
            ["After importing accounts, you can:"],
            ["• Download a customized Positions template with your account names"],
            ["• Add securities, cash, crypto, metals, and real estate to your accounts"]
        ]
        
        for i, instruction in enumerate(instructions, start=3):
            if instruction[0].startswith(("Step-by-Step", "Important", "Field Descriptions", "After importing")):
                instructions_ws[f'A{i}'] = instruction[0]
                instructions_ws[f'A{i}'].font = Font(bold=True, size=12, color="2C3E50")
            else:
                instructions_ws[f'A{i}'] = instruction[0]
                instructions_ws[f'A{i}'].font = Font(size=11)
        
        instructions_ws.column_dimensions['A'].width = 100
    
    def _create_accounts_sheet(self, wb: Workbook):
        """Create the accounts data entry sheet"""
        accounts_ws = wb.create_sheet("Accounts", 1)
        accounts_ws.sheet_properties.tabColor = "4CAF50"
        
        # Headers
        headers = ["Account Name*", "Institution*", "Account Type*", "Account Category*", "Notes"]
        for col, header in enumerate(headers, start=1):
            cell = accounts_ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border
        
        # Sample data
        sample_data = [
            ["My 401k", "Fidelity", "401k", "retirement", "Primary retirement account"],
            ["Joint Brokerage", "Vanguard", "Taxable", "brokerage", "Shared with spouse"],
            ["Emergency Fund", "Ally Bank", "Savings", "cash", "6 months expenses"],
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                cell = accounts_ws.cell(row=row_idx, column=col_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill
        
        # Empty rows for user input
        for row_idx in range(5, 30):  # 25 empty rows
            for col_idx in range(1, 6):
                cell = accounts_ws.cell(row=row_idx, column=col_idx, value="")
                cell.border = self.border
                if col_idx <= 4:  # Required fields
                    cell.fill = self.required_fill
        
        # Add data validations
        self._add_institution_validation(accounts_ws)
        self._add_account_type_validation(accounts_ws)
        self._add_category_validation(accounts_ws)
        
        # Adjust column widths
        column_widths = {
            'A': 25,  # Account Name
            'B': 20,  # Institution
            'C': 15,  # Account Type
            'D': 18,  # Account Category
            'E': 40   # Notes
        }
        
        for col, width in column_widths.items():
            accounts_ws.column_dimensions[col].width = width
        
        # Freeze header row
        accounts_ws.freeze_panes = 'A2'
        
        # Add note at bottom
        note_row = 32
        accounts_ws.merge_cells(f'A{note_row}:E{note_row}')
        accounts_ws[f'A{note_row}'] = "Note: Yellow cells are required. The first 3 rows show examples - you can delete or modify them."
        accounts_ws[f'A{note_row}'].font = Font(italic=True, size=10, color="666666")
        accounts_ws[f'A{note_row}'].alignment = Alignment(horizontal="center")
    
    def _add_institution_validation(self, ws):
        """Add institution dropdown validation"""
        institutions = INSTITUTION_LIST  # This will come from your constants
        
        # Excel has a character limit for validation lists, so we'll use a formula reference
        # if the list is too long
        institution_list = ",".join(institutions)
        
        if len(institution_list) > 255:
            # Create a hidden sheet for the institution list
            hidden_ws = ws.parent.create_sheet("InstitutionList")
            hidden_ws.sheet_state = 'hidden'
            
            for idx, inst in enumerate(institutions, start=1):
                hidden_ws.cell(row=idx, column=1, value=inst)
            
            # Reference the range in the validation
            formula = f"InstitutionList!$A$1:$A${len(institutions)}"
            institution_dv = DataValidation(
                type="list",
                formula1=formula,
                allow_blank=False,
                showDropDown=True
            )
        else:
            institution_dv = DataValidation(
                type="list",
                formula1=f'"{institution_list}"',
                allow_blank=False,
                showDropDown=True
            )
        
        institution_dv.error = "Please select an institution from the dropdown list."
        institution_dv.errorTitle = "Invalid Institution"
        institution_dv.add('B2:B30')
        ws.add_data_validation(institution_dv)
    
    def _add_account_type_validation(self, ws):
        """Add account type dropdown validation"""
        account_types = ACCOUNT_TYPES  # From your constants
        
        type_dv = DataValidation(
            type="list",
            formula1=f'"{",".join(account_types)}"',
            allow_blank=False,
            showDropDown=True,
            errorTitle="Invalid Account Type",
            error="Please select an account type from the dropdown list."
        )
        type_dv.add('C2:C30')
        ws.add_data_validation(type_dv)
    
    def _add_category_validation(self, ws):
        """Add category dropdown validation"""
        categories = ACCOUNT_CATEGORIES  # From your constants
        
        category_dv = DataValidation(
            type="list",
            formula1=f'"{",".join(categories)}"',
            allow_blank=False,
            showDropDown=True,
            errorTitle="Invalid Category",
            error="Please select a category from the dropdown list."
        )
        category_dv.add('D2:D30')
        ws.add_data_validation(category_dv)
    
    async def create_positions_template(self, user_id: int, database) -> io.BytesIO:
        """
        Creates a positions import template customized with user's accounts
        """
        # Fetch user's accounts from database
        query = """
        SELECT id, account_name, type, account_category 
        FROM accounts 
        WHERE user_id = :user_id
        ORDER BY account_name
        """
        accounts = await database.fetch_all(query=query, values={"user_id": user_id})
        
        if not accounts:
            raise ValueError("No accounts found. Please create accounts before downloading positions template.")
        
        wb = Workbook()
        wb.remove(wb.active)
        
        # Create sheets
        self._create_positions_instructions_sheet(wb)
        self._create_accounts_reference_sheet(wb, accounts)
        self._create_securities_sheet(wb, accounts)
        self._create_cash_sheet(wb, accounts)
        self._create_crypto_sheet(wb, accounts)
        self._create_metals_sheet(wb, accounts)
        self._create_real_estate_sheet(wb, accounts)
        
        # Save to BytesIO
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        return output
    
    def _create_positions_instructions_sheet(self, wb: Workbook):
        """Create instructions for positions template"""
        # Similar to accounts instructions but for positions
        pass
    
    def _create_accounts_reference_sheet(self, wb: Workbook, accounts: List[Dict]):
        """Create reference sheet showing user's accounts"""
        ref_ws = wb.create_sheet("Your Accounts (Reference)", 0)
        ref_ws.sheet_properties.tabColor = "FF9800"
        
        # Headers
        headers = ["Account Name", "Type", "Category", "Account ID"]
        for col, header in enumerate(headers, start=1):
            cell = ref_ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border
        
        # Account data
        for row_idx, account in enumerate(accounts, start=2):
            ref_ws.cell(row=row_idx, column=1, value=account['account_name']).border = self.border
            ref_ws.cell(row=row_idx, column=2, value=account['type']).border = self.border
            ref_ws.cell(row=row_idx, column=3, value=account['account_category']).border = self.border
            ref_ws.cell(row=row_idx, column=4, value=account['id']).border = self.border
        
        # Adjust column widths
        for col in ['A', 'B', 'C', 'D']:
            ref_ws.column_dimensions[col].width = 20
        
        # Freeze header
        ref_ws.freeze_panes = 'A2'
    
    def _create_securities_sheet(self, wb: Workbook, accounts: List[Dict]):
        """Create securities positions sheet"""
        # Filter accounts that can hold securities
        valid_accounts = [acc for acc in accounts if acc['account_category'] in ['brokerage', 'retirement']]
        
        sec_ws = wb.create_sheet("Securities", 1)
        sec_ws.sheet_properties.tabColor = "4CAF50"
        
        # Create sheet with account dropdown
        # ... (similar pattern for other sheets)