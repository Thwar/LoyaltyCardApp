import Link from "next/link";

// Small shared footer for the owner-facing pages.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      © 2026 SoyCasero · Recompensa tu fidelidad ·{" "}
      <Link href="/privacy-policy">Política de Privacidad</Link>
    </footer>
  );
}
