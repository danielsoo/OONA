"use client";

import LoginPromptDialog from "@/components/auth/LoginPromptDialog";

export default function SocietyLoginDialog({ returnTo = "/society", ...props }: {
  open: boolean;
  onClose: () => void;
  returnTo?: string;
}) {
  return <LoginPromptDialog {...props} returnTo={returnTo} society />;
}
