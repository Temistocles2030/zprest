const BASE_URL = "https://api.cloudconvert.com/v2";

/**
 * Convierte un .docx en base64 a un PDF en base64 usando CloudConvert API v2.
 * Requiere CLOUDCONVERT_API_KEY en las variables de entorno.
 */
export async function docxToPdf(docxBase64: string): Promise<string> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) throw new Error("CLOUDCONVERT_API_KEY no configurada");

  // 1. Crear job de conversión
  const jobRes = await fetch(`${BASE_URL}/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tasks: {
        "import-docx": {
          operation: "import/base64",
          file: docxBase64,
          filename: "contrato.docx",
        },
        "convert-to-pdf": {
          operation: "convert",
          input: "import-docx",
          output_format: "pdf",
        },
        "export-pdf": {
          operation: "export/url",
          input: "convert-to-pdf",
        },
      },
    }),
  });

  if (!jobRes.ok) {
    const err = await jobRes.text();
    throw new Error(`CloudConvert error ${jobRes.status}: ${err}`);
  }

  const job = await jobRes.json();
  const jobId = job.data.id;

  // 2. Polling hasta que el job termine (max 30 intentos × 1s)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const statusRes = await fetch(`${BASE_URL}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const status = await statusRes.json();

    if (status.data.status === "finished") {
      const exportTask = status.data.tasks.find(
        (t: { name: string }) => t.name === "export-pdf"
      );
      const downloadUrl = (exportTask as any)?.result?.files?.[0]?.url;

      if (!downloadUrl) throw new Error("CloudConvert: sin URL de descarga");

      // 3. Descargar el PDF y devolver como base64
      const pdfRes = await fetch(downloadUrl);
      if (!pdfRes.ok) throw new Error("CloudConvert: error descargando PDF");

      const buffer = await pdfRes.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    }

    if (status.data.status === "error") {
      throw new Error("CloudConvert: error en la conversión del documento");
    }
  }

  throw new Error("CloudConvert: timeout esperando conversión (30s)");
}
