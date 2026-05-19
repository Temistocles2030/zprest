"use client";

import CountUp from "react-countup";

interface AmountDisplayProps {
  amount: number;
  /** Tamaño del texto. Default: "lg" */
  size?: "sm" | "md" | "lg" | "xl";
  /** Mostrar prefijo $ */
  prefix?: boolean;
  className?: string;
  /** Animar al montar */
  animate?: boolean;
}

const SIZE_CLS = {
  sm: "text-lg font-semibold",
  md: "text-2xl font-bold",
  lg: "text-3xl font-bold",
  xl: "text-4xl font-bold",
};

export default function AmountDisplay({
  amount,
  size = "lg",
  prefix = true,
  className = "",
  animate = true,
}: AmountDisplayProps) {
  const base = `font-serif tracking-tight ${SIZE_CLS[size]} ${className}`;

  if (!animate) {
    return (
      <span className={base}>
        {prefix ? "$ " : ""}
        {amount.toLocaleString("es-AR")}
      </span>
    );
  }

  return (
    <CountUp
      start={0}
      end={amount}
      duration={1.2}
      separator="."
      decimal=","
      prefix={prefix ? "$ " : ""}
      className={base}
      useEasing
    />
  );
}
