import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { z } from "zod";

import type { Tool, ToolExecutionContext, ToolResult } from "@/server/tools/types";

const reportSchema = z.object({
  executiveSummary: z.string().max(12_000).optional(),
  sections: z.array(z.object({ heading: z.string().min(1).max(300), body: z.string().min(1).max(60_000) })).max(20).default([]),
  tables: z.array(z.object({ title: z.string().min(1).max(300), headers: z.array(z.string().min(1)).min(1).max(8), rows: z.array(z.array(z.string().max(2_000))).max(100) })).max(10).default([]),
  charts: z.array(z.object({ title: z.string().min(1).max(300), series: z.array(z.object({ label: z.string().min(1).max(100), value: z.number().finite().nonnegative() })).min(1).max(20) })).max(5).default([]),
});

const inputSchema = z.object({
  format: z.enum(["markdown", "pdf", "docx", "csv", "json"]),
  filename: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,120}$/),
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(500_000),
  report: reportSchema.optional(),
});

const mimeByFormat = { markdown: "text/markdown", pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", csv: "text/csv", json: "application/json" } as const;
type Report = z.infer<typeof reportSchema>;

export class DocumentTool implements Tool {
  readonly id = "document";
  readonly description = "Generates polished Markdown, PDF, DOCX, CSV, and JSON deliverables with executive summaries, tables, and data charts.";
  readonly inputSchema = inputSchema;

  async execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult> {
    const request = inputSchema.parse(input);
    const extension = request.format === "markdown" ? "md" : request.format;
    const filename = request.filename.endsWith(`.${extension}`) ? request.filename : `${request.filename}.${extension}`;
    const filePath = path.join(context.artifactRoot, filename);
    if (process.env.NODE_ENV !== "production") console.info("[ArtifactTrace] document tool input", { missionId: context.missionId, filePath, format: request.format, contentLength: request.content.length });
    await mkdir(context.artifactRoot, { recursive: true });
    if (request.format === "pdf") await writeFile(filePath, this.createPdfBuffer(request.title ?? filename, request.content, request.report));
    else if (request.format === "docx") await this.writeDocx(filePath, request.title ?? filename, request.content, request.report);
    else await writeFile(filePath, request.content, "utf8");
    if (process.env.NODE_ENV !== "production") console.info("[ArtifactTrace] document file written", { missionId: context.missionId, filePath });
    return { summary: `Generated ${filename}`, data: { format: request.format, path: filePath, sections: request.report?.sections.length ?? 0, tables: request.report?.tables.length ?? 0, charts: request.report?.charts.length ?? 0 }, artifacts: [{ name: filename, kind: "file", path: filePath, mimeType: mimeByFormat[request.format] }] };
  }

  private createPdfBuffer(title: string, content: string, report?: Report): Buffer {
    const lines: Array<{ text: string; size: number; bold?: boolean }> = [{ text: title, size: 20, bold: true }, { text: "Prepared by AfterYou", size: 9 }];
    const addBody = (value: string, size = 10): void => value.split("\n").forEach((line) => lines.push({ text: line.startsWith("- ") ? `• ${line.slice(2)}` : line, size }));
    if (report?.executiveSummary) { lines.push({ text: "Executive summary", size: 14, bold: true }); addBody(report.executiveSummary); }
    addBody(content);
    for (const section of report?.sections ?? []) { lines.push({ text: section.heading, size: 14, bold: true }); addBody(section.body); }
    for (const table of report?.tables ?? []) { lines.push({ text: table.title, size: 13, bold: true }); lines.push({ text: table.headers.join("  |  "), size: 9, bold: true }); table.rows.forEach((row) => lines.push({ text: row.join("  |  "), size: 9 })); }
    for (const chart of report?.charts ?? []) { lines.push({ text: chart.title, size: 13, bold: true }); chart.series.forEach((point) => lines.push({ text: `${point.label}: ${point.value}`, size: 9 })); }
    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += 42) pages.push(lines.slice(index, index + 42).map((line) => `BT /F1 ${line.size} Tf 54 ${770 - ((index % 42) + (lines.slice(index, index + 42).indexOf(line))) * 17} Td (${this.pdfEscape(line.text)}) Tj ET`));
    const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [" + pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ") + `] /Count ${pages.length} >>`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
    for (const page of pages) { const stream = page.join("\n"); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objects.length + 2} 0 R >>`); objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`); }
    let pdf = "%PDF-1.4\n"; const offsets: number[] = [0];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(pdf, "binary");
  }

  private pdfEscape(value: string): string { return value.replace(/[\\()\r\n]/g, (character) => character === "\\" ? "\\\\" : character === "(" ? "\\(" : character === ")" ? "\\)" : " "); }

  private async writeDocx(filePath: string, title: string, content: string, report?: Report): Promise<void> {
    const children: Array<Paragraph | Table> = [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] })];
    if (report?.executiveSummary) children.push(new Paragraph({ children: [new TextRun({ text: "Executive summary", bold: true, size: 24 })] }), new Paragraph(report.executiveSummary));
    children.push(...content.split(/\n{2,}/).filter(Boolean).map((paragraph) => new Paragraph(paragraph)));
    for (const section of report?.sections ?? []) children.push(new Paragraph({ children: [new TextRun({ text: section.heading, bold: true, size: 24 })] }), new Paragraph(section.body));
    for (const table of report?.tables ?? []) children.push(new Paragraph({ children: [new TextRun({ text: table.title, bold: true })] }), new Table({ rows: [new TableRow({ children: table.headers.map((header) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })] })) }), ...table.rows.map((row) => new TableRow({ children: table.headers.map((_, index) => new TableCell({ children: [new Paragraph(row[index] ?? "")] })) }))] }));
    const document = new Document({ sections: [{ children }] });
    await writeFile(filePath, await Packer.toBuffer(document));
  }
}
