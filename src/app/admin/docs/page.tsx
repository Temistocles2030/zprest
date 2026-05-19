import { readFileSync } from "fs";
import { join } from "path";
import DocsViewer from "./DocsViewer";

export const dynamic = "force-static";
export const metadata = { title: "Documentación — Zprest Admin" };

export default function DocsPage() {
  const docsDir = join(process.cwd(), "docs");
  const usuario = readFileSync(join(docsDir, "manual-usuario.md"), "utf-8");
  const desarrollo = readFileSync(join(docsDir, "manual-desarrollo.md"), "utf-8");

  return <DocsViewer usuario={usuario} desarrollo={desarrollo} />;
}
