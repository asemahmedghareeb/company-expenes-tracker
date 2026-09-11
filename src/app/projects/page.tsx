import { getPartners, getProjects } from "@/actions/queries";
import { getLang } from "@/lib/i18n";
import { toNumber } from "@/lib/ledger";
import { ProjectsManager } from "./projects-manager";

// Cached by default — mutations revalidate on demand via revalidatePath().

export default async function ProjectsPage() {
  const lang = await getLang();

  const [partners, projects] = await Promise.all([
    getPartners().catch(() => []),
    getProjects().catch(() => []),
  ]);

  const activePartners = partners.filter((p) => p.isActive);

  return (
    <ProjectsManager
      lang={lang}
      hasActivePartners={activePartners.length > 0}
      partners={activePartners.map((p) => ({
        id: p.id,
        name: p.name,
        defaultSharePercentage: p.defaultSharePercentage,
      }))}
      projects={projects.map((p) => {
        const inflow = p.clientPayments.reduce((a, x) => a + toNumber(x.amount), 0);
        const out = p.expenses.reduce((a, x) => a + toNumber(x.amount), 0);
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          contractValue: toNumber(p.contractValue),
          inflow,
          out,
          net: inflow - out,
          partnerCount: p.projectPartners.length,
        };
      })}
    />
  );
}
