# backend/utils/constants.py
"""
Constants extracted from frontend constants.js
"""

# Institution list
INSTITUTION_LIST = [
    # Traditional Brokerages & Investment Firms
    "Vanguard",
    "Fidelity",
    "Charles Schwab",
    "TD Ameritrade",
    "E*TRADE",
    "Robinhood",
    "Interactive Brokers",
    "Merrill Lynch",
    "T. Rowe Price",
    "Ally Invest",
    "Raymond James",
    "Muriel Siebert",
    
    # Major Banks
    "JPMorgan Chase",
    "Bank of America",
    "Wells Fargo",
    "Citibank",
    "Goldman Sachs",
    "Morgan Stanley",
    "HSBC",
    "Capital One",
    "PNC Bank",
    "US Bank",
    
    # Crypto Exchanges
    "Coinbase",
    "Binance",
    "Kraken",
    "Gemini",
    "Crypto.com",
    "Bitstamp",
    "Uphold",
    
    # International & Other
    "Barclays",
    "Deutsche Bank",
    "UBS",
    "Credit Suisse",
    "RBC",
    "TD Bank",
    "Scotiabank",
    "ING",
    "BBVA",
    "Santander",
    
    # Additional Financial Institutions
    "American Express",
    "Discover",
    "M1 Finance",
    "Wealthsimple",
    "State Street",
    "BNY Mellon",
    "BlackRock",
    "Northern Trust",
    "Truist",
    "Citizens Bank",
    
    # Newer Platforms
    "River Financial",
    "Public.com",
    "SoFi",
    "PayPal",
    "Venmo",
    
    # Specialized Platforms
    "iTrustCapital",
    "Money Metals Exchange",
    
    # Credit Unions
    "PSECU",
    "PenFed Credit Union",
    
    # Custom Options
    "Other",
    "None",
    "Self-Directed/Custom"
]

# Account categories
ACCOUNT_CATEGORIES = [
    "brokerage",
    "retirement", 
    "cash",
    "cryptocurrency",
    "metals",
    "real_estate"
]

# Account types by category - must match QuickStartModal exactly
ACCOUNT_TYPES_BY_CATEGORY = {
    "brokerage": [
        "Individual",
        "Joint", 
        "Custodial",
        "Trust",
        "Other Brokerage"
    ],
    "retirement": [
        "Traditional IRA",
        "Roth IRA",
        "401(k)",
        "Roth 401(k)",
        "SEP IRA",
        "SIMPLE IRA",
        "403(b)",
        "Pension",
        "HSA",
        "Other Retirement"
    ],
    "cash": [
        "Checking",
        "Savings",
        "High Yield Savings",
        "Money Market",
        "Certificate of Deposit (CD)",
        "Other Cash"
    ],
    "cryptocurrency": [
        "Exchange Account",
        "Hardware Wallet",
        "Software Wallet",
        "Cold Storage",
        "Other Crypto"
    ],
    "metals": [
        "Home Storage",
        "Safe Deposit Box",
        "Third-Party Vault",
        "Allocated Storage",
        "Unallocated Storage",
        "Other Metals"
    ],
    "real_estate": [
        "Primary Residence",
        "Vacation Home",
        "Rental Property",
        "Commercial Property",
        "Land",
        "REIT",
        "Other Real Estate"
    ]
}

# Flatten all account types into a single list (for Excel validation)
# THIS MUST COME AFTER ACCOUNT_TYPES_BY_CATEGORY IS DEFINED
ACCOUNT_TYPES = []
for types in ACCOUNT_TYPES_BY_CATEGORY.values():
    ACCOUNT_TYPES.extend(types)
# Remove duplicates while preserving order
ACCOUNT_TYPES = list(dict.fromkeys(ACCOUNT_TYPES))

# Other constants
METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item']

CASH_TYPES = ['Savings', 'Checking', 'Money Market', 'CD', 'Treasury', 'Other']

INTEREST_PERIODS = ['daily', 'monthly', 'quarterly', 'annually', 'at_maturity', 'none']

CRYPTO_STORAGE_TYPES = ['Exchange', 'Hot Wallet', 'Cold Wallet', 'DeFi Protocol']

PROPERTY_TYPES = ['Primary Home', 'Rental', 'Vacation Home', 'Commercial', 'Land', 'REIT (Physical)', 'Other']