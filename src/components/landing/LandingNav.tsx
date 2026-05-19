"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { PlanSimulador } from "@/types";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "#nosotros", label: "Nosotros" },
  { href: "#servicios", label: "Servicios" },
  { href: "#faq", label: "Preguntas" },
];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  born: number; life: number;
  size: number;
}

export default function LandingNav({ planes: _ }: { planes: PlanSimulador[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // ── Particles ──────────────────────────────────────────────────────────
  const spawnParticles = useCallback((cx: number, cy: number) => {
    const canvas = canvasRef.current;
    const nav = navRef.current;
    if (!canvas || !nav) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = nav.offsetWidth;
    canvas.height = nav.offsetHeight;

    const particles: Particle[] = Array.from({ length: 20 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.5;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: performance.now(),
        life: 400 + Math.random() * 250,
        size: 1.5 + Math.random() * 2.5,
      };
    });

    cancelAnimationFrame(animRef.current);
    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        const elapsed = now - p.born;
        if (elapsed >= p.life) continue;
        alive = true;
        const alpha = 1 - elapsed / p.life;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.fill();
      }
      if (alive) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    animRef.current = requestAnimationFrame(draw);
  }, []);

  const handlePlanClick = useCallback(
    (tipo: "personal" | "pyme", e: React.MouseEvent<HTMLButtonElement>) => {
      setMenuOpen(false);
      const btn = e.currentTarget.getBoundingClientRect();
      const nav = navRef.current?.getBoundingClientRect();
      if (nav) spawnParticles(btn.left + btn.width / 2 - nav.left, btn.top + btn.height / 2 - nav.top);
      window.dispatchEvent(new CustomEvent("zprest:switch-plan", { detail: tipo }));
      document.getElementById("simulador")?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [spawnParticles],
  );

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0a1628]/95">
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0" />

      {/* ── Barra principal ─────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="brand-text flex flex-col items-start leading-none gap-0">
          <span className="font-serif font-bold tracking-widest text-[#0f1e4a] dark:text-white" style={{ fontSize: "1.75rem" }}>ZPREST</span>
          <span className="text-[12px] font-bold tracking-[0.18em] text-gray-400 dark:text-white/30 self-center transition-colors hover:text-[#D4AF37]">IS45.123</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-600 transition hover:text-azul-claro dark:text-white/80 dark:hover:text-azul-claro">
              {l.label}
            </a>
          ))}
          <button onClick={(e) => handlePlanClick("personal", e)} className="text-sm font-medium text-yellow-500 transition hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300">
            Plan Personal
          </button>
          <button onClick={(e) => handlePlanClick("pyme", e)} className="text-sm font-medium text-yellow-500 transition hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300">
            Plan Comercial
          </button>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-lift shimmer-blue rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 dark:bg-azul-claro dark:hover:bg-azul-hover">
            Ingresar
          </Link>

          {/* Hamburger — solo mobile */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/20 md:hidden"
            aria-label="Menú"
          >
            <span className={`block h-0.5 w-5 bg-gray-700 transition-transform duration-200 dark:bg-white ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-700 transition-opacity duration-200 dark:bg-white ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-gray-700 transition-transform duration-200 dark:bg-white ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Menú mobile desplegable ──────────────────────────────────────── */}
      {menuOpen && (
        <div className="relative z-10 border-t border-gray-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0a1628] md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-gray-700 transition hover:text-gray-900 dark:text-white/80 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="my-1 border-t border-gray-200 dark:border-white/10" />
            <button
              onClick={(e) => handlePlanClick("personal", e)}
              className="text-left text-sm font-semibold text-yellow-500 transition hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              Plan Personal ✦
            </button>
            <button
              onClick={(e) => handlePlanClick("pyme", e)}
              className="text-left text-sm font-semibold text-yellow-500 transition hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300"
            >
              Plan Comercial ✦
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
