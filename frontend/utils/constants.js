// frontend/utils/constants.js

// Top financial institutions including traditional brokerages, banks, and crypto platforms
// Users can enter custom institution names if theirs is not in this list
export const popularBrokerages = [
  // Traditional Brokerages & Investment Firms
  { name: "Vanguard", logo: "https://cdn.brandfetch.io/idU5TQy0Pb/idOk4_qOv6.png" },
  { name: "Fidelity", logo: "https://cdn.brandfetch.io/idE1J2itrV/id5FLQFoLe.png" },
  { name: "Charles Schwab", logo: "https://cdn.brandfetch.io/id_lnJcTnR/id0Gy-xTT1.png" },
  { name: "TD Ameritrade", logo: "https://cdn.brandfetch.io/idM6CJM3o/id1xyKBGzM.png" },
  { name: "E*TRADE", logo: "https://cdn.brandfetch.io/ide_P6JtN/idj6pVaOzv.png" },
  { name: "Robinhood", logo: "https://cdn.brandfetch.io/idFXZxd7O/idBGc66k0X.png" },
  { name: "Interactive Brokers", logo: "https://cdn.brandfetch.io/idq3LNpjIH/id6qxVNZz-.png" },
  { name: "Merrill Lynch", logo: "https://cdn.brandfetch.io/ideJXTnbX/idAK4Zm9jH.png" },
  { name: "T. Rowe Price", logo: "https://cdn.brandfetch.io/idoROLPPp/idS_qWrBng.png" },
  { name: "Ally Invest", logo: "https://cdn.brandfetch.io/id4X_4Tnw/idtzMhV06c.png" },
  
  // Major Banks
  { name: "JPMorgan Chase", logo: "https://cdn.brandfetch.io/idOH5K-oD/idXgA-dOZT.png" },
  { name: "Bank of America", logo: "https://cdn.brandfetch.io/ide4lTCz-B/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Wells Fargo", logo: "https://cdn.brandfetch.io/iddpRW0DL/id5hpmP2_7.png" },
  { name: "Citibank", logo: "https://cdn.brandfetch.io/id75dIFYK/idKQh-o4Kn.png" },
  { name: "Goldman Sachs", logo: "https://cdn.brandfetch.io/idP3atDk4/idu7OLFaEI.png" },
  { name: "Morgan Stanley", logo: "https://cdn.brandfetch.io/idgTJQUxS/id7T4OxzPE.png" },
  { name: "HSBC", logo: "https://cdn.brandfetch.io/idQE5fj4b/idxLfD84YH.png" },
  { name: "Capital One", logo: "https://cdn.brandfetch.io/idU0yfHG1/idSRDKcwzx.png" },
  { name: "PNC Bank", logo: "https://cdn.brandfetch.io/idCMFh6y6/idRoUUyb43.png" },
  { name: "US Bank", logo: "https://cdn.brandfetch.io/id-EGABwW/idL1GzQEHy.png" },
  
  // Crypto Exchanges
  { name: "Coinbase", logo: "https://cdn.brandfetch.io/idwCZLQb9/idZDdD6fG-.png" },
  { name: "Binance", logo: "https://cdn.brandfetch.io/id-RLJBWt/idXc7_uCz-.png" },
  { name: "Kraken", logo: "https://cdn.brandfetch.io/idXKqpesb/id_9Pt3nfh.png" },
  { name: "Gemini", logo: "https://cdn.brandfetch.io/idGOOB1Mi/idQYgbr9_j.png" },
  { name: "Crypto.com", logo: "https://cdn.brandfetch.io/id2kcfWYr/id9sLB2eP-.png" },
  { name: "Bitstamp", logo: "https://cdn.brandfetch.io/idpdJv3GK/idAh8wXrqP.png" },
  
  // International & Other
  { name: "Barclays", logo: "https://cdn.brandfetch.io/idv0-_HG7/idJFdZf05T.png" },
  { name: "Deutsche Bank", logo: "https://cdn.brandfetch.io/idKlmWWDY/id_fZRLkG-.png" },
  { name: "UBS", logo: "https://cdn.brandfetch.io/id6H18vTD/idw_8-kUdp.png" },
  { name: "Credit Suisse", logo: "https://cdn.brandfetch.io/idrBtukKJ/ido0BnWzAV.png" },
  { name: "RBC", logo: "https://cdn.brandfetch.io/idv_X9sIU/id0HTTU2-m.png" },
  { name: "TD Bank", logo: "https://cdn.brandfetch.io/idYW2HdCP/idO8PoIz60.png" },
  { name: "Scotiabank", logo: "https://cdn.brandfetch.io/iddVpXQ8L/iddx33mFVo.png" },
  { name: "ING", logo: "https://cdn.brandfetch.io/idzIgbXPv/idl9uG3rrK.png" },
  { name: "BBVA", logo: "https://cdn.brandfetch.io/idmkk0YmY/idaGavPY7G.png" },
  { name: "Santander", logo: "https://cdn.brandfetch.io/idBQyAPJP/idWWdH2V4K.png" },
  
  // Additional Financial Institutions
  { name: "American Express", logo: "https://cdn.brandfetch.io/idcIGJT5-/idozFwvLDa.png" },
  { name: "Discover", logo: "https://cdn.brandfetch.io/iddpZIXlj/id45QTIujc.png" },
  { name: "M1 Finance", logo: "https://cdn.brandfetch.io/id9ypTaGD/idL2HQgCG1.png" },
  { name: "Wealthsimple", logo: "https://cdn.brandfetch.io/idPp-eIlw/idm2yTCJiB.png" },
  { name: "State Street", logo: "https://cdn.brandfetch.io/idM4_CQUW/idq7lNVYTx.png" },
  { name: "BNY Mellon", logo: "https://cdn.brandfetch.io/idHvtqX-O/idL9sJnXb0.png" },
  { name: "BlackRock", logo: "https://cdn.brandfetch.io/idl-nGKw8/id4kGgAT5J.png" },
  { name: "Northern Trust", logo: "https://cdn.brandfetch.io/idi3_qYMR/idiMtmnnRF.png" },
  { name: "Truist", logo: "https://cdn.brandfetch.io/id3pVY8_J/idrwDSFykB.png" },
  { name: "Citizens Bank", logo: "https://cdn.brandfetch.io/idPn4vGTm/id2kIhqTSS.png" },
  
  // New Additions
  { name: "River Financial", logo: "https://cdn.brandfetch.io/idPkRlEXX/idaEPSs5ve.png" },
  { name: "Public.com", logo: "https://cdn.brandfetch.io/idXSE1A6T/idONwY8bLJ.png" },
  { name: "SoFi", logo: "https://cdn.brandfetch.io/idFjXgGt_/idnfRqHzgj.png" },
  { name: "Other", logo: null },
  { name: "None", logo: null },
  { name: "Self-Directed/Custom", logo: null },
];

// Additional constants for application use
export const ACCOUNT_CATEGORIES = ['brokerage', 'retirement', 'cash', 'crypto', 'metals', 'realestate', 'other'];
export const METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item'];

// Note to display in UI when choosing an institution:
// "Don't see your institution? You can type any custom name."