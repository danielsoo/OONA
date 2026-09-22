"use client";

import Link from "next/link";
import { useState } from "react";
import UploaderFeedbackModal from "@/components/uploader/UploaderFeedbackModal";
import UiText from "@/components/i18n/UiText";

type Props = {
  area?: string;
  showMyWorks?: boolean;
};

export default function UploaderHeaderActions({ area, showMyWorks = true }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const buttonClass = "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.025] px-4 text-[13px] font-semibold text-white/75 transition hover:border-white/40 hover:bg-white/[0.055] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-xiio-accent";
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {showMyWorks ? (
          <Link href="/uploader/works" className={buttonClass}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg><UiText text={"My works"} /></Link>
        ) : null}
        <button type="button" onClick={() => setFeedbackOpen(true)} className={buttonClass}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 18.5 3.5 21v-4.8A8 8 0 0 1 2 11.5C2 6.8 6.5 3 12 3s10 3.8 10 8.5S17.5 20 12 20c-1.8 0-3.5-.4-5-1.1Z" />
          </svg><UiText text={"Send feedback"} /></button>
      </div>
      <UploaderFeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} area={area} />
    </>
  );
}
