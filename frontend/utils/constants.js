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
  { name: "Ally Invest", logo: "https://asset.brandfetch.io/idCjW1TkZM/id0ey2s8OW.svg" }, // Pending new link
  
  // Major Banks
  { name: "JPMorgan Chase", logo: "https://cdn.brandfetch.io/idudVYts5w/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Bank of America", logo: "https://cdn.brandfetch.io/ide4lTCz-B/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Wells Fargo", logo: "https://cdn.brandfetch.io/idVCed0KqE/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Citibank", logo: "https://asset.brandfetch.io/idMSWv1jA-/idECZS8-Cj.svg" }, // Pending new link
  { name: "Goldman Sachs", logo: "https://asset.brandfetch.io/idYn8-Hd7l/id1_ktwEAA.svg" }, // Pending new link
  { name: "Morgan Stanley", logo: "https://asset.brandfetch.io/idpJ0XjZQD/idURw4Ls77.svg" }, // Pending new link
  { name: "HSBC", logo: "https://asset.brandfetch.io/id9QrcXH0g/idGQmMr7Ps.svg" }, // Pending new link
  { name: "Capital One", logo: "https://asset.brandfetch.io/idOTBml4q_/idI8aT3M5V.svg" }, // Pending new link
  { name: "PNC Bank", logo: "https://asset.brandfetch.io/idcJZa0Ygv/idyWTsC2u_.svg" }, // Pending new link
  { name: "US Bank", logo: "https://asset.brandfetch.io/idkfgFTzH0/idkhYvLHhb.svg" }, // Pending new link
  
  // Crypto Exchanges
  { name: "Coinbase", logo: "https://cdn.brandfetch.io/idwDWo4ONQ/w/400/h/400/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Binance", logo: "https://asset.brandfetch.io/idIYGYxGfU/idr69kL5Je.svg" }, // Pending new link
  { name: "Kraken", logo: "https://asset.brandfetch.io/idIZxLW5X_/idpA_M9i6E.svg" }, // Pending new link
  { name: "Gemini", logo: "https://cdn.brandfetch.io/id08hfGdfR/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Crypto.com", logo: "https://asset.brandfetch.io/idxS_DrGRp/idtxJFY5IM.svg" }, // Pending new link
  { name: "Bitstamp", logo: "https://asset.brandfetch.io/idErMCmPZe/idRX5g9Y7e.svg" }, // Pending new link
  
  // International & Other
  { name: "Barclays", logo: "https://asset.brandfetch.io/idZjbFrZBL/idR9QlJQ4q.svg" }, // Pending new link
  { name: "Deutsche Bank", logo: "https://asset.brandfetch.io/idIHWvs2HX/idpM7RMlTL.svg" }, // Pending new link
  { name: "UBS", logo: "https://asset.brandfetch.io/idoMZ5HpSh/idvqcO47Qk.svg" }, // Pending new link
  { name: "Credit Suisse", logo: "https://asset.brandfetch.io/idYyTXkUyO/idP5hSjNS-.svg" }, // Pending new link
  { name: "RBC", logo: "https://asset.brandfetch.io/idMcmP1nL5/idChP9G5jF.svg" }, // Pending new link
  { name: "TD Bank", logo: "https://asset.brandfetch.io/id_knJEbDY/idYG7qyvJW.svg" }, // Pending new link
  { name: "Scotiabank", logo: "https://asset.brandfetch.io/iddVpXQ8L/iddx33mFVo.svg" }, // Pending new link
  { name: "ING", logo: "https://asset.brandfetch.io/idQKUsmFrn/id_-GBDGTd.svg" }, // Pending new link
  { name: "BBVA", logo: "https://asset.brandfetch.io/idiVJ3O_Nm/ideHxFw0LS.svg" }, // Pending new link
  { name: "Santander", logo: "https://asset.brandfetch.io/idL0hFaeFh/idIGrpU9Mw.svg" }, // Pending new link
  
  // Additional Financial Institutions
  { name: "American Express", logo: "https://asset.brandfetch.io/id_sTWg3kA/idT-r9i81E.svg" }, // Pending new link
  { name: "Discover", logo: "https://asset.brandfetch.io/idOFUwg0wV/id3z5emohV.svg" }, // Pending new link
  { name: "M1 Finance", logo: "https://asset.brandfetch.io/idDtD_gDJ3/idVj59OzWT.svg" }, // Pending new link
  { name: "Wealthsimple", logo: "https://asset.brandfetch.io/idBuyjw9RA/idJ1w-fWd5.svg" }, // Pending new link
  { name: "State Street", logo: "https://asset.brandfetch.io/idS76D8Haw/idyQQ2wvl8.svg" }, // Pending new link
  { name: "BNY Mellon", logo: "https://asset.brandfetch.io/idvKuD--UM/id1vL_-w3a.svg" }, // Pending new link
  { name: "BlackRock", logo: "https://asset.brandfetch.io/iduUImWyaS/idTEP82LLQ.svg" }, // Pending new link
  { name: "Northern Trust", logo: "https://asset.brandfetch.io/id7BMkwClb/idafRY0qVR.svg" }, // Pending new link
  { name: "Truist", logo: "https://asset.brandfetch.io/idJrHlrLJE/ida5xVtjVT.svg" }, // Pending new link
  { name: "Citizens Bank", logo: "https://asset.brandfetch.io/idHUB3zc2w/idmZc-G22Y.svg" }, // Pending new link
  
  // New Additions
  { name: "River Financial", logo: "https://cdn.brandfetch.io/id-MFa5JSr/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B" },
  { name: "Public.com", logo: "https://asset.brandfetch.io/idKunHLVS9/id9KPdAm-s.svg" }, // Pending new link
  { name: "SoFi", logo: "https://asset.brandfetch.io/idIJzxlw41/idQfQjh0RS.svg" }, // Pending new link
  { name: "Other", logo: null },
  { name: "None", logo: null },
  { name: "Self-Directed/Custom", logo: null },
];

// Additional constants for application use
export const ACCOUNT_CATEGORIES = ['brokerage', 'retirement', 'cash', 'crypto', 'metals', 'realestate', 'other'];
export const METAL_UNITS = ['oz', 'g', 'kg', 'lb', 'item'];

// Note to display in UI when choosing an institution:
// "Don't see your institution? You can type any custom name."