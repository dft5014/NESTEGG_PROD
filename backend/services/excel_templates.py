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
        
        # Headers - match Quick Add UI order (Category before Type)
        headers = ["Account Name*", "Institution*", "Account Category*", "Account Type*"]
        for col, header in enumerate(headers, start=1):
            cell = accounts_ws.cell(row=1, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.alignment = self.header_alignment
            cell.border = self.border
        
        # Sample data - updated to match new column order and valid values
        sample_data = [
            ["My 401k", "Fidelity", "retirement", "401(k)"],
            ["Joint Brokerage", "Vanguard", "brokerage", "Joint"],
            ["Emergency Fund", "Ally Invest", "cash", "High Yield Savings"],
            ["Bitcoin Wallet", "Coinbase", "cryptocurrency", "Exchange Account"],
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                cell = accounts_ws.cell(row=row_idx, column=col_idx, value=value)
                cell.border = self.border
                cell.fill = self.sample_fill
        
        # Empty rows for user input
        for row_idx in range(6, 50):  # More rows for larger imports
            for col_idx in range(1, 5):  # 4 columns now
                cell = accounts_ws.cell(row=row_idx, column=col_idx, value="")
                cell.border = self.border
                if col_idx <= 4:  # All fields are required
                    cell.fill = self.required_fill
        
        # Create validation lists sheet first
        self._create_validation_lists_sheet(wb)
        
        # Add data validations
        self._add_institution_validation_named_range(accounts_ws)
        self._add_category_validation_named_range(accounts_ws)
        self._add_account_type_validation_with_message(accounts_ws)
        
        # Adjust column widths
        column_widths = {
            'A': 30,  # Account Name
            'B': 25,  # Institution
            'C': 20,  # Account Category
            'D': 25,  # Account Type
        }
        
        for col, width in column_widths.items():
            accounts_ws.column_dimensions[col].width = width
        
        # Freeze header row
        accounts_ws.freeze_panes = 'A2'
        
        # Add helpful notes at bottom
        note_row = 52
        accounts_ws.merge_cells(f'A{note_row}:D{note_row}')
        accounts_ws[f'A{note_row}'] = "Note: Yellow cells are required. The first 4 rows show examples - you can delete or modify them."
        accounts_ws[f'A{note_row}'].font = Font(italic=True, size=10, color="666666")
        accounts_ws[f'A{note_row}'].alignment = Alignment(horizontal="center")
        
        # Add category-type relationship note
        note_row2 = 54
        accounts_ws.merge_cells(f'A{note_row2}:D{note_row2}')
        accounts_ws[f'A{note_row2}'] = "Important: Account Type options depend on the Category selected. See 'Category-Type Reference' tab for valid combinations."
        accounts_ws[f'A{note_row2}'].font = Font(italic=True, size=10, color="CC0000")
        accounts_ws[f'A{note_row2}'].alignment = Alignment(horizontal="center")
        
        # Add custom institution note
        note_row3 = 56
        accounts_ws.merge_cells(f'A{note_row3}:D{note_row3}')
        accounts_ws[f'A{note_row3}'] = "Tip: If your institution isn't listed, you can type a custom name in the Institution field."
        accounts_ws[f'A{note_row3}'].font = Font(italic=True, size=10, color="0066CC")
        accounts_ws[f'A{note_row3}'].alignment = Alignment(horizontal="center")

    def _add_account_type_validation_with_message(self, ws):
        """Add account type validation with helpful message"""
        # Since Excel doesn't support dynamic dropdowns easily, we'll add all valid types
        # and use a message to guide users
        all_types = []
        for types in ACCOUNT_TYPES_BY_CATEGORY.values():
            all_types.extend(types)
        # Remove duplicates while preserving order
        all_types = list(dict.fromkeys(all_types))
        
        type_dv = DataValidation(
            type="list",
            formula1=f'"{",".join(all_types)}"',
            allow_blank=False,
            showDropDown=True,
            showInputMessage=True,
            inputTitle="Select Account Type",
            inputMessage="Choose a type that matches your selected category. See 'Category-Type Reference' tab for valid combinations.",
            errorTitle="Invalid Account Type",
            error="Please select a valid account type for your chosen category."
        )
        type_dv.add('D2:D50')
        ws.add_data_validation(type_dv)

    def _create_category_type_reference(self, wb: Workbook):
        """Create reference sheet showing valid type combinations"""
        ref_ws = wb.create_sheet("Category-Type Reference", 3)
        ref_ws.sheet_properties.tabColor = "FFC107"
        
        # Title
        ref_ws.merge_cells('A1:C1')
        ref_ws['A1'] = "Valid Account Types by Category"
        ref_ws['A1'].font = Font(bold=True, size=14, color="2C3E50")
        ref_ws['A1'].alignment = Alignment(horizontal="center")
        
        row = 3
        for category, types in ACCOUNT_TYPES_BY_CATEGORY.items():
            # Category header
            ref_ws.cell(row=row, column=1, value=category.replace('_', ' ').title())
            ref_ws.cell(row=row, column=1).font = Font(bold=True, size=12, color="FFFFFF")
            ref_ws.cell(row=row, column=1).fill = PatternFill(start_color="34495E", end_color="34495E", fill_type="solid")
            ref_ws.merge_cells(f'A{row}:C{row}')
            
            # Types for this category
            for type_name in types:
                row += 1
                ref_ws.cell(row=row, column=2, value=type_name)
                ref_ws.cell(row=row, column=2).border = self.border
                
                # Add a checkmark to show it's valid
                ref_ws.cell(row=row, column=3, value="✓")
                ref_ws.cell(row=row, column=3).font = Font(color="27AE60", bold=True)
                ref_ws.cell(row=row, column=3).alignment = Alignment(horizontal="center")
            
            row += 2  # Space between categories
        
        # Adjust column widths
        ref_ws.column_dimensions['A'].width = 25
        ref_ws.column_dimensions['B'].width = 30
        ref_ws.column_dimensions['C'].width = 10
        
        # Freeze the title row
        ref_ws.freeze_panes = 'A2'

    
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