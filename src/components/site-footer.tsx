import { LocaleLink as Link } from "@/components/locale-link";
import { getTranslator } from "@/i18n/website";

export async function SiteFooter() {
  const { t } = await getTranslator();
  return (
    <footer className="border-t hidden md:block">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-foreground">{t("footer.terms")}</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-foreground">{t("footer.privacy")}</Link>
            <span>•</span>
            <span>{t("footer.powered")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
