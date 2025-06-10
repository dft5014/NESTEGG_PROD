# backend/utils/constants.py
"""
Constants extracted from frontend constants.js
"""

INSTITUTION_LIST = [
    # Traditional Brokerages & Investment Firms
    "Vanguard", "Fidelity", "Charles Schwab", "TD Ameritrade", "E*TRADE",
    "Robinhood", "Interactive Brokers", "Merrill Lynch", "T. Rowe Price",
    "Ally Invest",
    
    # Major Banks
    "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank",
    "Goldman Sachs", "Morgan Stanley", "HSBC", "Capital One", "PNC Bank",
    "US Bank",
    
    # Crypto Exchanges
    "Coinbase", "Binance", "Kraken", "Gemini", "Crypto.com", "Bitstamp",
    
    # International & Other
    "Barclays", "Deutsche Bank", "UBS", "Credit Suisse", "RBC", "TD Bank",
    "Scotiabank", "ING", "BBVA", "Santander",
    
    # Additional Financial Institutions
    "American Express", "Discover", "M1 Finance", "Wealthsimple",
    "State Street", "BNY Mellon", "BlackRock", "Northern Trust", "Truist",
    "Citizens Bank",
    
    # New Additions
    "River Financial", "Public.com", "SoFi", "PayPal", "Venmo",
    
    # Generic Options
    "Other", "None", "Self-Directed/Custom"
]

ACCOUNT_TYPES = [
    "401k", "Traditional IRA", "Roth IRA", "Taxable", "529", "HSA",
    "Pension", "Savings", "Checking", "Money Market", "CD", "Other"
]

ACCOUNT_CATEGORIES = [
    'brokerage', 'retirement', 'cash', 'crypto', 'metals', 'realestate', 'other'
]

METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item']

CASH_TYPES = ['Savings', 'Checking', 'Money Market', 'CD', 'Treasury', 'Other']

INTEREST_PERIODS = ['daily', 'monthly', 'quarterly', 'annually', 'at_maturity', 'none']

CRYPTO_STORAGE_TYPES = ['Exchange', 'Hot Wallet', 'Cold Wallet', 'DeFi Protocol']

PROPERTY_TYPES = ['Primary Home', 'Rental', 'Vacation Home', 'Commercial', 'Land', 'REIT (Physical)', 'Other']

