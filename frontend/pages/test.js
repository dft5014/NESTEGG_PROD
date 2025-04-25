/* ----------------------------------------------------------------------
 *  NestEgg ▸ AccountReconciliation.js          (2025-04-25, DT refactor)
 *  – Unified styling, helpers, and UX patterns (matches UnifiedGrouped…)
 *  – useCallback / useMemo everywhere heavy to avoid wasted renders
 *  – Toast helper & tax-lot delete parity
 *  – Inline variance totals footer
 * ------------------------------------------------------------------- */

import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { AuthContext } from "../context/AuthContext";

// Icons (lucide)
import {
  Check,
  AlertCircle,
  Clock,
  Info,
  ChevronDown,
  ChevronRight,
  ChevronDown as IconArrow, // alias for dropdowns
  RefreshCw,
  Edit,
  Save,
  X,
  DollarSign,
  Home,
  Briefcase,
  BarChart4,
  CreditCard,
  Loader,
  Trash,
  Filter,
  SlidersHorizontal,
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// Utils
import { API_BASE_URL } from "../utils/api";
import { popularBrokerages } from "../utils/constants";
import {
  formatCurrency,
  formatDate,
  formatPercentage,
  formatNumber,
} from "../utils/formatters";
import { deletePosition } from "../utils/apimethods/positionMethods";

// Modals / flows
import SecurityPositionModal from "../components/modals/SecurityPositionModal";
import CryptoPositionModal from "../components/modals/CryptoPositionModal";
import CashPositionModal   from "../components/modals/CashPositionModal";
import MetalPositionModal  from "../components/modals/MetalPositionModal";
import AddPositionButton   from "../components/AddPositionButton";

/* ======================================================================
   Component
====================================================================== */
const AccountReconciliation = () => {
  /* ─────────────────────────── State ─────────────────────────────── */
  const { user } = useContext(AuthContext);

  // Accounts
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  // Reconciliation flow
  const [activeAccount,              setActiveAccount]              = useState(null);
  const [showReconcileModal,         setShowReconcileModal]         = useState(false);
  const [showPositionReconciliation, setShowPositionReconciliation] = useState(false);

  // Worksheet state
  const [reconciliationData, setReconciliationData] = useState({
    accountLevel: {
      actualBalance: "",
      variance: 0,
      variancePercent: 0,
      isReconciled: false,
    },
    positions: [],
  });

  // Position-edit modals
  const [showSecurityPositionModal, setShowSecurityPositionModal] = useState(false);
  const [showCryptoPositionModal,   setShowCryptoPositionModal]   = useState(false);
  const [showCashPositionModal,     setShowCashPositionModal]     = useState(false);
  const [showMetalPositionModal,    setShowMetalPositionModal]    = useState(false);
  const [positionToEdit,            setPositionToEdit]            = useState(null);

  // Table sorting / filters
  const [sortField,            setSortField]            = useState("institution");
  const [sortDirection,        setSortDirection]        = useState("asc");
  const [searchQuery,          setSearchQuery]          = useState("");
  const [institutionFilter,    setInstitutionFilter]    = useState("all");
  const [statusFilter,         setStatusFilter]         = useState("all");

  // Position table sorting
  const [positionSortField,     setPositionSortField]     = useState("ticker_or_name");
  const [positionSortDirection, setPositionSortDirection] = useState("asc");

  // Toast
  const [successMessage,    setSuccessMessage]    = useState("");
  const [showSuccessMessage,setShowSuccessMessage]= useState(false);

  /* ─────────────────────── Fetch accounts ────────────────────────── */
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/accounts/all/detailed`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Error: ${res.statusText}`);

      const data = await res.json();
      const norm = data.accounts.map(a => ({
        ...a,
        lastReconciled      : a.lastReconciled      || null,
        reconciliationStatus: a.reconciliationStatus|| "Not Reconciled",
      }));
      setAccounts(norm);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  /* ───────────────────────── Toast helper ────────────────────────── */
  const toast = useCallback(msg => {
    setSuccessMessage(msg);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  }, []);

  /* ─────────────────────── Icon helpers ──────────────────────────── */
  const getInstitutionLogo = useCallback((name) => {
    if (!name) return null;
    const b = popularBrokerages.find(br => br.name.toLowerCase() === name.toLowerCase());
    const Placeholder = () => <Briefcase className="w-5 h-5 text-gray-500" />;
    return b ? b.logo : Placeholder;
  }, []);

  const getAssetIcon = useCallback((t) => {
    switch (t) {
      case "security": return <BarChart4  className="w-4 h-4 text-blue-600"   />;
      case "crypto"  : return <RefreshCw className="w-4 h-4 text-purple-600" />;
      case "cash"    : return <DollarSign className="w-4 h-4 text-green-600" />;
      case "metal"   : return <Briefcase  className="w-4 h-4 text-yellow-600"/>;
      case "real_estate": return <Home className="w-4 h-4 text-red-600" />;
      default        : return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  }, []);

  const getVarianceClass = useCallback((v, isPct=false) => {
    const abs = Math.abs(v);
    const threshold = isPct ? 1 : 100;
    if (abs === 0) return "text-green-500";
    if (abs < threshold) return "text-yellow-500";
    return "text-red-500";
  }, []);

  /* ─────────────────── Fetch positions for acct ──────────────────── */
  const fetchPositionsForAccount = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/positions/by-account/${id}`,{
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`,
          "Content-Type":"application/json",
        }
      });
      if(!res.ok) throw new Error(`Positions err: ${res.statusText}`);
      const data = await res.json();

      setReconciliationData(prev=>({
        ...prev,
        positions: data.positions.map(p=>({
          ...p,
          actualQuantity         : p.quantity_or_shares,
          actualValue            : p.value,
          quantityVariance       : 0,
          quantityVariancePercent: 0,
          valueVariance          : 0,
          valueVariancePercent   : 0,
          isQuantityReconciled   : false,
          isValueReconciled      : false,
        }))
      }));
    } catch(err){ setError(err.message);}
  },[]);

  /* ──────────────── Position edit / delete flows ─────────────────── */
  const openEditModal = useCallback((p,e)=>{
    e?.stopPropagation();
    setPositionToEdit(p);
    switch(p.asset_type){
      case "security": setShowSecurityPositionModal(true); break;
      case "crypto"  : setShowCryptoPositionModal(true);   break;
      case "cash"    : setShowCashPositionModal(true);     break;
      case "metal"   : setShowMetalPositionModal(true);    break;
      default: console.error("Unknown assetType",p.asset_type);
    }
  },[]);

  const handleDeletePosition = useCallback(async (p)=>{
    await deletePosition(p.id,p.asset_type);
    toast("Position deleted");
    setReconciliationData(prev=>({
      ...prev,
      positions: prev.positions.filter(x=>x.id!==p.id)
    }));
    fetchAccounts();
  },[fetchAccounts,toast]);

  const handleDeleteTaxLot = useCallback(async (lot)=>{
    const ok = window.confirm(
      `Delete?\n${lot.identifier || lot.ticker || ""}: `+
      `${formatNumber(lot.quantity||0,{maximumFractionDigits:2})} @ `+
      `${formatCurrency(parseFloat(lot.cost_per_unit||0))}`
    );
    if(!ok) return false;
    await handleDeletePosition(lot);
    return true;
  },[handleDeletePosition]);

  /* ────────────── Variance + input field update  ─────────────────── */
  const calcVar = (p, qty, val)=>{
    const q = parseFloat(qty), v = parseFloat(val);
    const qVar = q - p.quantity_or_shares;
    const vVar = v - p.value;
    return {
      quantityVariance       : qVar,
      quantityVariancePercent: p.quantity_or_shares ? qVar/p.quantity_or_shares*100:0,
      valueVariance          : vVar,
      valueVariancePercent   : p.value ? vVar/p.value*100:0,
    };
  };

  const updatePosField = useCallback((idx,field,val)=>{
    setReconciliationData(prev=>{
      const pos=[...prev.positions];
      const p={...pos[idx]};
      if(field==="qty") p.actualQuantity = val;
      if(field==="val") p.actualValue    = val;
      Object.assign(p,calcVar(p,p.actualQuantity,p.actualValue));
      pos[idx]=p;
      return {...prev, positions:pos};
    });
  },[]);

  const totalPosVar = useMemo(()=>{
    if(!reconciliationData.positions.length) return {valueVariance:0,valueVariancePercent:0};
    const sums = reconciliationData.positions.reduce((a,p)=>({
      app   : a.app   + p.value,
      actual: a.actual+ (parseFloat(p.actualValue)||p.value)
    }),{app:0,actual:0});
    const v   = sums.actual-sums.app;
    const pct = sums.app ? v/sums.app*100 : 0;
    return {valueVariance:v,valueVariancePercent:pct};
  },[reconciliationData.positions]);

  /* ─────────────── Filters / sort memo selectors ─────────────────── */
  const uniqueInstitutions = useMemo(()=>{
    const li = accounts.map(a=>a.institution).filter(Boolean);
    return ["all",...new Set(li)];
  },[accounts]);

  const filteredAccounts = useMemo(()=>{
    return accounts
      .filter(a=>{
        const q = searchQuery.toLowerCase();
        const matchSearch = q==="" ||
          a.account_name.toLowerCase().includes(q) ||
          (a.institution && a.institution.toLowerCase().includes(q));
        const matchInst = institutionFilter==="all"||a.institution===institutionFilter;
        const matchStat = statusFilter==="all"||a.reconciliationStatus===statusFilter;
        return matchSearch&&matchInst&&matchStat;
      })
      .sort((a,b)=>{
        let cmp=0;
        switch(sortField){
          case "institution"    : cmp=(a.institution||"").localeCompare(b.institution||""); break;
          case "account_name"   : cmp=a.account_name.localeCompare(b.account_name); break;
          case "balance"        : cmp=a.total_value-b.total_value; break;
          case "positions"      : cmp=a.positions_count-b.positions_count; break;
          case "last_reconciled": cmp=new Date(a.lastReconciled||0)-new Date(b.lastReconciled||0); break;
          case "status"         : cmp=a.reconciliationStatus.localeCompare(b.reconciliationStatus); break;
          default: cmp=0;
        }
        return sortDirection==="asc"?cmp:-cmp;
      });
  },[accounts,searchQuery,institutionFilter,statusFilter,sortField,sortDirection]);

  const sortedPositions = useMemo(()=>{
    const cp=[...reconciliationData.positions];
    cp.sort((a,b)=>{
      let cmp=0;
      switch(positionSortField){
        case "ticker_or_name": cmp=(a.ticker_or_name||"").localeCompare(b.ticker_or_name||""); break;
        case "asset_type"    : cmp=a.asset_type.localeCompare(b.asset_type); break;
        case "quantity"      : cmp=a.quantity_or_shares-b.quantity_or_shares; break;
        case "value"         : cmp=a.value-b.value; break;
        case "variance"      : cmp=a.valueVariance-b.valueVariance; break;
        default              : cmp=0;
      }
      return positionSortDirection==="asc"?cmp:-cmp;
    });
    return cp;
  },[reconciliationData.positions,positionSortField,positionSortDirection]);

  /* ====================================================================
     Render
  ==================================================================== */
  return (
    <div className="container mx-auto px-4 py-6">

      {/* Header */}
      <h1 className="text-2xl font-semibold mb-6">Account Reconciliation</h1>

      {/* Toast */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white rounded px-4 py-3 shadow-lg z-[100]">
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/60 text-red-200 rounded flex">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-gray-800/70 rounded-xl p-6 flex items-center justify-center min-h-[180px]">
          <Loader className="w-6 h-6 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-400">Loading accounts…</span>
        </div>
      )}

      {/* Accounts Table */}
      {!loading && accounts.length > 0 && (
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-sm">

          {/* Controls */}
          <div className="flex flex-wrap justify-between gap-4 items-center p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold flex items-center">
              <Briefcase className="w-5 h-5 mr-2 text-purple-500" />
              Accounts
            </h2>

            <div className="flex flex-wrap gap-3">
              {/* Institution */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <select
                  value={institutionFilter}
                  onChange={e=>setInstitutionFilter(e.target.value)}
                  className="bg-gray-800 text-white pl-9 pr-8 py-2 rounded text-sm focus:ring focus:ring-blue-500"
                >
                  <option value="all">All Institutions</option>
                  {uniqueInstitutions.filter(i=>i!=="all").map(i=>(
                    <option key={i}>{i}</option>
                  ))}
                </select>
                <IconArrow className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>

              {/* Status */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <select
                  value={statusFilter}
                  onChange={e=>setStatusFilter(e.target.value)}
                  className="bg-gray-800 text-white pl-9 pr-8 py-2 rounded text-sm focus:ring focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Reconciled">Reconciled</option>
                  <option value="Not Reconciled">Not Reconciled</option>
                </select>
                <IconArrow className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input
                  value={searchQuery}
                  onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="bg-gray-800 text-white pl-9 pr-3 py-2 rounded text-sm focus:ring focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800 text-white">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr>
                  {[
                    {k:"institution", l:"Institution", align:"text-left"},
                    {k:"account_name",l:"Account", align:"text-left"},
                    {k:"balance",     l:"Balance", align:"text-right"},
                    {k:"positions",   l:"Positions",align:"text-center"},
                    {k:"last_reconciled",l:"Last Reconciled",align:"text-center"},
                    {k:"status",      l:"Status", align:"text-center"},
                  ].map(col=>(
                    <th
                      key={col.k}
                      onClick={()=> {
                        if(sortField===col.k) setSortDirection(d=>d==="asc"?"desc":"asc");
                        else { setSortField(col.k); setSortDirection("asc"); }
                      }}
                      className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider ${col.align} cursor-pointer hover:bg-gray-700`}
                    >
                      {col.l}
                      {sortField===col.k && (
                        sortDirection==="asc"
                          ? <ArrowUp className="inline w-3 h-3 ml-1"/>
                          : <ArrowDown className="inline w-3 h-3 ml-1"/>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredAccounts.map(ac=>{
                  const Logo = getInstitutionLogo(ac.institution);
                  return (
                    <tr key={ac.id} className="hover:bg-gray-800/80">
                      {/* institution */}
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {typeof Logo==="string"
                            ? <img src={Logo} alt={ac.institution||""} className="w-5 h-5 object-contain mr-2 rounded"/>
                            : Logo
                              ? <div className="w-5 h-5 mr-2 flex items-center justify-center"><Logo/></div>
                              : ac.institution && (
                                <div className="w-5 h-5 mr-2 bg-gray-700 rounded flex items-center justify-center text-xs">
                                  {ac.institution.charAt(0).toUpperCase()}
                                </div>
                              )}
                          <span>{ac.institution||"N/A"}</span>
                        </div>
                      </td>
                      {/* account name */}
                      <td className="px-4 py-4">
                        <div className="font-medium">{ac.account_name}</div>
                        {ac.type && <div className="text-xs text-gray-400">{ac.type}</div>}
                      </td>
                      {/* balance */}
                      <td className="px-4 py-4 text-right font-medium">{formatCurrency(ac.total_value)}</td>
                      {/* positions */}
                      <td className="px-4 py-4 text-center">{ac.positions_count}</td>
                      {/* last reconciled */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-1"/>
                          <span className="text-gray-300 text-sm">{formatDate(ac.lastReconciled)}</span>
                        </div>
                      </td>
                      {/* status */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ac.reconciliationStatus==="Reconciled"
                            ? "bg-green-900 text-green-200"
                            : "bg-amber-900 text-amber-200"
                        }`}>
                          {ac.reconciliationStatus==="Reconciled"
                            ? <Check className="w-3 h-3 mr-1"/>
                            : <AlertCircle className="w-3 h-3 mr-1"/>}
                          {ac.reconciliationStatus}
                        </span>
                      </td>
                      {/* actions */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={()=>{
                            setActiveAccount(ac);
                            setShowPositionReconciliation(false);
                            setReconciliationData({
                              accountLevel:{
                                actualBalance:ac.total_value.toFixed(2),
                                variance:0,
                                variancePercent:0,
                                isReconciled:false,
                              },
                              positions:[]
                            });
                            fetchPositionsForAccount(ac.id);
                            setShowReconcileModal(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                        >
                          Reconcile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && accounts.length===0 && (
        <div className="bg-gray-900 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-500 mb-4"/>
          <h3 className="text-lg font-medium text-white mb-2">No Accounts</h3>
          <p className="text-gray-400 mb-4">Add accounts to begin reconciling.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Add Account</button>
        </div>
      )}

      {/* ───────────────────────── Modal ─────────────────────────────── */}
      {showReconcileModal && activeAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center border-b border-gray-700">
              <h3 className="text-xl font-semibold">Reconcile – {activeAccount.account_name}</h3>
              <button onClick={()=>setShowReconcileModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6"/>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">

              {/* Info banner */}
              <div className="bg-blue-900/30 border border-blue-800/50 rounded-lg p-4 mb-6 flex">
                <Info className="w-5 h-5 text-blue-400 mr-3"/>
                <div className="text-sm text-blue-100 space-y-1">
                  <p className="font-medium">How reconciliation works</p>
                  <p>Provide your statement balance; if it differs from NestEgg, drill into positions.</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <div className="text-xs text-gray-400 uppercase mb-1">NestEgg Balance</div>
                  <div className="text-xl font-semibold">{formatCurrency(activeAccount.total_value)}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <div className="text-xs text-gray-400 uppercase mb-1">Actual Balance</div>
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-1">$</span>
                    <input
                      type="number"
                      value={reconciliationData.accountLevel.actualBalance}
                      step="any"
                      onChange={e=>{
                        const val=e.target.value;
                        const diff = parseFloat(val)-activeAccount.total_value;
                        const pct  = activeAccount.total_value ? diff/activeAccount.total_value*100 : 0;
                        setReconciliationData(prev=>({
                          ...prev,
                          accountLevel:{
                            ...prev.accountLevel,
                            actualBalance:val,
                            variance:diff,
                            variancePercent:pct
                          }
                        }));
                      }}
                      className="bg-transparent flex-1 border-b border-gray-600 focus:border-blue-500 text-xl font-semibold focus:outline-none"
                    />
                  </div>
                </div>
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                  <div className="text-xs text-gray-400 uppercase mb-1">Variance</div>
                  <div className={`text-xl font-semibold ${getVarianceClass(reconciliationData.accountLevel.variance)}`}>
                    {formatCurrency(reconciliationData.accountLevel.variance)}
                    <span className="text-sm ml-1">({formatPercentage(reconciliationData.accountLevel.variancePercent)})</span>
                  </div>
                </div>
              </div>

              {/* Mark reconciled */}
              <div className="flex justify-center mb-6">
                <label className="flex items-center bg-gray-800 px-4 py-3 rounded border border-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reconciliationData.accountLevel.isReconciled}
                    onChange={()=>setReconciliationData(prev=>({
                      ...prev,
                      accountLevel:{...prev.accountLevel,isReconciled:!prev.accountLevel.isReconciled}
                    }))}
                    className="h-5 w-5 text-blue-600 mr-2 rounded"
                  />
                  Mark this account as reconciled
                </label>
              </div>

              {/* Expand/collapse */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"/></div>
                <div className="relative flex justify-center">
                  <button
                    onClick={()=>setShowPositionReconciliation(s=>!s)}
                    className={`px-4 py-2 rounded-full bg-gray-800 border border-gray-700 flex items-center text-sm ${
                      showPositionReconciliation ? "text-blue-400" : "text-gray-300 hover:text-blue-400"
                    }`}
                  >
                    {showPositionReconciliation
                      ? (<><ChevronDown className="w-4 h-4 mr-1"/>Hide Position Details</>)
                      : (<><ChevronRight className="w-4 h-4 mr-1"/>{
                          Math.abs(reconciliationData.accountLevel.variancePercent) > 1
                            ? "Investigate Position Variances"
                            : "Show Position Details"
                        }</>)
                    }
                  </button>
                </div>
              </div>

              {/* Positions Section */}
              {showPositionReconciliation && (
                <>
                  {/* Add position CTA */}
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-medium">Positions</h4>
                    <AddPositionButton
                      accountId={activeAccount.id}
                      onPositionAdded={()=>{
                        toast("Position added");
                        fetchPositionsForAccount(activeAccount.id);
                        fetchAccounts();
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center gap-1"
                      buttonContent={<><Plus className="w-4 h-4"/> Add Position</>}
                    />
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700 border border-gray-700 text-white">
                      <thead className="bg-gray-800">
                        <tr>
                          {[
                            {k:"ticker_or_name",l:"Asset",align:"text-left"},
                            {k:"quantity",l:"App Qty",align:"text-right"},
                            {l:"Actual Qty",align:"text-right"},
                            {k:"variance",l:"Qty Var",align:"text-right"},
                            {l:"✔",align:"text-center"},
                            {k:"value",l:"App Value",align:"text-right"},
                            {l:"Actual Value",align:"text-right"},
                            {l:"Val Var",align:"text-right"},
                            {l:"✔",align:"text-center"},
                            {l:"Actions",align:"text-center"},
                          ].map((col,i)=>(
                            <th
                              key={i}
                              onClick={()=>col.k && (
                                positionSortField===col.k
                                  ? setPositionSortDirection(d=>d==="asc"?"desc":"asc")
                                  : (setPositionSortField(col.k), setPositionSortDirection("asc"))
                              )}
                              className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${col.align} ${col.k?"cursor-pointer hover:bg-gray-700":""}`}
                            >
                              {col.l}
                              {col.k && positionSortField===col.k && (
                                positionSortDirection==="asc"
                                  ? <ArrowUp className="inline w-3 h-3 ml-1"/>
                                  : <ArrowDown className="inline w-3 h-3 ml-1"/>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-900">
                        {sortedPositions.map((p,idx)=>(
                          <tr key={p.id} className="hover:bg-gray-800/60">
                            <td className="px-4 py-3 flex items-center gap-2">
                              {getAssetIcon(p.asset_type)}
                              <div>
                                <div className="font-medium">{p.ticker_or_name}</div>
                                <div className="text-xs text-gray-400 capitalize">{p.asset_type}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{formatNumber(p.quantity_or_shares,{maximumFractionDigits:6})}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              <input
                                type="number"
                                value={p.actualQuantity}
                                step="any"
                                onChange={e=>updatePosField(idx,"qty",e.target.value)}
                                className="w-20 bg-transparent border-b border-gray-600 focus:border-blue-500 text-right"
                              />
                            </td>
                            <td className={`px-4 py-3 text-right text-sm ${getVarianceClass(p.quantityVariance)}`}>
                              {formatNumber(p.quantityVariance,{maximumFractionDigits:6})}
                              <div className="text-xs">({formatPercentage(p.quantityVariancePercent)})</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                                checked={p.isQuantityReconciled}
                                onChange={()=>setReconciliationData(prev=>{
                                  const pos=[...prev.positions]; pos[idx].isQuantityReconciled=!pos[idx].isQuantityReconciled;
                                  return {...prev,positions:pos};
                                })}
                              />
                            </td>
                            <td className="px-4 py-3 text-right text-sm">{formatCurrency(p.value)}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              <div className="flex items-center justify-end gap-0.5">
                                <span className="text-gray-400">$</span>
                                <input
                                  type="number"
                                  value={p.actualValue}
                                  step="any"
                                  onChange={e=>updatePosField(idx,"val",e.target.value)}
                                  className="w-24 bg-transparent border-b border-gray-600 focus:border-blue-500 text-right"
                                />
                              </div>
                            </td>
                            <td className={`px-4 py-3 text-right text-sm ${getVarianceClass(p.valueVariance)}`}>
                              {formatCurrency(p.valueVariance)}
                              <div className="text-xs">({formatPercentage(p.valueVariancePercent)})</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" className="h-4 w-4 text-blue-600 rounded"
                                checked={p.isValueReconciled}
                                onChange={()=>setReconciliationData(prev=>{
                                  const pos=[...prev.positions]; pos[idx].isValueReconciled=!pos[idx].isValueReconciled;
                                  return {...prev,positions:pos};
                                })}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center gap-1">
                                <button className="p-1 bg-blue-900 text-blue-400 rounded hover:bg-blue-800"
                                  title="Edit" onClick={e=>openEditModal(p,e)}>
                                  <Edit className="w-3.5 h-3.5"/>
                                </button>
                                <button className="p-1 bg-red-900 text-red-400 rounded hover:bg-red-800"
                                  title="Delete" onClick={()=>handleDeleteTaxLot(p)}>
                                  <Trash className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Totals */}
                      <tfoot className="bg-gray-800 text-sm">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right font-medium">Total Variance</td>
                          <td colSpan={5} className={`px-4 py-3 text-right font-medium ${getVarianceClass(totalPosVar.valueVariance)}`}>
                            {formatCurrency(totalPosVar.valueVariance)} ({formatPercentage(totalPosVar.valueVariancePercent)})
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-gray-800 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
              <button onClick={()=>setShowReconcileModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">Cancel</button>
              <button
                onClick={async ()=>{
                  try{
                    const payload={
                      account_id:activeAccount.id,
                      reconciliation_date:new Date().toISOString(),
                      account_level:{
                        ...reconciliationData.accountLevel,
                        app_balance:activeAccount.total_value
                      },
                      positions:reconciliationData.positions.map(p=>({
                        position_id:p.id,
                        asset_type:p.asset_type,
                        app_quantity:p.quantity_or_shares,
                        app_value:p.value,
                        actual_quantity:parseFloat(p.actualQuantity)||p.quantity_or_shares,
                        actual_value:parseFloat(p.actualValue)||p.value,
                        is_quantity_reconciled:p.isQuantityReconciled,
                        is_value_reconciled:p.isValueReconciled,
                      }))
                    };
                    const res = await fetch(`${API_BASE_URL}/accounts/reconcile`,{
                      method:"POST",
                      headers:{
                        Authorization:`Bearer ${localStorage.getItem("token")}`,
                        "Content-Type":"application/json"
                      },
                      body:JSON.stringify(payload)
                    });
                    if(!res.ok) throw new Error("Failed to save reconciliation");
                    toast("Reconciliation saved");
                    fetchAccounts();
                    setShowReconcileModal(false);
                  }catch(err){ setError(err.message);} }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1">
                <Save className="w-4 h-4"/> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position Modals */}
      {showSecurityPositionModal && (
        <SecurityPositionModal
          isOpen={showSecurityPositionModal}
          onClose={()=>setShowSecurityPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          positionToEdit={positionToEdit}
          onPositionSaved={()=>{
            toast("Position updated");
            fetchPositionsForAccount(activeAccount.id);
            fetchAccounts();
          }}
        />
      )}
      {showCryptoPositionModal && (
        <CryptoPositionModal
          isOpen={showCryptoPositionModal}
          onClose={()=>setShowCryptoPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          positionToEdit={positionToEdit}
          onPositionSaved={()=>{
            toast("Position updated");
            fetchPositionsForAccount(activeAccount.id);
            fetchAccounts();
          }}
        />
      )}
      {showCashPositionModal && (
        <CashPositionModal
          isOpen={showCashPositionModal}
          onClose={()=>setShowCashPositionModal(false)}
          accountId={activeAccount?.id}
          positionToEdit={positionToEdit}
          onPositionSaved={()=>{
            toast("Position updated");
            fetchPositionsForAccount(activeAccount.id);
            fetchAccounts();
          }}
        />
      )}
      {showMetalPositionModal && (
        <MetalPositionModal
          isOpen={showMetalPositionModal}
          onClose={()=>setShowMetalPositionModal(false)}
          accountId={activeAccount?.id}
          accountName={activeAccount?.account_name}
          positionToEdit={positionToEdit}
          onPositionSaved={()=>{
            toast("Position updated");
            fetchPositionsForAccount(activeAccount.id);
            fetchAccounts();
          }}
        />
      )}
    </div>
  );
};

export default AccountReconciliation;