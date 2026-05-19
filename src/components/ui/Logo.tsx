import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  /** Dónde linkea. Default: "/" */
  href?: string;
  /** Variante de tamaño */
  size?: "sm" | "md" | "lg";
  /** Mostrar solo el isotipo (cuadrado azul con Z) sin la imagen */
  iconOnly?: boolean;
}

const SIZES = {
  sm: { w: 100, h: 68, cls: "w-[100px]" },
  md: { w: 140, h: 95,  cls: "w-[140px]" },
  lg: { w: 200, h: 136, cls: "w-[200px]" },
};

export default function Logo({
  href = "/",
  size = "md",
  iconOnly = false,
}: LogoProps) {
  const { w, h, cls } = SIZES[size];

  const inner = iconOnly ? (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-azul-principal">
      <span className="font-serif text-base font-bold text-white">Z</span>
    </div>
  ) : (
    <div className="flex flex-col items-start gap-0.5">
      <span className="font-serif text-lg font-bold leading-none text-azul-principal">
        Zprest
      </span>
      <Image
        src="/logo-header-430x293.png"
        alt="Zprest"
        width={w}
        height={h}
        className={`${cls} object-contain`}
        priority
      />
    </div>
  );

  return (
    <Link href={href} className="inline-flex items-center">
      {inner}
    </Link>
  );
}
