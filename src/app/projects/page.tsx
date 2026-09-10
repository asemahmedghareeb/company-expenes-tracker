import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectForm } from "@/components/forms/project-form";
import { getPartners, getProjects } from "@/actions/queries";
import { formatEGP } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { toNumber } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const lang = await getLang();
  const t = dict[lang];
  const tp = t.projectsPage;

  const [partners, projects] = await Promise.all([
    getPartners().catch(() => []),
    getProjects().catch(() => []),
  ]);

  const activePartners = partners.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{tp.title}</h1>
        <p className="text-sm text-muted-foreground">{tp.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tp.newTitle}</CardTitle>
            <CardDescription>{tp.newDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {activePartners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tp.addFirstPre}{" "}
                <Link href="/partners" className="underline">
                  {tp.partnersLink}
                </Link>{" "}
                {tp.addFirstPost}
              </p>
            ) : (
              <ProjectForm
                lang={lang}
                partners={activePartners.map((p) => ({
                  id: p.id,
                  name: p.name,
                  defaultSharePercentage: p.defaultSharePercentage,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {projects.map((p) => {
            const inflow = p.clientPayments.reduce((a, x) => a + toNumber(x.amount), 0);
            const out = p.expenses.reduce((a, x) => a + toNumber(x.amount), 0);
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>
                        {formatEGP(toNumber(p.contractValue), lang)} {tp.contractWord} ·{" "}
                        {p.projectPartners.length} {tp.partnersWord}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        p.status === "ACTIVE"
                          ? "success"
                          : p.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {t.projectForm.statuses[p.status]}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {t.in} {formatEGP(inflow, lang)} · {t.out} {formatEGP(out, lang)} ·{" "}
                    {t.net} {formatEGP(inflow - out, lang)}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {tp.noProjects}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
