import { router } from "expo-router";
import { Button, Message } from "~/components/ui";
import { useLocale } from "~/lib/locale";

/** Shown on tabs that need an account (same rule as the website's requiresAuth tabs). */
export function SignInPrompt({ title }: { title?: string }) {
  const { t, ui } = useLocale();
  return (
    <Message title={title ?? t("common.loginRequired")}>
      <Button label={ui("Sign in")} onPress={() => router.push("/login")} style={{ alignSelf: "stretch" }} />
    </Message>
  );
}
