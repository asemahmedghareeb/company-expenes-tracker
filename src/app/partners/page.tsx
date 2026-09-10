import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartnerForm } from "@/components/forms/partner-form";
import { DefaultSplitsForm } from "@/components/forms/default-splits-form";
import { getPartners } from "@/actions/queries";
import { formatPct } from "@/lib/format";
import { SetActiveButton } from "./partner-buttons";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  let partners: Awaited<ReturnType<typeof getPartners>> = [];
  try {
    partners = await getPartners();
  } catch {
    partners = [];
  }

  const active = partners.filter((p) => p.isActive);
  const total = active.reduce((a, p) => a + p.defaultSharePercentage, 0);
  const sumOk = Math.abs(total - 100) < 0.01 || active.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
        <p className="text-sm text-muted-foreground">
          Global default equity must sum to 100% across active partners.
          Changing defaults never rewrites historic project splits.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add partner</CardTitle>
            <CardDescription>New partners start with 0% until re-balanced.</CardDescription>
          </CardHeader>
          <CardContent>
            <PartnerForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Global default equity</CardTitle>
            <CardDescription>
              Active total: {total.toFixed(2)}%{" "}
              {active.length > 0 && (sumOk ? "✓ valid" : "— must equal 100%")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active partners yet.</p>
            ) : (
              <DefaultSplitsForm
                initial={active.map((p) => ({
                  partnerId: p.id,
                  name: p.name,
                  sharePercentage: p.defaultSharePercentage,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All partners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Default %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatPct(p.defaultSharePercentage)}</TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "success" : "secondary"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <SetActiveButton id={p.id} isActive={p.isActive} />
                  </TableCell>
                </TableRow>
              ))}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No partners yet — add your first above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
