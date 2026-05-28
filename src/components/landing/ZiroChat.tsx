"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDeuda } from "@/hooks/useDeuda";
import { formatearPesos } from "@/lib/loan-calculator";

type Mode = "vendedor" | "asesor";
type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  mode?: Mode;
}

const BIENVENIDA: Record<Mode, string> = {
  vendedor:
    "¡Hola! Soy Ziro, tu asistente de Zprest 👋 ¿Necesitás un crédito personal o comercial? Contame y te ayudo a encontrar la mejor opción.",
  asesor:
    "¡Hola! Soy Ziro 👋 Estoy acá para ayudarte con tu cuenta, cuotas y préstamos. ¿En qué puedo ayudarte hoy?",
};

function buildLoanContext(
  prestamos: ReturnType<typeof useDeuda>["prestamos"],
  cuotas: ReturnType<typeof useDeuda>["cuotas"],
  proximoVencimiento: ReturnType<typeof useDeuda>["proximoVencimiento"],
  saldoRemanente: number
): string | null {
  if (!prestamos.length) return null;
  const lines: string[] = [];
  lines.push(`Saldo total adeudado: ${formatearPesos(saldoRemanente)}`);
  prestamos.forEach((p, i) => {
    const cuotasPrestamo = cuotas.filter((c) => c.prestamo_id === p.id);
    const pagadas = cuotasPrestamo.filter((c) => c.estado === "pagada").length;
    lines.push(
      `Préstamo ${i + 1}: capital original ${formatearPesos(p.capital_original)}, ` +
        `saldo restante ${formatearPesos(p.saldo_remanente)}, ` +
        `cuotas ${pagadas}/${cuotasPrestamo.length} pagadas`
    );
  });
  if (proximoVencimiento) {
    const fecha = new Date(proximoVencimiento.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-AR");
    lines.push(`Próximo vencimiento: ${formatearPesos(proximoVencimiento.monto)} el ${fecha}`);
  }
  return lines.join("\n");
}

export default function ZiroChat({ mode = "vendedor" }: Props) {
  const { usuario } = useAuth();
  const deuda = useDeuda();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bienvenida =
    mode === "asesor" && usuario?.nombre
      ? `¡Hola, ${usuario.nombre.split(" ")[0]}! Soy Ziro 👋 Estoy acá para ayudarte con tu cuenta, cuotas y préstamos. ¿En qué puedo ayudarte hoy?`
      : BIENVENIDA[mode];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    },
    [pos]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) =>
      setPos({
        x: dragStart.current.px + e.clientX - dragStart.current.mx,
        y: dragStart.current.py + e.clientY - dragStart.current.my,
      });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Build loan context for asesor mode
    const loanContext =
      mode === "asesor"
        ? buildLoanContext(
            deuda.prestamos,
            deuda.cuotas,
            deuda.proximoVencimiento,
            deuda.saldoRemanente
          )
        : null;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          mode,
          userName: usuario?.nombre ?? null,
          loanContext,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      // Stream response
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // Add empty assistant message to fill progressively
      setMessages([...history, { role: "assistant", content: "" }]);
      setLoading(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: fullText }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessages([
        ...history,
        {
          role: "assistant",
          content: `Error: ${msg}. Por favor intentá de nuevo.`,
        },
      ]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Ventana del chat */}
      {open && (
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            cursor: dragging ? "grabbing" : "default",
          }}
          className="fixed bottom-24 right-4 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-white/10 bg-[#0d1f3c] shadow-2xl"
        >
          {/* Header arrastrable */}
          <div
            onMouseDown={onMouseDown}
            className="flex items-center gap-3 rounded-t-2xl border-b border-white/10 bg-[#0a1628] px-4 py-3 select-none"
            style={{ cursor: dragging ? "grabbing" : "grab" }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-base font-bold text-white shadow">
              Z
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Ziro</p>
              <p className="text-[11px] text-gray-400">
                {mode === "asesor" ? "Asesor administrativo" : "Asesor de créditos"}
              </p>
            </div>
            <span className="mr-1 h-2 w-2 rounded-full bg-green-400" />
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4 h-72">
            {/* Bienvenida */}
            <div className="flex justify-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white">
                Z
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2 text-sm text-gray-100 leading-relaxed">
                {bienvenida}
              </div>
            </div>

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start gap-2"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white">
                    Z
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "rounded-tr-sm bg-blue-600 text-white"
                      : "rounded-tl-sm bg-white/10 text-gray-100"
                  }`}
                >
                  {m.content || <span className="opacity-50">...</span>}
                </div>
              </div>
            ))}

            {/* Typing indicator — only while waiting for first chunk */}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold text-white">
                  Z
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu consulta..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
          <p className="pb-2 text-center text-[10px] text-gray-600">
            Ziro · IA puede cometer errores · Zprest
          </p>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-blue-900/50 transition hover:scale-110 active:scale-95"
        aria-label="Abrir chat Ziro"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        )}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-cyan-400" />
          </span>
        )}
      </button>
    </>
  );
}
