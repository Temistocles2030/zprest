"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface Props {
  usuario: string;
  desarrollo: string;
}

export default function DocsViewer({ usuario, desarrollo }: Props) {
  const [tab, setTab] = useState<"usuario" | "desarrollo">("usuario");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Documentación</h1>
        <p className="mt-1 text-sm text-gray-400">Manual de usuario y referencia de desarrollo de Zprest</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        <button
          onClick={() => setTab("usuario")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "usuario"
              ? "border-blue-400 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          📖 Manual de Usuario
        </button>
        <button
          onClick={() => setTab("desarrollo")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "desarrollo"
              ? "border-blue-400 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          ⚙️ Manual de Desarrollo
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl bg-gray-800 p-6 md:p-8">
        <div className="prose prose-invert prose-sm md:prose-base max-w-none
          prose-headings:text-white
          prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h1:mb-6
          prose-h2:text-xl prose-h2:font-semibold prose-h2:text-blue-300 prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-base prose-h3:font-semibold prose-h3:text-gray-200 prose-h3:mt-6 prose-h3:mb-3
          prose-h4:text-sm prose-h4:font-semibold prose-h4:text-gray-300
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white
          prose-code:text-green-300 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:text-sm
          prose-table:text-sm prose-table:border-collapse
          prose-th:bg-gray-700 prose-th:text-white prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium
          prose-td:text-gray-300 prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-white/10
          prose-li:text-gray-300 prose-li:marker:text-blue-400
          prose-blockquote:border-blue-500 prose-blockquote:bg-blue-950/30 prose-blockquote:rounded-r-lg prose-blockquote:text-gray-300
          prose-hr:border-white/10
        ">
          <ReactMarkdown>
            {tab === "usuario" ? usuario : desarrollo}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
