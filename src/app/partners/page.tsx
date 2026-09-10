import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { dict, getLang } from "@/lib/i18n";
import { sharesSumTo100 } from "@/lib/shares";
import { PartnerRow } from "./partner-buttons";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const lang = await getLang();
  const t = dict[lang].partners;

  let partners: Awaited<ReturnType<typeof getPartners>> = [];
  try {
    partners = await getPartners();
  } catch {
    partners = [];
  }

  const active = partners.filter((p) => p.isActive);
  const total = active.reduce((a, p) => a + p.defaultSharePercentage, 0);
  const sumOk =
    active.length === 0 ||
    sharesSumTo100(active.map((p) => p.defaultSharePercentage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.addTitle}</CardTitle>
            <CardDescription>{t.addDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <PartnerForm lang={lang} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.globalTitle}</CardTitle>
            <CardDescription>
              {active.length > 0 ? t.activeTotal(total.toFixed(2), sumOk) : t.noActive}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noActive}</p>
            ) : (
              <DefaultSplitsForm
                lang={lang}
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
          <CardTitle>{t.allTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colName}</TableHead>
                <TableHead>{t.colEmail}</TableHead>
                <TableHead className="text-end">{t.colDefault}</TableHead>
                <TableHead>{t.colStatus}</TableHead>
                <TableHead className="text-end">{t.colActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <PartnerRow key={p.id} partner={p} lang={lang} />
              ))}
              {partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t.noRows}
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
