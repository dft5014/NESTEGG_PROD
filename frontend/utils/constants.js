// frontend/utils/constants.js

// Top financial institutions including traditional brokerages, banks, and crypto platforms
// Users can enter custom institution names if theirs is not in this list
export const popularBrokerages = [
  // Traditional Brokerages & Investment Firms
  { name: "Vanguard", logo: "https://logos-world.net/wp-content/uploads/2021/02/Vanguard-Logo-700x394.png" },
  { name: "Fidelity", logo: "https://logos-world.net/wp-content/uploads/2021/03/Fidelity-Logo-700x394.png" },
  { name: "Charles Schwab", logo: "https://logos-world.net/wp-content/uploads/2021/02/Charles-Schwab-Logo-700x394.png" },
  { name: "TD Ameritrade", logo: "https://logos-world.net/wp-content/uploads/2021/02/TD-Ameritrade-Logo-700x394.png" },
  { name: "E*TRADE", logo: "https://logos-world.net/wp-content/uploads/2021/02/ETRADE-Logo-700x394.png" },
  { name: "Robinhood", logo: "https://logos-world.net/wp-content/uploads/2021/02/Robinhood-Logo-700x394.png" },
  { name: "Interactive Brokers", logo: "https://logos-world.net/wp-content/uploads/2021/02/Interactive-Brokers-Logo-700x394.png" },
  { name: "Merrill Lynch", logo: "https://logos-world.net/wp-content/uploads/2021/02/Merrill-Lynch-Logo-700x394.png" },
  { name: "T. Rowe Price", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/T._Rowe_Price_logo.svg/240px-T._Rowe_Price_logo.svg.png" },
  { name: "Ally Invest", logo: "https://logos-world.net/wp-content/uploads/2021/02/Ally-Logo-700x394.png" },
  
  // Major Banks
  { name: "JPMorgan Chase", logo: "https://logos-world.net/wp-content/uploads/2021/02/JPMorgan-Chase-Logo-700x394.png" },
  { name: "Bank of America", logo: "https://logos-world.net/wp-content/uploads/2021/02/Bank-of-America-Logo-700x394.png" },
  { name: "Wells Fargo", logo: "https://logos-world.net/wp-content/uploads/2021/02/Wells-Fargo-Logo-700x394.png" },
  { name: "Citibank", logo: "https://logos-world.net/wp-content/uploads/2021/02/Citibank-Logo-700x394.png" },
  { name: "Goldman Sachs", logo: "https://logos-world.net/wp-content/uploads/2021/02/Goldman-Sachs-Logo-700x394.png" },
  { name: "Morgan Stanley", logo: "https://logos-world.net/wp-content/uploads/2021/02/Morgan-Stanley-Logo-700x394.png" },
  { name: "HSBC", logo: "https://logos-world.net/wp-content/uploads/2021/02/HSBC-Logo-700x394.png" },
  { name: "Capital One", logo: "https://logos-world.net/wp-content/uploads/2021/02/Capital-One-Logo-700x394.png" },
  { name: "PNC Bank", logo: "https://logos-world.net/wp-content/uploads/2021/02/PNC-Bank-Logo-700x394.png" },
  { name: "US Bank", logo: "https://logos-world.net/wp-content/uploads/2021/02/US-Bank-Logo-700x394.png" },
  
  // Crypto Exchanges
  { name: "Coinbase", logo: "https://logos-world.net/wp-content/uploads/2021/02/Coinbase-Logo-700x394.png" },
  { name: "Binance", logo: "https://logos-world.net/wp-content/uploads/2021/02/Binance-Logo-700x394.png" },
  { name: "Kraken", logo: "https://logos-world.net/wp-content/uploads/2021/02/Kraken-Logo-700x394.png" },
  { name: "Gemini", logo: "https://logos-world.net/wp-content/uploads/2021/02/Gemini-Logo-700x394.png" },
  { name: "Crypto.com", logo: "https://logos-world.net/wp-content/uploads/2021/02/Crypto-com-Logo-700x394.png" },
  { name: "Bitstamp", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bitstamp_Logo.svg/240px-Bitstamp_Logo.svg.png" },
  
  // International & Other
  { name: "Barclays", logo: "https://logos-world.net/wp-content/uploads/2021/02/Barclays-Logo-700x394.png" },
  { name: "Deutsche Bank", logo: "https://logos-world.net/wp-content/uploads/2021/02/Deutsche-Bank-Logo-700x394.png" },
  { name: "UBS", logo: "https://logos-world.net/wp-content/uploads/2021/02/UBS-Logo-700x394.png" },
  { name: "Credit Suisse", logo: "https://logos-world.net/wp-content/uploads/2021/02/Credit-Suisse-Logo-700x394.png" },
  { name: "RBC", logo: "https://logos-world.net/wp-content/uploads/2021/02/Royal-Bank-of-Canada-Logo-700x394.png" },
  { name: "TD Bank", logo: "https://logos-world.net/wp-content/uploads/2021/02/TD-Bank-Logo-700x394.png" },
  { name: "Scotiabank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Scotiabank_Logo.svg/240px-Scotiabank_Logo.svg.png" },
  { name: "ING", logo: "https://logos-world.net/wp-content/uploads/2021/02/ING-Logo-700x394.png" },
  { name: "BBVA", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/BBVA_2019.svg/240px-BBVA_2019.svg.png" },
  { name: "Santander", logo: "https://logos-world.net/wp-content/uploads/2021/02/Santander-Logo-700x394.png" },
  
  // Additional Financial Institutions
  { name: "American Express", logo: "https://logos-world.net/wp-content/uploads/2021/02/American-Express-Logo-700x394.png" },
  { name: "Discover", logo: "https://logos-world.net/wp-content/uploads/2021/02/Discover-Logo-700x394.png" },
  { name: "M1 Finance", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/M1_Finance_Logo.svg/240px-M1_Finance_Logo.svg.png" },
  { name: "Wealthsimple", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Wealthsimple_Logo.svg/240px-Wealthsimple_Logo.svg.png" },
  { name: "State Street", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/State_Street_Corporation_logo.svg/240px-State_Street_Corporation_logo.svg.png" },
  { name: "BNY Mellon", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/BNY_Mellon_logo.svg/240px-BNY_Mellon_logo.svg.png" },
  { name: "BlackRock", logo: "https://logos-world.net/wp-content/uploads/2021/02/BlackRock-Logo-700x394.png" },
  { name: "Northern Trust", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Northern_Trust_logo.svg/240px-Northern_Trust_logo.svg.png" },
  { name: "Truist", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Truist_Logo.svg/240px-Truist_Logo.svg.png" },
  { name: "Citizens Bank", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Citizens_Bank.svg/240px-Citizens_Bank.svg.png" },
  
  // New Additions
  { name: "River Financial", logo: "https://river.com/images/logo.svg" },
  { name: "Public.com", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Public.com_logo.svg/240px-Public.com_logo.svg.png" },
  { name: "SoFi", logo: "https://logos-world.net/wp-content/uploads/2021/02/SoFi-Logo-700x394.png" },
  { name: "Other", logo: null },
  { name: "None", logo: null },
  { name: "Self-Directed/Custom", logo: null }
];

// You could add other constants here as needed, e.g.:
export const ACCOUNT_CATEGORIES = ['brokerage', 'retirement', 'cash', 'crypto', 'metals', 'realestate', 'other'];
export const METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item'];

// This comment can be displayed in the UI to inform users:
// "Don't see your institution? You can type any custom name to override this list."