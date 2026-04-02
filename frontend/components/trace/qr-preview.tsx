"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

import { getAbsoluteTraceUrl } from "@/lib/trace";

interface QrPreviewProps {
  batchId: string;
  qrCodeUrl?: string | null;
  size?: number;
  className?: string;
}

export function QrPreview({ batchId, qrCodeUrl = null, size = 176, className }: QrPreviewProps) {
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

  if (!resolvedQr) {
    return (
      <div
        className={`rounded-[24px] border border-black/10 bg-black/[0.03] ${className ?? ""}`}
        style={{ height: size, width: size }}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] ${className ?? ""}`}
      style={{ height: size, width: size }}
    >
      <Image src={resolvedQr} alt={`Trace QR for ${batchId}`} width={size} height={size} className="h-full w-full" />
    </div>
  );
}
