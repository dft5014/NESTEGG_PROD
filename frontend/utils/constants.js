// frontend/utils/constants.js

// Top financial institutions including traditional brokerages, banks, and crypto platforms
// Users can enter custom institution names if theirs is not in this list
export const popularBrokerages = [
  // Traditional Brokerages & Investment Firms
  { name: "Vanguard", logo: "https://cdn.brandfetch.io/idf3bcOruF/w/340/h/340/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Fidelity", logo: "https://cdn.brandfetch.io/idzIUUVEBm/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Charles Schwab", logo: "https://cdn.brandfetch.io/idizW08khf/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "TD Ameritrade", logo: "https://cdn.brandfetch.io/idn9NyGE6E/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "E*TRADE", logo: "https://cdn.brandfetch.io/idqkyPyVIF/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Robinhood", logo: "https://cdn.brandfetch.io/id3WzK3p17/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Interactive Brokers", logo: "https://cdn.brandfetch.io/idcABCQwX-/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Merrill Lynch", logo: "https://cdn.brandfetch.io/idYBqNSmTx/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "T. Rowe Price", logo: "https://cdn.brandfetch.io/idwrcDPtwt/w/153/h/153/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Ally Invest", logo: "https://cdn.brandfetch.io/idI-Y5B6sm/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Raymond James", logo: "https://cdn.brandfetch.io/idfD3yY14s/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Muriel Siebert", logo: "https://cdn.brandfetch.io/idviqPU3Nu/w/500/h/500/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Major Banks
  { name: "JPMorgan Chase", logo: "https://cdn.brandfetch.io/idudVYts5w/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Bank of America", logo: "https://cdn.brandfetch.io/ide4lTCz-B/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Wells Fargo", logo: "https://cdn.brandfetch.io/idVCed0KqE/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Citibank", logo: "https://cdn.brandfetch.io/id5D8Mhy2O/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Goldman Sachs", logo: "https://cdn.brandfetch.io/id7L59h6d0/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Morgan Stanley", logo: "https://cdn.brandfetch.io/idBGtJQnXa/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "HSBC", logo: "https://cdn.brandfetch.io/idQWSx-Tfz/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Capital One", logo: "https://cdn.brandfetch.io/idYFfMZte4/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "PNC Bank", logo: "https://cdn.brandfetch.io/idKyi1joER/w/300/h/300/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "US Bank", logo: "https://cdn.brandfetch.io/id6EVneWal/w/360/h/360/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Crypto Exchanges
  { name: "Coinbase", logo: "https://cdn.brandfetch.io/idwDWo4ONQ/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Binance", logo: "https://cdn.brandfetch.io/id-pjrLx_q/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Kraken", logo: "https://cdn.brandfetch.io/idYQrXoH-Q/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Gemini", logo: "https://cdn.brandfetch.io/id08hfGdfR/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Crypto.com", logo: "https://cdn.brandfetch.io/idpjmprSKf/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Bitstamp", logo: "https://cdn.brandfetch.io/idshfikpus/w/748/h/187/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Uphold", logo: "https://cdn.brandfetch.io/idtqeCHW1H/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // International & Other
  { name: "Barclays", logo: "https://cdn.brandfetch.io/id4ARY8hPv/w/199/h/199/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Deutsche Bank", logo: "https://cdn.brandfetch.io/id5PmMuE2j/w/1080/h/1080/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "UBS", logo: "https://cdn.brandfetch.io/idfWi_8mFJ/w/302/h/302/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Credit Suisse", logo: "https://cdn.brandfetch.io/id5R0NevJp/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "RBC", logo: "https://cdn.brandfetch.io/id5An5c05A/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "TD Bank", logo: "https://cdn.brandfetch.io/id6wH4wcFV/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Scotiabank", logo: "https://cdn.brandfetch.io/idpIpGPfn2/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "ING", logo: "https://cdn.brandfetch.io/idNsVA30h5/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "BBVA", logo: "https://cdn.brandfetch.io/idAyM3byp7/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Santander", logo: "https://cdn.brandfetch.io/idiIL9mteL/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Additional Financial Institutions
  { name: "American Express", logo: "https://cdn.brandfetch.io/id5WXF6Iyd/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Discover", logo: "https://cdn.brandfetch.io/idyXDiKxGF/w/319/h/319/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "M1 Finance", logo: "https://cdn.brandfetch.io/idIM2ypDHO/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Wealthsimple", logo: "https://cdn.brandfetch.io/idGd_QSOaB/w/300/h/300/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "State Street", logo: "https://cdn.brandfetch.io/ideYkrIcbi/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "BNY Mellon", logo: "https://cdn.brandfetch.io/idtafkJRw9/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "BlackRock", logo: "https://cdn.brandfetch.io/idFVE9LGae/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Northern Trust", logo: "https://cdn.brandfetch.io/idI-8Kbkow/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Truist", logo: "https://cdn.brandfetch.io/idWhFVqLoy/w/180/h/180/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Citizens Bank", logo: "https://cdn.brandfetch.io/idM3CAp7wS/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Newer Platforms
  { name: "River Financial", logo: "https://cdn.brandfetch.io/id-MFa5JSr/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Public.com", logo: "https://cdn.brandfetch.io/idFU-B1h_2/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "SoFi", logo: "https://cdn.brandfetch.io/idtFgUuCT8/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "PayPal", logo: "https://cdn.brandfetch.io/id-Wd4a4TS/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Venmo", logo: "https://cdn.brandfetch.io/idzxDKVd5k/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Specialized Platforms
  { name: "iTrustCapital", logo: "https://cdn.brandfetch.io/idO1rlg2to/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Money Metals Exchange", logo: "https://cdn.brandfetch.io/idlGDYopj6/w/200/h/200/theme/dark/logo.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Credit Unions
  { name: "PSECU", logo: "https://cdn.brandfetch.io/id-989KUqr/w/180/h/180/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "PenFed Credit Union", logo: "https://cdn.brandfetch.io/idd5CjbQjj/w/200/h/200/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  
  // Custom Options
  { name: "Other", logo: null },
  { name: "None", logo: null },
  { name: "Self-Directed/Custom", logo: null },
];


// Additional constants for application use
export const ACCOUNT_CATEGORIES = ['brokerage', 'retirement', 'cash', 'crypto', 'metals', 'realestate', 'other'];
export const METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item'];

// Note to display in UI when choosing an institution:
// "Don't see your institution? You can type any custom name."