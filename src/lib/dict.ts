import type { Lang } from "./format";

export type { Lang };

export interface Dictionary {
  brand: string;
  nav: { dashboard: string; projects: string; partners: string; ledger: string };
  firmOverview: string;
  overviewSubtitle: (projectCount: number, activePartners: number) => string;
  newProject: string;
  viewLedger: string;
  allProjects: string;
  stats: {
    inflow: string;
    expenses: string;
    netProfit: string;
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
    creating: string;
    create: string;
    splitsError: (total: string) => string;
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
  };
  expenseForm: {
    paidBy: string;
    selectPartner: string;
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
  /* ------------------------------- Ledger ------------------------------- */
  ledger: {
    title: string;
    subtitle: string;
    noPartners: string;
    pendingShort: string;
    profitShare: string;
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
    nav: { dashboard: "Dashboard", projects: "Projects", partners: "Partners", ledger: "Ledger" },
    firmOverview: "Firm overview",
    overviewSubtitle: (p, a) =>
      `${p} projects · ${a} active partners · expenses settle before profit splits`,
    newProject: "New project",
    viewLedger: "View ledger",
    allProjects: "All projects",
    stats: {
      inflow: "Total inflow",
      expenses: "Total expenses",
      netProfit: "Net profit",
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
    footer: "Balance = Pending reimbursements + Realized profit shares − Drawings",
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
      creating: "Creating…",
      create: "Create project",
      splitsError: (total) => `Splits must sum to 100% (currently ${total}%).`,
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
    },
    expenseForm: {
      paidBy: "Paid by",
      selectPartner: "Select partner…",
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
    ledger: {
      title: "Partner ledger",
      subtitle: "Balance = Pending reimbursements + Realized profit shares − Drawings",
      noPartners: "No partners yet.",
      pendingShort: "Pending reimb.",
      profitShare: "Profit share",
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
    nav: { dashboard: "لوحة التحكم", projects: "المشاريع", partners: "الشركاء", ledger: "الدفتر" },
    firmOverview: "نظرة عامة على الشركة",
    overviewSubtitle: (p, a) =>
      `${p} مشاريع · ${a} شركاء نشطون · تُسوَّى المصروفات قبل توزيع الأرباح`,
    newProject: "مشروع جديد",
    viewLedger: "عرض الدفتر",
    allProjects: "كل المشاريع",
    stats: {
      inflow: "إجمالي الوارد",
      expenses: "إجمالي المصروفات",
      netProfit: "صافي الربح",
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
    footer: "الرصيد = المستحقات المعلقة + حصص الأرباح المحققة − المسحوبات",
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
      creating: "جارٍ الإنشاء…",
      create: "إنشاء المشروع",
      splitsError: (total) => `يجب أن تساوي الحصص 100% (الحالي ${total}%).`,
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
    },
    expenseForm: {
      paidBy: "دُفع بواسطة",
      selectPartner: "اختر الشريك…",
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
    ledger: {
      title: "دفتر الشركاء",
      subtitle: "الرصيد = المستحقات المعلقة + حصص الأرباح المحققة − المسحوبات",
      noPartners: "لا يوجد شركاء بعد.",
      pendingShort: "مستحقات معلقة",
      profitShare: "حصة الربح",
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
