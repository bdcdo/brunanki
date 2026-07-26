import Link from "next/link";

/**
 * A marca: três faixas horizontais numa moldura arredondada.
 *
 * Vive fora do AppShell porque a casca de sessão também precisa dela — lá ela
 * é, além da identidade, a única saída da tela.
 */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={className ? `brand ${className}` : "brand"}
      aria-label="Ptanki — início"
    >
      <BrandMark />
      <strong>ptanki</strong>
    </Link>
  );
}
