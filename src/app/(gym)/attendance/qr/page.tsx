import QRCode from "qrcode";
import { ActionForm } from "@/components/action-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireGym } from "@/lib/session";
import { checkinUrl } from "@/lib/checkin";
import { generateCheckinCodeAction } from "./actions";
import { PrintButton } from "./print-button";

export const metadata = { title: "Check-in QR" };

export default async function CheckinQrPage() {
  const ctx = await requireGym();
  ctx.assert("attendance.manage");

  const gym = await db.gym.findUniqueOrThrow({
    where: { id: ctx.gymId },
    select: { name: true, checkinCode: true },
  });

  const url = gym.checkinCode ? checkinUrl(gym.checkinCode) : null;
  const qr = url
    ? await QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M" })
    : null;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Check-in QR"
          description="Print this and place it at the front desk. Members scan it and enter their phone number."
        />
      </div>

      <div className="mx-auto max-w-md space-y-4">
        <Card>
          <CardHeader className="print:hidden">
            <CardTitle>Front desk QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 text-center">
            {qr ? (
              <>
                <h2 className="hidden text-2xl font-bold print:block">{gym.name}</h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Check-in QR code" className="w-72 max-w-full" />
                <p className="text-lg font-semibold">Scan to check in</p>
                <p className="break-all text-xs text-muted-foreground print:hidden">{url}</p>
                <div className="print:hidden">
                  <PrintButton />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No QR yet. Create one to start accepting check-ins.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>{gym.checkinCode ? "Replace QR code" : "Create QR code"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gym.checkinCode && (
              <p className="text-sm text-muted-foreground">
                Replace it if the QR was shared or leaked. The old printed QR stops working immediately.
              </p>
            )}
            <ActionForm
              action={generateCheckinCodeAction}
              submitLabel={gym.checkinCode ? "Generate new QR" : "Create QR"}
            >
              {null}
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}