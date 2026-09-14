"use client";

import { MOCKUP_SECTION_LABEL } from "@/lib/mockupLayout";

export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={MOCKUP_SECTION_LABEL.row}>
      <span className={MOCKUP_SECTION_LABEL.dot} aria-hidden />
      <h2 className={`${MOCKUP_SECTION_LABEL.text} min-w-0 truncate`}>{children}</h2>
    </div>
  );
}
