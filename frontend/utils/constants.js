// frontend/utils/constants.js

// Top 50 financial institutions including traditional brokerages, banks, and crypto platforms
// Extracted from original portfolio.js
export const popularBrokerages = [
    // Traditional Brokerages & Investment Firms
    { name: "Vanguard", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Vanguard_Group_logo.svg/240px-Vanguard_Group_logo.svg.png" },
    { name: "Fidelity", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Fidelity_Investments_logo.svg/240px-Fidelity_Investments_logo.svg.png" },
    { name: "Charles Schwab", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Charles_Schwab_Corporation_logo.svg/240px-Charles_Schwab_Corporation_logo.svg.png" },
    { name: "TD Ameritrade", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/TD_Ameritrade.svg/240px-TD_Ameritrade.svg.png" },
    { name: "E*TRADE", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/ETrade_Logo.svg/240px-ETrade_Logo.svg.png" },
    { name: "Robinhood", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Robinhood_Logo.png/240px-Robinhood_Logo.png" },
    { name: "Interactive Brokers", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Interactive_Brokers_Logo.svg/240px-Interactive_Brokers_Logo.svg.png" },
    { name: "Merrill Lynch", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Merrill_Lynch_logo.svg/240px-Merrill_Lynch_logo.svg.png" },
    { name: "T. Rowe Price", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/T._Rowe_Price_logo.svg/240px-T._Rowe_Price_logo.svg.png" },
    { name: "Ally Invest", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ally_Financial_logo.svg/240px-Ally_Financial_logo.svg.png" },
    
    // Major Banks
    { name: "JPMorgan Chase", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/J.P._Morgan_logo_2008_SQUARE.svg/240px-J.P._Morgan_logo_2008_SQUARE.svg.png" },
    { name: "Bank of America", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bank_of_America_logo.svg/240px-Bank_of_America_logo.svg.png" },
    { name: "Wells Fargo", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Wells_Fargo_Bank.svg/240px-Wells_Fargo_Bank.svg.png" },
    { name: "Citibank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Citibank.svg/240px-Citibank.svg.png" },
    { name: "Goldman Sachs", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Goldman_Sachs.svg/240px-Goldman_Sachs.svg.png" },
    { name: "Morgan Stanley", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Morgan_Stanley_Logo_1.svg/240px-Morgan_Stanley_Logo_1.svg.png" },
    { name: "HSBC", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/240px-HSBC_logo_%282018%29.svg.png" },
    { name: "Capital One", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Capital_One_logo.svg/240px-Capital_One_logo.svg.png" },
    { name: "PNC Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/PNC_Financial_Services_logo.svg/240px-PNC_Financial_Services_logo.svg.png" },
    { name: "US Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/U.S._Bank_logo.svg/240px-U.S._Bank_logo.svg.png" },
    
    // Crypto Exchanges
    { name: "Coinbase", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coinbase_logo.svg/240px-Coinbase_logo.svg.png" },
    { name: "Binance", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Binance_Logo.svg/240px-Binance_Logo.svg.png" },
    { name: "Kraken", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kraken_logo.svg/240px-Kraken_logo.svg.png" },
    { name: "Gemini", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Gemini_logo.svg/240px-Gemini_logo.svg.png" },
    { name: "Crypto.com", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Crypto.com_logo.svg/240px-Crypto.com_logo.svg.png" },
    { name: "Bitstamp", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bitstamp_Logo.svg/240px-Bitstamp_Logo.svg.png" },
    
    // International & Other
    { name: "Barclays", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Barclays_logo.svg/240px-Barclays_logo.svg.png" },
    { name: "Deutsche Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Deutsche_Bank_logo_without_wordmark.svg/240px-Deutsche_Bank_logo_without_wordmark.svg.png" },
    { name: "UBS", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/UBS_Logo.svg/240px-UBS_Logo.svg.png" },
    { name: "Credit Suisse", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Credit_Suisse_2022_logo.svg/240px-Credit_Suisse_2022_logo.svg.png" },
    { name: "RBC", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Royal_Bank_of_Canada_logo.svg/240px-Royal_Bank_of_Canada_logo.svg.png" },
    { name: "TD Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Toronto-Dominion_Bank_logo.svg/240px-Toronto-Dominion_Bank_logo.svg.png" },
    { name: "Scotiabank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Scotiabank_Logo.svg/240px-Scotiabank_Logo.svg.png" },
    { name: "ING", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/ING_Group_N.V._Logo.svg/240px-ING_Group_N.V._Logo.svg.png" },
    { name: "BBVA", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/BBVA_2019.svg/240px-BBVA_2019.svg.png" },
    { name: "Santander", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Santander_Bank_logo.svg/240px-Santander_Bank_logo.svg.png" },
    
    // Additional Financial Institutions
    { name: "American Express", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/240px-American_Express_logo_%282018%29.svg.png" },
    { name: "Discover", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Discover_Financial_Services_logo.svg/240px-Discover_Financial_Services_logo.svg.png" },
    { name: "M1 Finance", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/M1_Finance_Logo.svg/240px-M1_Finance_Logo.svg.png" },
    { name: "Wealthsimple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Wealthsimple_Logo.svg/240px-Wealthsimple_Logo.svg.png" },
    { name: "State Street", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/State_Street_Corporation_logo.svg/240px-State_Street_Corporation_logo.svg.png" },
    { name: "BNY Mellon", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/BNY_Mellon_logo.svg/240px-BNY_Mellon_logo.svg.png" },
    { name: "BlackRock", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/BlackRock_wordmark.svg/240px-BlackRock_wordmark.svg.png" },
    { name: "Northern Trust", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Northern_Trust_logo.svg/240px-Northern_Trust_logo.svg.png" },
    { name: "Truist", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Truist_Logo.svg/240px-Truist_Logo.svg.png" },
    { name: "Citizens Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Citizens_Bank.svg/240px-Citizens_Bank.svg.png" },
    { name: "Fifth Third Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Fifth_Third_Bank_logo.svg/240px-Fifth_Third_Bank_logo.svg.png" },
    { name: "Huntington Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Huntington_Bancshares_logo.svg/240px-Huntington_Bancshares_logo.svg.png" },
    { name: "KeyBank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/KeyBank_logo.svg/240px-KeyBank_logo.svg.png" },
    { name: "M&T Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/M%26T_Bank_logo.svg/240px-M%26T_Bank_logo.svg.png" }
  ];
  
  // You could add other constants here as needed, e.g.:
  // export const ACCOUNT_CATEGORIES = ['brokerage', 'retirement', 'cash', 'other'];
  // export const METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item'];