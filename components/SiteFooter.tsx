import Link from "next/link";

// Small shared footer for the owner-facing pages.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        © 2026 SoyCasero · Recompensa tu fidelidad ·{" "}
        <Link href="/privacy-policy">Política de Privacidad</Link>
      </div>
      <div style={{ marginTop: 4 }}>
        Soporte: <a href="mailto:admin@soycasero.com">admin@soycasero.com</a>
      </div>
    </footer>
  );
}
