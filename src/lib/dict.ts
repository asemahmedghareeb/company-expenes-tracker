import type { Lang } from "./format";

export type { Lang };

export interface Dictionary {
  brand: string;
  nav: { dashboard: string; projects: string; partners: string; ledger: string; company: string; summary: string; capital: string };
  firmOverview: string;
  overviewSubtitle: (projectCount: number, activePartners: number) => string;
  rangeFilter: {
    all: string;
    month: string;
    year: string;
    custom: string;
    from: string;
    to: string;
  };
  fixedCostsTitle: string;
  fixedCostsSubtitle: string;
  fixedCostsEmpty: string;
  fixedCostsTotal: string;
  manageFixed: string;
  variableCostsTitle: string;
  variableCostsSubtitle: string;
  variableCostsEmpty: string;
  variableCostsTotal: string;
  projectCostsTitle: string;
  projectCostsSubtitle: string;
  projectCostsEmpty: string;
  projectCostsTotal: string;
  newProject: string;
  viewLedger: string;
  allProjects: string;
  stats: {
    inflow: string;
    expenses: string;
    expensesHint: string;
    fixed: string;
    variable: string;
    project: string;
    netProfit: string;
    netProfitHint: string;
    outstanding: string;
    drawings: string;
    contractValue: string;
  };
  partnerBalances: string;
  balancesSubtitle: string;
  table: { partner: string; pending: string; profit: string; balance: string };
  noPartners: string;
  addOne: string;
  projects: string;
  projectsSubtitle: string;
  in: string;
  out: string;
  net: string;
  noProjects: string;
  createOne: string;
  footer: string;
  dbTitle: string;
  dbDesc: string;
  dbRefresh: string;
  /* ------------------------------ Partners ------------------------------ */
  partners: {
    title: string;
    subtitle: string;
    addTitle: string;
    addDesc: string;
    globalTitle: string;
    activeTotal: (total: string, valid: boolean) => string;
    noActive: string;
    allTitle: string;
    colName: string;
    colEmail: string;
    colDefault: string;
    colStatus: string;
    colActions: string;
    active: string;
    inactive: string;
    noRows: string;
    deactivate: string;
    reactivate: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    deleting: string;
    cancel: string;
    deleteHasHistory: string;
  };
  partnerForm: {
    name: string;
    email: string;
    equity: string;
    activePartner: string;
    saving: string;
    save: string;
    add: string;
    note: string;
  };
  splits: {
    total: (total: string, valid: boolean) => string;
    inactive: string;
    equal: string;
    clear: string;
    autoHint: string;
  };
  defaultsForm: { save: string; saving: string };
  /* ------------------------------ Projects ------------------------------ */
  projectsPage: {
    title: string;
    subtitle: string;
    newTitle: string;
    newDesc: string;
    addFirstPre: string;
    partnersLink: string;
    addFirstPost: string;
    contractWord: string;
    partnersWord: string;
    noProjects: string;
    newProjectBtn: string;
    statsActive: string;
    statsPipeline: string;
    filterAll: string;
    searchPh: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyCta: string;
    colProject: string;
    colStatus: string;
    colContract: string;
    colInflow: string;
    colOut: string;
    colNet: string;
    noResults: string;
    createdToast: (name: string) => string;
  };
  projectForm: {
    name: string;
    namePh: string;
    contractValue: string;
    status: string;
    statuses: {
      UPCOMING: string;
      ACTIVE: string;
      COMPLETED: string;
      ON_HOLD: string;
      CANCELLED: string;
    };
    description: string;
    descPh: string;
    snapshot: string;
    copyDefaults: string;
    half: string;
    equalSplit: string;
    balanced: string;
    offBy: (delta: string) => string;
    creating: string;
    create: string;
    splitsError: (total: string) => string;
    expensesTitle: string;
    addItem: string;
    itemName: string;
    itemNamePh: string;
    cost: string;
    expenseError: string;
    totalExpenses: string;
    estProfit: string;
    clientCovered: string;
  };
  projectDetail: {
    noDescription: string;
    contractValue: string;
    inflow: string;
    expenses: string;
    netProfit: string;
    outstanding: string;
    cashAfter: string;
    settlement: string;
    settlementDesc: string;
    colPartner: string;
    colShare: string;
    colReimb: string;
    colProfit: string;
    colOwed: string;
    snapshotTitle: string;
    snapshotDesc: string;
    saveSplits: string;
    saving: string;
    recordPayment: string;
    recordPaymentDesc: string;
    paymentsTitle: (n: number) => string;
    colDate: string;
    colMilestone: string;
    colReceivedBy: string;
    colAmount: string;
    noPayments: string;
    logExpense: string;
    logExpenseDesc: string;
    howTitle: string;
    how1: string;
    how2pre: string;
    howMark: string;
    how2post: string;
    how3: string;
    expensesTitle: (n: number) => string;
    colDesc: string;
    colPaidBy: string;
    colStatus: string;
    colAction: string;
    reimbursed: string;
    pending: string;
    clientPaid: string;
    clientCovered: string;
    mark: string;
    unmark: string;
    noExpenses: string;
    editTitle: string;
    editDesc: string;
    deleteTitle: string;
    deleteDesc: (projectName: string) => string;
    delete: string;
    deleteConfirm: string;
    deleting: string;
    cancel: string;
  };
  paymentForm: {
    amount: string;
    paidAt: string;
    milestone: string;
    milestonePh: string;
    notes: string;
    notesPh: string;
    recording: string;
    record: string;
    receivedBy: string;
    selectCustodian: string;
  };
  expenseForm: {
    paidBy: string;
    selectPartner: string;
    clientPaid: string;
    amount: string;
    description: string;
    descPh: string;
    expenseDate: string;
    logging: string;
    log: string;
  };
  drawingForm: {
    partner: string;
    select: string;
    amount: string;
    notes: string;
    notesPh: string;
    recording: string;
    record: string;
  };
  company: {
    title: string;
    subtitle: string;
    addTitle: string;
    addDesc: string;
    fTitle: string;
    titlePh: string;
    amount: string;
    date: string;
    notes: string;
    add: string;
    saving: string;
    noExpenses: string;
    colPartner: string;
    colShare: string;
    colShareAmount: string;
    colPaid: string;
    colNet: string;
    overpaid: string;
    owes: string;
    settled: string;
    collected: string;
    remaining: string;
    payTitle: string;
    payDesc: string;
    record: string;
    recording: string;
    delete: string;
    deleteConfirm: string;
    deleting: string;
    cancel: string;
    warnDefaults: string;
    emptyPayments: string;
    payersTitle: string;
    fillShares: string;
    covered: string;
    fixedTitle: string;
    fixedDesc: string;
    fixedAdd: string;
    chooseExpense: string;
    customOption: string;
    chosenCount: (n: number) => string;
    clearSel: string;
    varTitle: string;
    varDesc: string;
    varAdd: string;
    colSettle: string;
    settle: string;
    settling: string;
    settleCollect: string;
    settlePayout: string;
    settleAll: string;
    settledAll: string;
    alreadySettled: string;
    colPayout: string;
    payoutTitle: string;
    payoutDesc: string;
    payoutBill: string;
    payoutGeneral: string;
    payoutAdd: string;
    payoutHistory: string;
    payoutHistoryDesc: string;
    noPayouts: string;
    payoutTo: string;
  };
  summary: {
    title: string;
    subtitle: string;
    chooseMonth: string;
    fixed: string;
    variable: string;
    direct: string;
    monthTotal: string;
    colPartner: string;
    colPaid: string;
    colOwe: string;
    colBalance: string;
    toHim: string;
    owes: string;
    settled: string;
    details: string;
    colKind: string;
    colTitle: string;
    colAmount: string;
    colPaidBy: string;
    kindFixed: string;
    kindVariable: string;
    kindProject: string;
    empty: string;
  };
  /* ------------------------------- Capital ------------------------------ */
  capital: {
    title: string;
    subtitle: string;
    totalCollected: string;
    totalCollectedHint: string;
    heldByTitle: string;
    heldByDesc: string;
    tableTitle: string;
    tableDesc: string;
    colPartner: string;
    colHeld: string;
    colEarned: string;
    colNet: string;
    owesPartners: string;
    owedByPartners: string;
    balanced: string;
    noPartners: string;
    noCash: string;
    settleTitle: string;
    settleDesc: string;
    settleAllClear: string;
    settleLine: (from: string, to: string, amount: string) => string;
  };
  /* ------------------------------- Ledger ------------------------------- */
  ledger: {
    title: string;
    subtitle: string;
    noPartners: string;
    pendingShort: string;
    profitShare: string;
    companyNet: string;
    drawings: string;
    recordTitle: string;
    recordDesc: string;
    pendingTitle: string;
    pendingDesc: string;
    colProject: string;
    colPartner: string;
    colAmount: string;
    allSettled: string;
    recentTitle: string;
    colDate: string;
    colNotes: string;
    colAction: string;
    cancelDrawing: string;
    noDrawings: string;
    formulaTitle: string;
    fPending: string;
    fProfit: string;
    fBalance: string;
    unavailable: string;
    unavailableDesc: string;
  };
}

