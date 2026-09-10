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
import { formatMoney } from "@/lib/format";
import { toNumber } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [partners, projects] = await Promise.all([
    getPartners().catch(() => []),
    getProjects().catch(() => []),
  ]);

  const activePartners = partners.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Equity is snapshotted per project — later global changes never mutate
          historic distributions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
            <CardDescription>
              Splits auto-populate from global defaults; adjust freely (must =
              100%).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activePartners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add an active partner first on the{" "}
                <Link href="/partners" className="underline">
                  Partners
                </Link>{" "}
                page.
              </p>
            ) : (
              <ProjectForm
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
                        {formatMoney(toNumber(p.contractValue))} contract ·{" "}
                        {p.projectPartners.length} partners
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
                      {p.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    In {formatMoney(inflow)} · Out {formatMoney(out)} · Net{" "}
                    {formatMoney(inflow - out)}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {projects.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No projects yet — create your first.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
