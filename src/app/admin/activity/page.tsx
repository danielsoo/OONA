import AdminActivityLog from "@/components/admin/AdminActivityLog";
import UiText from "@/components/i18n/UiText";

type Props = { searchParams: Promise<{ who?: string }> };

/** Everything people do on OONA (lib/activity), for admins: /admin/activity?who=<uid, @handle, email or visitor id>. */
export default async function AdminActivityPage({ searchParams }: Props) {
  const { who } = await searchParams;
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-white"><UiText text="Activity" /></h2>
      <p className="mb-6 max-w-3xl text-sm text-xiio-muted">
        <UiText text="Everything people do on OONA, newest first: the pages they open, what they click, the videos they watch, what they search for, and signing in and out. Visitors who aren't signed in are followed by browser, and once they sign in, what they did before is added to their account." />
      </p>
      <AdminActivityLog initialWho={who?.slice(0, 200)} />
    </div>
  );
}