export const dict: Record<Lang, Dictionary> = {
  en: {
    brand: "Partner Ledger",
    nav: { dashboard: "Dashboard", projects: "Projects", partners: "Partners", ledger: "Partner Ledger", company: "Company Expenses", summary: "Summary", capital: "Firm Treasury & Custody" },
    firmOverview: "Firm overview",
    overviewSubtitle: (p, a) =>
      `${p} projects · ${a} active partners · expenses settle before profit splits`,
    rangeFilter: {
      all: "All time",
      month: "Month",
      year: "Year",
      custom: "Custom",
      from: "From",
      to: "To",
    },
    fixedCostsTitle: "Fixed expenses",
    fixedCostsSubtitle: "Recurring overhead — rent, subscriptions… Net profit is calculated after these.",
    fixedCostsEmpty: "No fixed costs defined yet.",
    fixedCostsTotal: "Monthly fixed total",
    manageFixed: "Manage fixed costs",
    variableCostsTitle: "Variable expenses",
    variableCostsSubtitle: "One-off overhead — included in total expenses and net profit.",
    variableCostsEmpty: "No variable expenses recorded yet.",
    variableCostsTotal: "Variable total",
    projectCostsTitle: "Project expenses",
    projectCostsSubtitle: "Direct costs paid by partners — part of total expenses.",
    projectCostsEmpty: "No project expenses recorded yet.",
    projectCostsTotal: "Projects total",
    newProject: "New project",
    viewLedger: "View ledger",
    allProjects: "All projects",
    stats: {
      inflow: "Total inflow",
      expenses: "Total expenses",
      expensesHint: "Projects + fixed + variable",
      fixed: "Fixed expenses",
      variable: "Variable expenses",
      project: "Project expenses",
      netProfit: "Net profit (after overhead)",
      netProfitHint: "Inflow − projects − fixed − variable",
      outstanding: "Outstanding reimbursements",
      drawings: "Total drawings",
      contractValue: "Contract value",
    },
    partnerBalances: "Partner balances",
    balancesSubtitle: "Pending reimbursements + profit shares − drawings",
    table: { partner: "Partner", pending: "Pending", profit: "Profit", balance: "Balance" },
    noPartners: "No partners yet.",
    addOne: "Add one",
    projects: "Projects",
    projectsSubtitle: "Realized net profit = inflow − expenses",
    in: "In",
    out: "Out",
    net: "Net",
    noProjects: "No projects yet.",
    createOne: "Create one",
    footer: "Balance = Pending reimbursements + Realized profit shares + Company net − Drawings",
    dbTitle: "Database not connected",
    dbDesc: "Set DATABASE_URL to a PostgreSQL database to go live.",
    dbRefresh: "Refresh this page.",
    partners: {
      title: "Partners",
      subtitle:
        "Global default equity must sum to 100% across active partners. Changing defaults never rewrites historic project splits.",
      addTitle: "Add partner",
      addDesc: "New partners start with 0% until re-balanced.",
      globalTitle: "Global default equity",
      activeTotal: (total, valid) =>
        `Active total: ${total}% ${valid ? "✓ valid" : "— must equal 100%"}`,
      noActive: "No active partners yet.",
      allTitle: "All partners",
      colName: "Name",
      colEmail: "Email",
      colDefault: "Default %",
      colStatus: "Status",
      colActions: "Actions",
      active: "Active",
      inactive: "Inactive",
      noRows: "No partners yet — add your first above.",
      deactivate: "Deactivate",
      reactivate: "Reactivate",
      edit: "Edit",
      delete: "Delete",
      deleteConfirm: "Click again to confirm deletion",
      deleting: "Deleting…",
      cancel: "Cancel",
      deleteHasHistory:
        "Cannot delete: this partner has projects, expenses or drawings on record. Deactivate them instead.",
    },
    partnerForm: {
      name: "Name",
      email: "Email (optional)",
      equity: "Default equity %",
      activePartner: "Active partner",
      saving: "Saving…",
      save: "Save changes",
      add: "Add partner",
      note: "Note: changing a default % never rewrites historic project splits. Use “Update defaults” to re-balance globals to 100%.",
    },
    splits: {
      total: (total, valid) =>
        `Total: ${total}% ${valid ? "✓ sums to 100%" : "— must sum to exactly 100%"}`,
      inactive: "(inactive)",
      equal: "Split equally",
      clear: "Clear",
      autoHint: "Last row auto-balances to 100",
    },
    defaultsForm: { save: "Update global defaults", saving: "Saving…" },
    projectsPage: {
      title: "Projects",
      subtitle:
        "Equity is snapshotted per project — later global changes never mutate historic distributions.",
      newTitle: "New project",
      newDesc: "Splits auto-populate from global defaults; adjust freely (must = 100%).",
      addFirstPre: "Add an active partner first on the",
      partnersLink: "Partners",
      addFirstPost: "page.",
      contractWord: "contract",
      partnersWord: "partners",
      noProjects: "No projects yet — create your first.",
      newProjectBtn: "New Project",
      statsActive: "Active",
      statsPipeline: "Pipeline",
      filterAll: "All",
      searchPh: "Search projects…",
      emptyTitle: "No projects yet",
      emptyDesc: "Create your first project to start tracking inflow, expenses and equity.",
      emptyCta: "Create project",
      colProject: "Project",
      colStatus: "Status",
      colContract: "Contract",
      colInflow: "In",
      colOut: "Out",
      colNet: "Net",
      noResults: "No projects match this filter.",
      createdToast: (name) => `Project “${name}” created.`,
    },
    projectForm: {
      name: "Project name",
      namePh: "Acme Website",
      contractValue: "Contract value",
      status: "Status",
      statuses: {
        UPCOMING: "Upcoming",
        ACTIVE: "Active",
        COMPLETED: "Completed",
        ON_HOLD: "On hold",
        CANCELLED: "Cancelled",
      },
      description: "Description (optional)",
      descPh: "Scope, client, notes…",
      snapshot: "Project equity snapshot (must = 100%)",
      copyDefaults: "Copy defaults",
      half: "50/50 first two",
      equalSplit: "Equal",
      balanced: "Balanced · 100%",
      offBy: (delta) => `Off by ${delta}`,
      creating: "Creating…",
      create: "Create project",
      splitsError: (total) => `Splits must sum to 100% (currently ${total}%).`,
      expensesTitle: "Initial expenses",
      addItem: "+ Add Expense Item",
      itemName: "Item name",
      itemNamePh: "Hosting, domain…",
      cost: "Cost",
      expenseError: "Each expense needs a title, a valid amount and a paying partner.",
      totalExpenses: "Total Expenses",
      estProfit: "Estimated Net Profit",
      clientCovered: "Client-covered",
    },
    projectDetail: {
      noDescription: "No description.",
      contractValue: "Contract value",
      inflow: "Total inflow",
      expenses: "Total expenses",
      netProfit: "Realized net profit",
      outstanding: "Outstanding reimbursements (settle first)",
      cashAfter: "Cash after reimbursements",
      settlement: "Settlement plan",
      settlementDesc: "① Reimburse out-of-pocket expenses ② Split net profit by snapshot equity",
      colPartner: "Partner",
      colShare: "Share",
      colReimb: "Reimbursement due",
      colProfit: "Profit share",
      colOwed: "Total owed",
      snapshotTitle: "Project equity snapshot",
      snapshotDesc: "Historic & immutable — editing affects only this project.",
      saveSplits: "Save project splits",
      saving: "Saving…",
      recordPayment: "Record client payment",
      recordPaymentDesc: "Milestone inflow from the client.",
      paymentsTitle: (n) => `Client payments (${n})`,
      colDate: "Date",
      colMilestone: "Milestone",
      colReceivedBy: "Received by",
      colAmount: "Amount",
      noPayments: "No payments recorded yet.",
      logExpense: "Log out-of-pocket expense",
      logExpenseDesc: "Paid from a partner's personal money.",
      howTitle: "How reimbursement works",
      how1: "1. Partner pays from personal money → expense logged as",
      how2pre: "2. Client payment arrives → click",
      howMark: "Mark reimbursed",
      how2post: "to settle that partner first.",
      how3: "3. Remaining net profit (inflow − all expenses) splits by the snapshot % above.",
      expensesTitle: (n) => `Operational expenses (${n})`,
      colDesc: "Description",
      colPaidBy: "Paid by",
      colStatus: "Status",
      colAction: "Action",
      reimbursed: "Reimbursed",
      pending: "Pending",
      clientPaid: "Client paid",
      clientCovered: "Client-covered (info only)",
      mark: "Mark reimbursed",
      unmark: "Unmark",
      noExpenses: "No expenses logged yet.",
      editTitle: "Edit project",
      editDesc:
        "Update name, value, status or description. Equity is edited separately above.",
      deleteTitle: "Danger zone",
      deleteDesc: (projectName) =>
        `Deleting “${projectName}” permanently removes its payments, expenses and equity snapshot. Partner balances will change.`,
      delete: "Delete project",
      deleteConfirm: "Click again to confirm deletion",
      deleting: "Deleting…",
      cancel: "Cancel",
    },
    paymentForm: {
      amount: "Amount",
      paidAt: "Paid at",
      milestone: "Milestone (optional)",
      milestonePh: "Milestone 1 — Advance",
      notes: "Notes (optional)",
      notesPh: "Bank ref, invoice no…",
      recording: "Recording…",
      record: "Record payment",
      receivedBy: "Received by (cash custodian)",
      selectCustodian: "Select who holds the money…",
    },
    expenseForm: {
      paidBy: "Paid by",
      selectPartner: "Select partner…",
      clientPaid: "Client paid",
      amount: "Amount",
      description: "Description",
      descPh: "Server costs, travel…",
      expenseDate: "Expense date",
      logging: "Logging…",
      log: "Log expense",
    },
    drawingForm: {
      partner: "Partner",
      select: "Select…",
      amount: "Amount",
      notes: "Notes (optional)",
      notesPh: "Monthly draw…",
      recording: "Recording…",
      record: "Record drawing",
    },
    company: {
      title: "Company expenses",
      subtitle:
        "Rent, subscriptions and overhead — split by default equity. Whoever pays more than their share is credited back.",
      addTitle: "Record payment",
      addDesc: "Pick a fixed cost or enter a one-off.",
      fTitle: "Title",
      titlePh: "Office rent, SaaS…",
      amount: "Amount",
      date: "Date",
      notes: "Notes (optional)",
      add: "Add expense",
      saving: "Saving…",
      noExpenses: "No company expenses yet.",
      colPartner: "Partner",
      colShare: "Share",
      colShareAmount: "Share amount",
      colPaid: "Paid",
      colNet: "Net",
      overpaid: "overpaid",
      owes: "owes",
      settled: "settled",
      collected: "Collected",
      remaining: "Still to collect",
      payTitle: "Record payment",
      payDesc: "Who paid how much toward this bill.",
      record: "Record payment",
      recording: "Recording…",
      delete: "Delete",
      deleteConfirm: "Click again to confirm deletion",
      deleting: "Deleting…",
      cancel: "Cancel",
      warnDefaults:
        "Default equity does not sum to 100% — fix it on the Partners page for exact splits.",
      emptyPayments: "No payments recorded yet.",
      payersTitle: "Who paid",
      fillShares: "Fill shares",
      covered: "Fully covered ✓",
      fixedTitle: "Fixed costs",
      fixedDesc: "Define once — rent, subscriptions… Pick them when recording.",
      fixedAdd: "Add fixed cost",
      chooseExpense: "Expense",
      customOption: "Custom (one-off)…",
      chosenCount: (n) => (n === 1 ? "1 selected" : `${n} selected`),
      clearSel: "Clear",
      varTitle: "Record variable expense",
      varDesc: "One-off overhead paid by one or more partners.",
      varAdd: "Add",
      colSettle: "Settle",
      settle: "Settle",
      settling: "Settling…",
      settleCollect: "Collect",
      settlePayout: "Pay out",
      settleAll: "Settle all",
      settledAll: "Bill fully settled ✓",
      alreadySettled: "Already settled.",
      colPayout: "Paid back",
      payoutTitle: "Pay partner back",
      payoutDesc: "Record cash the firm paid back to a partner (settles their credit).",
      payoutBill: "Bill (optional)",
      payoutGeneral: "General (no bill)…",
      payoutAdd: "Record payout",
      payoutHistory: "Firm → partner payouts",
      payoutHistoryDesc: "Cash the firm paid back. Delete to undo.",
      noPayouts: "No payouts recorded yet.",
      payoutTo: "to",
    },
    summary: {
      title: "Monthly summary",
      subtitle: "Firm-books basis: client-covered costs excluded.",
      chooseMonth: "Choose month",
      fixed: "Fixed",
      variable: "Variable",
      direct: "Direct project costs",
      monthTotal: "Month total",
      colPartner: "Partner",
      colPaid: "Paid",
      colOwe: "Owed share",
      colBalance: "Balance",
      toHim: "to him",
      owes: "owes",
      settled: "settled",
      details: "Month details",
      colKind: "Type",
      colTitle: "Description",
      colAmount: "Amount",
      colPaidBy: "Paid by",
      kindFixed: "Fixed",
      kindVariable: "Variable",
      kindProject: "Projects",
      empty: "No costs recorded this month.",
    },
    capital: {
      title: "Firm treasury & custody",
      subtitle: "Who physically holds the collected cash vs. who earned it by project equity.",
      totalCollected: "Total collected inflow",
      totalCollectedHint: "All client payments, all projects",
      heldByTitle: "Cash held per partner",
      heldByDesc: "Physical custody right now",
      tableTitle: "Partner custody breakdown",
      tableDesc: "Held − earned = net position. Positive owes partners, negative is owed.",
      colPartner: "Partner",
      colHeld: "Cash held",
      colEarned: "Earned share",
      colNet: "Net position",
      owesPartners: "owes partners",
      owedByPartners: "owed by partners",
      balanced: "balanced",
      noPartners: "No partners yet.",
      noCash: "No client payments recorded yet — custody appears here once cash arrives.",
      settleTitle: "Settlement suggestions",
      settleDesc: "Simplified partner-to-partner transfers that zero out every net position.",
      settleAllClear: "Everyone is balanced — no transfers needed. ✓",
      settleLine: (from, to, amount) => `${from} → ${to}: ${amount}`,
    },
    ledger: {
      title: "Partner ledger",
      subtitle: "Balance = Pending reimbursements + Realized profit shares + Company net − Drawings",
      noPartners: "No partners yet.",
      pendingShort: "Pending reimb.",
      profitShare: "Profit share",
      companyNet: "Company net",
      drawings: "Drawings",
      recordTitle: "Record drawing",
      recordDesc: "Partner cash withdrawal against balance.",
      pendingTitle: "Pending reimbursements",
      pendingDesc: "Out-of-pocket expenses awaiting settlement.",
      colProject: "Project",
      colPartner: "Partner",
      colAmount: "Amount",
      allSettled: "Nothing pending — all settled. ✓",
      recentTitle: "Recent drawings",
      colDate: "Date",
      colNotes: "Notes",
      colAction: "Action",
      cancelDrawing: "Cancel drawing",
      noDrawings: "No drawings recorded.",
      formulaTitle: "Formula reference",
      fPending: "Pending = Σ expenses where isReimbursed = false",
      fProfit: "Profit = Σ (project inflow − project expenses) × snapshot %",
      fBalance: "Balance = Pending + Profit − Drawings",
      unavailable: "Ledger unavailable",
      unavailableDesc: "Connect the database to view live balances.",
    },
  },
  ar: {
    brand: "دفتر الشركاء",
    nav: { dashboard: "لوحة التحكم", projects: "المشاريع", partners: "الشركاء", ledger: "دفتر الشركاء", company: "مصاريف الشركة", summary: "الملخص", capital: "رأس مال الشركة" },
    firmOverview: "نظرة عامة على الشركة",
    overviewSubtitle: (p, a) =>
      `${p} مشاريع · ${a} شركاء نشطون · تُسوَّى المصروفات قبل توزيع الأرباح`,
    rangeFilter: {
      all: "كل الفترات",
      month: "شهر",
      year: "سنة",
      custom: "مخصص",
      from: "من",
      to: "إلى",
    },
    fixedCostsTitle: "المصاريف الثابتة",
    fixedCostsSubtitle: "مصاريف عمومية متكررة — إيجار، اشتراكات… صافي الربح محسوب بعد خصمها.",
    fixedCostsEmpty: "لا توجد مصاريف ثابتة معرفة بعد.",
    fixedCostsTotal: "إجمالي الثابت الشهري",
    manageFixed: "إدارة المصاريف الثابتة",
    variableCostsTitle: "المصاريف المتغيرة",
    variableCostsSubtitle: "مصاريف لمرة واحدة — داخلة في إجمالي المصروفات وصافي الربح.",
    variableCostsEmpty: "لا توجد مصاريف متغيرة مسجلة بعد.",
    variableCostsTotal: "إجمالي المتغير",
    projectCostsTitle: "مصاريف المشروعات",
    projectCostsSubtitle: "تكاليف مباشرة دفعها الشركاء — جزء من إجمالي المصروفات.",
    projectCostsEmpty: "لا توجد مصاريف مشروعات مسجلة بعد.",
    projectCostsTotal: "إجمالي المشروعات",
    newProject: "مشروع جديد",
    viewLedger: "عرض الدفتر",
    allProjects: "كل المشاريع",
    stats: {
      inflow: "إجمالي الوارد",
      expenses: "إجمالي المصروفات",
      expensesHint: "مشاريع + ثابتة + متغيرة",
      fixed: "المصاريف الثابتة",
      variable: "المصاريف المتغيرة",
      project: "مصاريف المشروعات",
      netProfit: "صافي الربح (بعد المصاريف)",
      netProfitHint: "الوارد − مشاريع − ثابتة − متغيرة",
      outstanding: "المستحقات المعلقة",
      drawings: "إجمالي المسحوبات",
      contractValue: "قيمة العقود",
    },
    partnerBalances: "أرصدة الشركاء",
    balancesSubtitle: "المستحقات المعلقة + حصص الأرباح − المسحوبات",
    table: { partner: "الشريك", pending: "معلَّق", profit: "الربح", balance: "الرصيد" },
    noPartners: "لا يوجد شركاء بعد.",
    addOne: "أضف شريكًا",
    projects: "المشاريع",
    projectsSubtitle: "صافي الربح المحقق = الوارد − المصروفات",
    in: "وارد",
    out: "منصرف",
    net: "صافي",
    noProjects: "لا توجد مشاريع بعد.",
    createOne: "أنشئ مشروعًا",
    footer: "الرصيد = المستحقات المعلقة + حصص الأرباح المحققة + صافي الشركة − المسحوبات",
    dbTitle: "قاعدة البيانات غير متصلة",
    dbDesc: "اضبط DATABASE_URL على قاعدة بيانات PostgreSQL للتشغيل.",
    dbRefresh: "حدِّث الصفحة.",
    partners: {
      title: "الشركاء",
      subtitle:
        "يجب أن يساوي إجمالي حصص التأسيس 100% عبر الشركاء النشطين. تغيير القيم الافتراضية لا يعيد كتابة حصص المشاريع السابقة أبدًا.",
      addTitle: "إضافة شريك",
      addDesc: "يبدأ الشركاء الجدد بنسبة 0% حتى إعادة التوازن.",
      globalTitle: "حصص التأسيس الافتراضية",
      activeTotal: (total, valid) =>
        `الإجمالي النشط: ${total}% ${valid ? "✓ صالح" : "— يجب أن يساوي 100%"}`,
      noActive: "لا يوجد شركاء نشطون بعد.",
      allTitle: "كل الشركاء",
      colName: "الاسم",
      colEmail: "البريد الإلكتروني",
      colDefault: "النسبة الافتراضية %",
      colStatus: "الحالة",
      colActions: "إجراءات",
      active: "نشط",
      inactive: "غير نشط",
      noRows: "لا يوجد شركاء بعد — أضف الأول أعلاه.",
      deactivate: "إلغاء التفعيل",
      reactivate: "إعادة التفعيل",
      edit: "تعديل",
      delete: "حذف",
      deleteConfirm: "اضغط مرة أخرى لتأكيد الحذف",
      deleting: "جارٍ الحذف…",
      cancel: "إلغاء",
      deleteHasHistory:
        "لا يمكن الحذف: لهذا الشريك مشاريع أو مصاريف أو مسحوبات مسجلة. استخدم إلغاء التفعيل بدلًا من ذلك.",
    },
    partnerForm: {
      name: "الاسم",
      email: "البريد الإلكتروني (اختياري)",
      equity: "نسبة الحصة الافتراضية %",
      activePartner: "شريك نشط",
      saving: "جارٍ الحفظ…",
      save: "حفظ التغييرات",
      add: "إضافة شريك",
      note: "ملاحظة: تغيير النسبة الافتراضية لا يعيد كتابة حصص المشاريع السابقة أبدًا. استخدم «تحديث القيم الافتراضية» لإعادة التوازن إلى 100%.",
    },
    splits: {
      total: (total, valid) =>
        `الإجمالي: ${total}% ${valid ? "✓ يساوي 100%" : "— يجب أن يساوي 100% بالضبط"}`,
      inactive: "(غير نشط)",
      equal: "توزيع بالتساوي",
      clear: "مسح",
      autoHint: "الصف الأخير يُكمَّل تلقائيًا إلى 100",
    },
    defaultsForm: { save: "تحديث القيم الافتراضية العامة", saving: "جارٍ الحفظ…" },
    projectsPage: {
      title: "المشاريع",
      subtitle:
        "تُؤخذ لقطة من الحصص لكل مشروع — التغييرات العامة اللاحقة لا تغيّر التوزيعات السابقة أبدًا.",
      newTitle: "مشروع جديد",
      newDesc: "تُملأ الحصص تلقائيًا من القيم الافتراضية العامة؛ عدّل بحرية (يجب = 100%).",
      addFirstPre: "أضف شريكًا نشطًا أولًا من صفحة",
      partnersLink: "الشركاء",
      addFirstPost: ".",
      contractWord: "عقد",
      partnersWord: "شركاء",
      noProjects: "لا توجد مشاريع بعد — أنشئ الأول.",
      newProjectBtn: "مشروع جديد",
      statsActive: "النشطة",
      statsPipeline: "إجمالي العقود",
      filterAll: "الكل",
      searchPh: "ابحث في المشاريع…",
      emptyTitle: "لا توجد مشاريع بعد",
      emptyDesc: "أنشئ أول مشروع لبدء تتبع الوارد والمصروفات والحصص.",
      emptyCta: "إنشاء مشروع",
      colProject: "المشروع",
      colStatus: "الحالة",
      colContract: "العقد",
      colInflow: "الوارد",
      colOut: "المنصرف",
      colNet: "الصافي",
      noResults: "لا توجد مشاريع مطابقة لهذا الفلتر.",
      createdToast: (name) => `تم إنشاء مشروع «${name}».`,
    },
    projectForm: {
      name: "اسم المشروع",
      namePh: "موقع أكمي",
      contractValue: "قيمة العقد",
      status: "الحالة",
      statuses: {
        UPCOMING: "قادم",
        ACTIVE: "نشط",
        COMPLETED: "مكتمل",
        ON_HOLD: "معلَّق",
        CANCELLED: "ملغي",
      },
      description: "الوصف (اختياري)",
      descPh: "النطاق، العميل، ملاحظات…",
      snapshot: "لقطة حصص المشروع (يجب = 100%)",
      copyDefaults: "نسخ القيم الافتراضية",
      half: "50/50 للأولين",
      equalSplit: "بالتساوي",
      balanced: "متوازنة · 100%",
      offBy: (delta) => `الفرق ${delta}`,
      creating: "جارٍ الإنشاء…",
      create: "إنشاء المشروع",
      splitsError: (total) => `يجب أن تساوي الحصص 100% (الحالي ${total}%).`,
      expensesTitle: "المصروفات",
      addItem: "+ إضافة بند مصروف",
      itemName: "اسم البند",
      itemNamePh: "استضافة، دومين…",
      cost: "التكلفة",
      expenseError: "كل بند مصروف يحتاج اسمًا ومبلغًا صحيحًا وشريكًا دافعًا.",
      totalExpenses: "إجمالي المصروفات",
      estProfit: "صافي الربح التقديري",
      clientCovered: "يغطيها العميل",
    },
    projectDetail: {
      noDescription: "لا يوجد وصف.",
      contractValue: "قيمة العقد",
      inflow: "إجمالي الوارد",
      expenses: "إجمالي المصروفات",
      netProfit: "صافي الربح المحقق",
      outstanding: "المستحقات المعلقة (تُسوَّى أولًا)",
      cashAfter: "النقدية بعد التسويات",
      settlement: "خطة التسوية",
      settlementDesc: "① سداد المصروفات المدفوعة مقدمًا ② توزيع صافي الربح حسب الحصص اللقطة",
      colPartner: "الشريك",
      colShare: "الحصة",
      colReimb: "مستحقات السداد",
      colProfit: "حصة الربح",
      colOwed: "الإجمالي المستحق",
      snapshotTitle: "لقطة حصص المشروع",
      snapshotDesc: "سجل تاريخي ثابت — التعديل يؤثر على هذا المشروع فقط.",
      saveSplits: "حفظ حصص المشروع",
      saving: "جارٍ الحفظ…",
      recordPayment: "تسجيل دفعة عميل",
      recordPaymentDesc: "وارد مرحلي من العميل.",
      paymentsTitle: (n) => `دفعات العملاء (${n})`,
      colDate: "التاريخ",
      colMilestone: "المرحلة",
      colReceivedBy: "استلمها",
      colAmount: "المبلغ",
      noPayments: "لا توجد دفعات مسجلة بعد.",
      logExpense: "تسجيل مصروف مدفوع مقدمًا",
      logExpenseDesc: "مدفوع من مال الشريك الخاص.",
      howTitle: "كيف يعمل السداد",
      how1: "1. يدفع الشريك من ماله الخاص ← يُسجَّل المصروف كـ",
      how2pre: "2. تصل دفعة العميل ← اضغط",
      howMark: "تعليم كمُسدَّد",
      how2post: "لتسوية مستحقات ذلك الشريك أولًا.",
      how3: "3. يُوزَّع صافي الربح المتبقي (الوارد − كل المصروفات) حسب النسبة اللقطة أعلاه.",
      expensesTitle: (n) => `المصروفات التشغيلية (${n})`,
      colDesc: "الوصف",
      colPaidBy: "دفعه",
      colStatus: "الحالة",
      colAction: "إجراء",
      reimbursed: "مُسدَّد",
      pending: "معلَّق",
      clientPaid: "مدفوعة من العميل",
      clientCovered: "يغطيها العميل (للعلم فقط)",
      mark: "تعليم كمُسدَّد",
      unmark: "إلغاء التعليم",
      noExpenses: "لا توجد مصروفات مسجلة بعد.",
      editTitle: "تعديل المشروع",
      editDesc:
        "حدّث الاسم أو القيمة أو الحالة أو الوصف. الحصص تُعدَّل منفصلًا أعلاه.",
      deleteTitle: "منطقة الخطر",
      deleteDesc: (projectName) =>
        `حذف «${projectName}» يزيل نهائيًا دفعاته ومصاريفه ولقطة حصصه. أرصدة الشركاء ستتغير.`,
      delete: "حذف المشروع",
      deleteConfirm: "اضغط مرة أخرى لتأكيد الحذف",
      deleting: "جارٍ الحذف…",
      cancel: "إلغاء",
    },
    paymentForm: {
      amount: "المبلغ",
      paidAt: "تاريخ الدفع",
      milestone: "المرحلة (اختياري)",
      milestonePh: "المرحلة 1 — دفعة مقدمة",
      notes: "ملاحظات (اختياري)",
      notesPh: "مرجع البنك، رقم الفاتورة…",
      recording: "جارٍ التسجيل…",
      record: "تسجيل الدفعة",
      receivedBy: "المستلم الفعلي للدفعة",
      selectCustodian: "اختر من يستلم المبلغ…",
    },
    expenseForm: {
      paidBy: "دُفع بواسطة",
      selectPartner: "اختر الشريك…",
      clientPaid: "مدفوعة من العميل",
      amount: "المبلغ",
      description: "الوصف",
      descPh: "تكاليف الخوادم، السفر…",
      expenseDate: "تاريخ المصروف",
      logging: "جارٍ التسجيل…",
      log: "تسجيل المصروف",
    },
    drawingForm: {
      partner: "الشريك",
      select: "اختر…",
      amount: "المبلغ",
      notes: "ملاحظات (اختياري)",
      notesPh: "مسحوبات شهرية…",
      recording: "جارٍ التسجيل…",
      record: "تسجيل المسحوبات",
    },
    company: {
      title: "مصاريف الشركة",
      subtitle:
        "الإيجار والاشتراكات والمصاريف العمومية — تُوزع حسب حصص التأسيس. اللي يدفع زيادة عن حصته تتسجّل له رصيدًا معلَّقًا.",
      addTitle: "تسجيل دفعة",
      addDesc: "اختر مصروفًا ثابتًا أو أدخل مصروفًا لمرة واحدة.",
      fTitle: "الاسم",
      titlePh: "إيجار المكتب، اشتراكات…",
      amount: "المبلغ",
      date: "التاريخ",
      notes: "ملاحظات (اختياري)",
      add: "إضافة مصروف",
      saving: "جارٍ الحفظ…",
      noExpenses: "لا توجد مصاريف شركة بعد.",
      colPartner: "الشريك",
      colShare: "الحصة",
      colShareAmount: "قيمة الحصة",
      colPaid: "المدفوع",
      colNet: "الصافي",
      overpaid: "دفع زيادة",
      owes: "عليه",
      settled: "متساوي",
      collected: "تم تحصيله",
      remaining: "متبقي للتحصيل",
      payTitle: "تسجيل دفعة",
      payDesc: "مين دفع كام في البند ده.",
      record: "تسجيل الدفعة",
      recording: "جارٍ التسجيل…",
      delete: "حذف",
      deleteConfirm: "اضغط مرة أخرى لتأكيد الحذف",
      deleting: "جارٍ الحذف…",
      cancel: "إلغاء",
      warnDefaults: "حصص التأسيس لا تساوي 100% — اظبطها من صفحة الشركاء عشان التوزيع يبقى مظبوط.",
      emptyPayments: "لا توجد دفعات مسجلة بعد.",
      payersTitle: "مين دفع",
      fillShares: "ملىء الحصص",
      covered: "متغطي بالكامل ✓",
      fixedTitle: "المصاريف الثابتة",
      fixedDesc: "عرّفها مرة واحدة — الإيجار والاشتراكات… واختر منها عند التسجيل.",
      fixedAdd: "إضافة ثابت",
      chooseExpense: "المصروف",
      customOption: "مخصص (مرة واحدة)…",
      chosenCount: (n) => `تم اختيار ${n}`,
      clearSel: "مسح الاختيار",
      varTitle: "تسجيل مصروف متغير",
      varDesc: "مصروف لمرة واحدة دفعه شريك واحد أو أكثر.",
      varAdd: "إضافة",
      colSettle: "تسوية",
      settle: "سوِّ",
      settling: "جارٍ التسوية…",
      settleCollect: "حصّل منه",
      settlePayout: "ادفع له",
      settleAll: "تسوية الكل",
      settledAll: "تمت تسوية البند بالكامل ✓",
      alreadySettled: "متساوي بالفعل.",
      colPayout: "مدفوع له",
      payoutTitle: "رد مبلغ لشريك",
      payoutDesc: "سجّل كاش الشركة ردّته لشريك (يصفّي رصيده الدائن).",
      payoutBill: "البند (اختياري)",
      payoutGeneral: "عام (بدون بند)…",
      payoutAdd: "تسجيل الرد",
      payoutHistory: "مبالغ ردّتها الشركة للشركاء",
      payoutHistoryDesc: "الكاش اللي الشركة ردّته. احذف للتراجع.",
      noPayouts: "لا توجد مبالغ مردودة بعد.",
      payoutTo: "إلى",
    },
    summary: {
      title: "الملخص الشهري",
      subtitle: "على أساس دفاتر الشركة: تكاليف العميل مستبعدة.",
      chooseMonth: "اختر الشهر",
      fixed: "ثابتة",
      variable: "متغيرة",
      direct: "مصاريف مشاريع مباشرة",
      monthTotal: "إجمالي الشهر",
      colPartner: "الشريك",
      colPaid: "اللي دفعه",
      colOwe: "نصيبه المفروض",
      colBalance: "الرصيد",
      toHim: "له",
      owes: "عليه",
      settled: "متساوي",
      details: "تفاصيل مصاريف الشهر",
      colKind: "النوع",
      colTitle: "البيان",
      colAmount: "المبلغ",
      colPaidBy: "مين دفع",
      kindFixed: "ثابتة",
      kindVariable: "متغيرة",
      kindProject: "مشاريع",
      empty: "لا توجد مصاريف مسجلة هذا الشهر.",
    },
    capital: {
      title: "رأس مال الشركة والخزينة",
      subtitle: "مين ماسك الكاش المتحصل فعلًا مقابل نصيب كل شريك حسب حصص المشاريع.",
      totalCollected: "إجمالي السيولة المحصلة",
      totalCollectedHint: "كل دفعات العملاء في كل المشاريع",
      heldByTitle: "النقدية في حوزة الشركاء",
      heldByDesc: "التوزيع الفعلي للكاش الآن",
      tableTitle: "تفصيل عهدة الشركاء",
      tableDesc: "الممسوك − المستحق = صافي العهدة. الموجب عليه للشركاء، والسالب له عند الشركاء.",
      colPartner: "الشريك",
      colHeld: "النقدية في حوزته",
      colEarned: "نصيبه المستحق",
      colNet: "صافي العهدة",
      owesPartners: "عليه للشركاء",
      owedByPartners: "له عند الشركاء",
      balanced: "متساوي",
      noPartners: "لا يوجد شركاء بعد.",
      noCash: "لا توجد دفعات عملاء مسجلة بعد — العهدة هتظهر هنا أول ما يوصل كاش.",
      settleTitle: "اقتراح التسويات البينية",
      settleDesc: "تحويلات مبسطة بين الشركاء تصفّر كل صافي عهدة.",
      settleAllClear: "الكل متساوي — لا توجد تحويلات مطلوبة. ✓",
      settleLine: (from, to, amount) => `${from} يدفع إلى ${to}: ${amount}`,
    },
    ledger: {
      title: "دفتر الشركاء",
      subtitle: "الرصيد = المستحقات المعلقة + حصص الأرباح المحققة + صافي الشركة − المسحوبات",
      noPartners: "لا يوجد شركاء بعد.",
      pendingShort: "مستحقات معلقة",
      profitShare: "حصة الربح",
      companyNet: "صافي الشركة",
      drawings: "المسحوبات",
      recordTitle: "تسجيل مسحوبات",
      recordDesc: "سحب نقدي للشريك مقابل الرصيد.",
      pendingTitle: "المستحقات المعلقة",
      pendingDesc: "مصروفات مدفوعة مقدمًا بانتظار التسوية.",
      colProject: "المشروع",
      colPartner: "الشريك",
      colAmount: "المبلغ",
      allSettled: "لا شيء معلق — تمت التسوية ✓",
      recentTitle: "المسحوبات الأخيرة",
      colDate: "التاريخ",
      colNotes: "ملاحظات",
      colAction: "إجراء",
      cancelDrawing: "إلغاء السحب",
      noDrawings: "لا توجد مسحوبات مسجلة.",
      formulaTitle: "مرجع المعادلة",
      fPending: "المعلَّق = Σ المصروفات حيث isReimbursed = false",
      fProfit: "الربح = Σ (وارد المشروع − مصروفات المشروع) × النسبة اللقطة",
      fBalance: "الرصيد = المعلَّق + الربح − المسحوبات",
      unavailable: "الدفتر غير متاح",
      unavailableDesc: "صل قاعدة البيانات لعرض الأرصدة الحية.",
    },
  },
};
