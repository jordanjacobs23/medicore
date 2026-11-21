function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrapLine(value: string, maxLength: number) {
  const normalized = value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?");
  if (!normalized) return [""];
  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (word.length > maxLength) {
      if (line) lines.push(line);
      line = "";
      for (let offset = 0; offset < word.length; offset += maxLength) {
        lines.push(word.slice(offset, offset + maxLength));
      }
      continue;
    }
    if (line && `${line} ${word}`.length > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createTextPdf(sourceLines: string[]) {
  const lines = sourceLines.flatMap((line) => wrapLine(line, 92));
  const pages: string[][] = [];
  for (let offset = 0; offset < lines.length; offset += 50) {
    pages.push(lines.slice(offset, offset + 50));
  }
  if (pages.length === 0) pages.push([]);

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const textCommands = pageLines
      .map((line) => `(${escapePdfText(line)}) Tj T*`)
      .join("\n");
    const stream = `BT\n/F1 10 Tf\n50 790 Td\n14 TL\n${textCommands}\nET`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
  });

  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(document, "ascii");
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, "ascii");
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    document += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, "ascii");
}
