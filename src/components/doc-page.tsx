// Shared A4 page frame: school header and authorisation block.
import type { ReactNode } from "react";
import type { Settings } from "@/types";

export function A4Page({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <article className="a4-page shadow-md print:shadow-none">
        <div className="a4-frame">{children}</div>
      </article>
    </div>
  );
}

export function DocHeader({ settings, title, line }: { settings: Settings; title: string; line: string }) {
  return (
    <header>
      <div className="flex items-center gap-4">
        <img src={settings.logoUrl} alt="School logo" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
        <div className="flex-1 text-center">
          <p className="text-base font-extrabold uppercase tracking-wide text-primary sm:text-xl">{settings.schoolName}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">Examination Committee</p>
          <p className="text-xs italic text-foreground">{settings.motto}</p>
        </div>
        <div className="hidden w-16 sm:block sm:w-20" />
      </div>
      <div className="mt-3 h-1.5 bg-primary" />
      <h2 className="mt-3 text-center text-base font-bold tracking-wide text-primary sm:text-lg">{title}</h2>
      <p className="text-center text-xs font-medium text-muted-foreground sm:text-sm">{line}</p>
    </header>
  );
}

export function AuthorisationBlock({ settings, certify }: { settings: Settings; certify: string }) {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <section className="mt-auto pt-4">
      <h3 className="border-b-2 border-primary pb-1 text-xs font-bold tracking-wider text-primary">AUTHORISATION AND APPROVAL</h3>
      <p className="mt-2 text-[11px] text-muted-foreground">{certify}</p>
      <div className="mt-3 flex items-end gap-4">
        <dl className="grid flex-1 grid-cols-[auto_1fr] items-end gap-x-3 gap-y-2 text-[11px]">
          <dt className="font-bold">NAME:</dt><dd className="border-b border-dotted border-foreground/40">{settings.signatoryName}</dd>
          <dt className="font-bold">POSITION:</dt><dd className="border-b border-dotted border-foreground/40">{settings.signatoryPosition}</dd>
          <dt className="font-bold">SIGNATURE:</dt><dd className="border-b border-dotted border-foreground/40"><img src={settings.signatureUrl} alt="Signature" className="h-9 object-contain" /></dd>
          <dt className="font-bold">DATE:</dt><dd className="border-b border-dotted border-foreground/40">{today}</dd>
        </dl>
        <div className="flex w-32 shrink-0 flex-col items-center rounded border-2 border-dashed border-primary/50 p-2 sm:w-36">
          <img src={settings.stampUrl} alt="Stamp" className="h-20 w-20 object-contain" />
          <p className="mt-1 text-center text-[9px] font-bold leading-tight text-primary">EXAMINATION COMMITTEE STAMP</p>
        </div>
      </div>
    </section>
  );
}

export const examLine = (className: string, periodName: string) => `${className} | End-of-Month Examination | ${periodName}`;
