// NSE/BSE symbol universe + index list.
// Yahoo Finance suffixes: NSE -> .NS, BSE -> .BO

import type { Exchange } from "./types";

export interface StockInfo {
  base: string;
  name: string;
  sector: string;
}

// Nifty 50 + popular Nifty Next 50 / midcap names. If a ticker ever goes stale,
// the quote layer degrades gracefully to simulated data instead of breaking.
export const STOCKS: StockInfo[] = [
  { base: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { base: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
  { base: "ICICIBANK", name: "ICICI Bank", sector: "Banking" },
  { base: "INFY", name: "Infosys", sector: "IT" },
  { base: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom" },
  { base: "TCS", name: "Tata Consultancy Services", sector: "IT" },
  { base: "SBIN", name: "State Bank of India", sector: "Banking" },
  { base: "BAJFINANCE", name: "Bajaj Finance", sector: "NBFC" },
  { base: "TITAN", name: "Titan Company", sector: "Consumer" },
  { base: "LT", name: "Larsen & Toubro", sector: "Infrastructure" },
  { base: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { base: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking" },
  { base: "AXISBANK", name: "Axis Bank", sector: "Banking" },
  { base: "ASIANPAINT", name: "Asian Paints", sector: "Consumer" },
  { base: "MARUTI", name: "Maruti Suzuki", sector: "Auto" },
  { base: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma" },
  { base: "NTPC", name: "NTPC", sector: "Power" },
  { base: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
  { base: "POWERGRID", name: "Power Grid Corp", sector: "Power" },
  { base: "HCLTECH", name: "HCLTech", sector: "IT" },
  { base: "TATASTEEL", name: "Tata Steel", sector: "Metals" },
  { base: "ITC", name: "ITC", sector: "FMCG" },
  { base: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement" },
  { base: "TECHM", name: "Tech Mahindra", sector: "IT" },
  { base: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial" },
  { base: "WIPRO", name: "Wipro", sector: "IT" },
  { base: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
  { base: "ADANIPORTS", name: "Adani Ports", sector: "Logistics" },
  { base: "ONGC", name: "ONGC", sector: "Energy" },
  { base: "COALINDIA", name: "Coal India", sector: "Mining" },
  { base: "GRASIM", name: "Grasim Industries", sector: "Conglomerate" },
  { base: "CIPLA", name: "Cipla", sector: "Pharma" },
  { base: "EICHERMOT", name: "Eicher Motors", sector: "Auto" },
  { base: "DRREDDY", name: "Dr Reddy's Labs", sector: "Pharma" },
  { base: "BRITANNIA", name: "Britannia", sector: "FMCG" },
  { base: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { base: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Auto" },
  { base: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto" },
  { base: "TRENT", name: "Trent", sector: "Retail" },
  { base: "BEL", name: "Bharat Electronics", sector: "Defence" },
  { base: "SHRIRAMFIN", name: "Shriram Finance", sector: "NBFC" },
  { base: "DIVISLAB", name: "Divi's Laboratories", sector: "Pharma" },
  { base: "JSWSTEEL", name: "JSW Steel", sector: "Metals" },
  { base: "HINDALCO", name: "Hindalco", sector: "Metals" },
  { base: "TATACONSUM", name: "Tata Consumer", sector: "FMCG" },
  { base: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking" },
  { base: "SBILIFE", name: "SBI Life Insurance", sector: "Insurance" },
  { base: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Insurance" },
  { base: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { base: "LTIM", name: "LTIMindtree", sector: "IT" },
  { base: "M&M", name: "Mahindra & Mahindra", sector: "Auto" },
  { base: "TATAPOWER", name: "Tata Power", sector: "Power" },
  { base: "PIDILITIND", name: "Pidilite Industries", sector: "Chemicals" },
  { base: "DMART", name: "Avenue Supermarts", sector: "Retail" },
  { base: "SIEMENS", name: "Siemens India", sector: "Industrials" },
  { base: "HAVELLS", name: "Havells India", sector: "Electricals" },
  { base: "GODREJCP", name: "Godrej Consumer", sector: "FMCG" },
  { base: "DABUR", name: "Dabur India", sector: "FMCG" },
  { base: "MARICO", name: "Marico", sector: "FMCG" },
  { base: "COLPAL", name: "Colgate-Palmolive", sector: "FMCG" },
  { base: "VEDL", name: "Vedanta", sector: "Metals" },
  { base: "SAIL", name: "Steel Authority of India", sector: "Metals" },
  { base: "BPCL", name: "BPCL", sector: "Energy" },
  { base: "IOC", name: "Indian Oil Corp", sector: "Energy" },
  { base: "GAIL", name: "GAIL India", sector: "Energy" },
  { base: "BANKBARODA", name: "Bank of Baroda", sector: "Banking" },
  { base: "PNB", name: "Punjab National Bank", sector: "Banking" },
  { base: "CANBK", name: "Canara Bank", sector: "Banking" },
  { base: "UNIONBANK", name: "Union Bank of India", sector: "Banking" },
  { base: "IRCTC", name: "IRCTC", sector: "Travel" },
  { base: "HAL", name: "Hindustan Aeronautics", sector: "Defence" },
  { base: "MAZDOCK", name: "Mazagon Dock", sector: "Defence" },
  { base: "COCHINSHIP", name: "Cochin Shipyard", sector: "Defence" },
  { base: "RVNL", name: "Rail Vikas Nigam", sector: "Infrastructure" },
  { base: "IRFC", name: "Indian Railway Finance", sector: "Financial" },
  { base: "PFC", name: "Power Finance Corp", sector: "Financial" },
  { base: "RECLTD", name: "REC", sector: "Financial" },
  { base: "ZOMATO", name: "Eternal (Zomato)", sector: "Consumer Tech" },
  { base: "PAYTM", name: "One 97 Comm. (Paytm)", sector: "Fintech" },
  { base: "PBFINTECH", name: "PB Fintech (Policybazaar)", sector: "Fintech" },
  { base: "NYKAA", name: "FSN E-Commerce (Nykaa)", sector: "Retail" },
];

export const SECTORS: string[] = Array.from(new Set(STOCKS.map((s) => s.sector))).sort();

export interface IndexInfo {
  yahoo: string;
  name: string;
  short: string;
}

export const INDICES: IndexInfo[] = [
  { yahoo: "^NSEI", name: "Nifty 50", short: "NIFTY" },
  { yahoo: "^BSESN", name: "BSE Sensex", short: "SENSEX" },
  { yahoo: "^NSEBANK", name: "Nifty Bank", short: "BANKNIFTY" },
  { yahoo: "^CNXIT", name: "Nifty IT", short: "NIFTY IT" },
  { yahoo: "^INDIAVIX", name: "India VIX", short: "INDIA VIX" },
];

export const STOCK_MAP: Map<string, StockInfo> = new Map(STOCKS.map((s) => [s.base, s]));
export const INDEX_MAP: Map<string, IndexInfo> = new Map(INDICES.map((i) => [i.yahoo, i]));

export function toYahoo(base: string, exchange: Exchange = "NSE"): string {
  return exchange === "BSE" ? `${base}.BO` : `${base}.NS`;
}

export function splitYahoo(symbol: string): { base: string; exchange: Exchange | "INDEX" } {
  if (symbol.startsWith("^")) return { base: symbol, exchange: "INDEX" };
  if (symbol.endsWith(".BO")) return { base: symbol.slice(0, -3), exchange: "BSE" };
  if (symbol.endsWith(".NS")) return { base: symbol.slice(0, -3), exchange: "NSE" };
  return { base: symbol, exchange: "NSE" };
}

/** Display name for any Yahoo symbol we track (stocks + indices). */
export function displayName(symbol: string): string {
  const idx = INDEX_MAP.get(symbol);
  if (idx) return idx.name;
  const { base } = splitYahoo(symbol);
  return STOCK_MAP.get(base)?.name ?? base;
}

export function isTradable(symbol: string): boolean {
  return !symbol.startsWith("^") && /(\.NS|\.BO)$/.test(symbol);
}
