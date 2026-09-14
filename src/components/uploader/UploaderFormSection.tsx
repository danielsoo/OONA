"use client";

import type { ReactNode } from "react";
import SectionLabel from "@/components/layout/SectionLabel";

type Props = {
  title: string;
  hint?: string;
  children: ReactNode;
};

/** 업로드 폼 분류 구역 카드 */
export default function UploaderFormSection({ title, hint, children }: Props) {
  return (
    <section className="space-y-6 border-b border-white/[0.1] bg-transparent pb-9">
      <header>
        <SectionLabel>{title}</SectionLabel>
        {hint ? <p className="mt-2 text-[12px] leading-relaxed text-white/40">{hint}</p> : null}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
