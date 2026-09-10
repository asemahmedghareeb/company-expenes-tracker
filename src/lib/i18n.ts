import { cookies } from "next/headers";
import type { Lang } from "./format";

export type { Lang };

export const isRTL = (lang: Lang): boolean => lang === "ar";

export const LANG_COOKIE = "lang";

/** Resolve the current language from the `lang` cookie (server only). */
export async function getLang(): Promise<Lang> {
  try {
    const value = (await cookies()).get(LANG_COOKIE)?.value;
    return value === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

interface Dictionary {
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
  },
};
