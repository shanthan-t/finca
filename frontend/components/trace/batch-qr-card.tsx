"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Printer, QrCode, ScanLine } from "lucide-react";
import QRCode from "qrcode";

import { useLanguage } from "@/components/providers/language-provider";
import { QrPreview } from "@/components/trace/qr-preview";
import { getAbsoluteTraceUrl, getTracePath } from "@/lib/trace";

interface BatchQrCardProps {
  batchId: string;
  qrCodeUrl?: string | null;
}

export function BatchQrCard({ batchId, qrCodeUrl = null }: BatchQrCardProps) {
  const { t } = useLanguage();
  const tracePath = getTracePath(batchId);
  const downloadName = `${batchId.toLowerCase()}-trace-qr.png`;
  const [resolvedQr, setResolvedQr] = useState(qrCodeUrl);

  useEffect(() => {
    let active = true;

    if (qrCodeUrl) {
      setResolvedQr(qrCodeUrl);
      return () => {
        active = false;
      };
    }

    QRCode.toDataURL(getAbsoluteTraceUrl(batchId))
      .then((dataUrl) => {
        if (active) {
          setResolvedQr(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedQr(null);
        }
      });

    return () => {
      active = false;
    };
  }, [batchId, qrCodeUrl]);

  const handlePrint = () => {
    const printableQr = resolvedQr ?? "";

    if (!printableQr || typeof window === "undefined") {
      return;
    }

    const printWindow = window.open("", "_blank", "width=640,height=760");

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${batchId} QR</title>
          <style>
            body { font-family: sans-serif; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; background: #f8fafc; }
            .sheet { background: white; border: 1px solid #e5e7eb; border-radius: 24px; padding: 32px; text-align: center; box-shadow: 0 24px 72px rgba(15,23,42,0.08); }
            img { width: 280px; height: 280px; display: block; margin: 0 auto 16px; }
            h1 { margin: 0 0 12px; font-size: 22px; }
            p { margin: 0; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <img src="${printableQr}" alt="QR" />
            <h1>${batchId}</h1>
            <p>${getAbsoluteTraceUrl(batchId, window.location.origin)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="glass-panel p-6 lg:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-finca-mint/70">{t("trace.qrEyebrow")}</p>
          <h3 className="mt-3 text-2xl font-semibold text-black">{t("trace.qrTitle")}</h3>
          <p className="mt-3 text-sm leading-7 text-black/65">{t("trace.qrDescription")}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-black/[0.03] text-black/70">
          <QrCode className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <QrPreview batchId={batchId} qrCodeUrl={resolvedQr} size={172} />

        <div className="flex-1 space-y-3">
          <div className="rounded-[22px] border border-black/10 bg-black/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">{t("trace.publicLink")}</p>
            <p className="mt-2 break-all text-sm text-black/75">{tracePath}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={tracePath} className="button-primary justify-center gap-2">
              {t("trace.openTrace")}
              <ScanLine className="h-4 w-4" />
            </Link>

            <a
              href={resolvedQr ?? undefined}
              download={downloadName}
              aria-disabled={!resolvedQr}
              className={`button-secondary justify-center gap-2 ${!resolvedQr ? "pointer-events-none opacity-60" : ""}`}
            >
              {t("trace.downloadQr")}
              <Download className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!resolvedQr}
              className="button-secondary justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
            >
              {t("trace.printQr")}
              <Printer className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
