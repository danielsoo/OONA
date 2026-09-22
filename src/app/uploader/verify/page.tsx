import { Suspense } from "react";
import UploaderVerifyInner from "./UploaderVerifyInner";
import UiText from "@/components/i18n/UiText";

export default function UploaderVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-xiio-bg flex items-center justify-center text-white">
          <p className="text-xiio-muted"><UiText text={"Loading…"} /></p>
        </main>
      }
    >
      <UploaderVerifyInner />
    </Suspense>
  );
}
