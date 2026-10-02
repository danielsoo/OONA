import { useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";
import { getHandleErrorMessage, getHandleValidationError, mapHandleApiError, sanitizeHandleInput } from "@/lib/handle";
import { Button } from "~/components/ui";
import { ApiError, apiFetch } from "~/lib/api";
import { useLocale } from "~/lib/locale";
import { colors, radius, space, type } from "~/theme";

type Kind = "displayName" | "handle" | "director";

type Pending = { status?: string; requestedName?: string; reason?: string } | null | undefined;

/** Per-kind copy and endpoint, same as the website's ProfileIdentityChangePanel and director name panel. */
const COPY: Record<
  Kind,
  { section: string; current: string; hint: string; label: string; pending: string; success: string; submit: string; api: string; field: string }
> = {
  displayName: {
    section: "profile.identity.displayNameSection",
    current: "profile.identity.displayNameCurrent",
    hint: "profile.identity.displayNameLockedHint",
    label: "profile.identity.displayNameRequestLabel",
    pending: "profile.identity.displayNamePending",
    success: "profile.identity.displayNameSuccess",
    submit: "profile.identity.displayNameSubmit",
    api: "/api/me/display-name-change-request",
    field: "requestedName",
  },
  handle: {
    section: "profile.identity.handleSection",
    current: "profile.identity.handleCurrent",
    hint: "profile.identity.handleLockedHint",
    label: "profile.identity.handleRequestLabel",
    pending: "profile.identity.handlePending",
    success: "profile.identity.handleSuccess",
    submit: "profile.identity.handleSubmit",
    api: "/api/me/handle-change-request",
    field: "requestedHandle",
  },
  director: {
    section: "settings.directorNameSection",
    current: "settings.directorNameCurrent",
    hint: "settings.directorNameLockedHint",
    label: "settings.directorNameRequestLabel",
    pending: "settings.directorNamePending",
    success: "settings.directorNameSuccess",
    submit: "settings.directorNameSubmit",
    api: "/api/me/director-name-change-request",
    field: "requestedName",
  },
};

/** Request a change to a locked identity field; an admin approves it on the website. */
export function ChangeRequestSection({
  kind,
  currentValue,
  pending,
  onSubmitted,
}: {
  kind: Kind;
  currentValue: string | null | undefined;
  pending: Pending;
  onSubmitted: () => Promise<void> | void;
}) {
  const { t } = useLocale();
  const copy = COPY[kind];
  const [requested, setRequested] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const current = currentValue?.trim();
  if (!current) return null;
  const isPending = pending?.status === "pending";
  const shown = (v: string) => (kind === "handle" ? `@${v}` : v);

  async function submit() {
    const value = requested.trim().replace(/^@/, "");
    if (!value) return;
    setMessage(null);
    if (kind === "handle") {
      const invalid = getHandleValidationError(value, t);
      if (invalid) {
        setMessage({ text: invalid, ok: false });
        return;
      }
    }
    setBusy(true);
    try {
      await apiFetch(copy.api, { method: "POST", auth: "required", json: { [copy.field]: value, reason: reason.trim() || undefined } });
      setRequested("");
      setReason("");
      setMessage({ text: t(copy.success), ok: true });
      await onSubmitted();
    } catch (err) {
      const handleCode = kind === "handle" && err instanceof ApiError ? mapHandleApiError(err.code) : null;
      setMessage({ text: handleCode ? getHandleErrorMessage(handleCode, t) : (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Text style={[styles.section, { marginTop: space(6) }]}>{t(copy.section)}</Text>
      <Text style={styles.hint}>{t(copy.hint)}</Text>
      <Text style={styles.hint}>
        {t(copy.current)}: <Text style={{ color: colors.ink }}>{shown(current)}</Text>
      </Text>
      {isPending ? (
        <Text style={styles.hint}>
          {t(copy.pending)} {pending?.requestedName ? shown(pending.requestedName) : ""}
          {pending?.reason ? ` — ${pending.reason}` : ""}
        </Text>
      ) : (
        <>
          <Text style={styles.label}>{t(copy.label)}</Text>
          <TextInput
            value={requested}
            onChangeText={(v) => setRequested(kind === "handle" ? sanitizeHandleInput(v) : v.replace(/^@/, ""))}
            autoCapitalize={kind === "handle" ? "none" : "sentences"}
            autoCorrect={kind !== "handle"}
            placeholder={kind === "handle" ? "your_name" : undefined}
            placeholderTextColor={colors.ink4}
            maxLength={120}
            style={styles.input}
          />
          {kind === "handle" ? <Text style={styles.hint}>{t("profile.edit.handleHint")}</Text> : null}
          <Text style={styles.label}>{t("profile.identity.reasonLabel")}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t("profile.identity.reasonPlaceholder")}
            placeholderTextColor={colors.ink4}
            maxLength={500}
            style={styles.input}
          />
          <Button variant="secondary" label={t(copy.submit)} loading={busy} disabled={busy || !requested.trim()} onPress={submit} />
        </>
      )}
      {message ? <Text style={[styles.hint, { color: message.ok ? colors.success : colors.destructive }]}>{message.text}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  section: { ...type.h3, color: colors.ink },
  label: { ...type.small, color: colors.ink2, marginTop: space(2) },
  hint: { ...type.small, color: colors.ink3 },
  input: {
    ...type.body,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    paddingHorizontal: space(4),
    minHeight: 48,
  },
});
