"use client";

import { useLocale } from "@/lib/i18n";

export function FooterDisclaimer() {
  const { t } = useLocale();
  return <>{t.footer.disclaimer}</>;
}
