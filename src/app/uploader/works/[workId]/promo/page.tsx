import { Suspense } from "react";
import PromoEditorContent from "@/components/uploader/PromoEditorContent";
import UiText from "@/components/i18n/UiText";

type Props = { params: Promise<{ workId: string }> };

export default async function PromoEditorPage({ params }: Props) {
  const { workId } = await params;
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-xiio-bg flex items-center justify-center text-white">
          <p className="text-xiio-muted"><UiText text={"Loading…"} /></p>
        </main>
      }
    >
      <PromoEditorContent workId={workId} />
    </Suspense>
  );
}
