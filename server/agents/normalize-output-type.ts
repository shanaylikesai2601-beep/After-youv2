const outputTypeAliases: Record<string, string> = {
  citations: "research",
  citation: "research",
  sources: "research",
  references: "research",
  bibliography: "research",
  synthesis: "summary",
  researchreport: "research",
  "research report": "research",
  "research summary": "research",
  analysis: "research",
  investigation: "research",
  findings: "research",
  report: "document",
  "document report": "document",
  "markdown report": "markdown",
  summaryreport: "summary",
  "summary report": "summary",
  writeup: "markdown",
  article: "markdown",
  essay: "markdown",
  notes: "markdown",
  "draft report review and refinement": "document",
  "preliminary list": "research",
  "startup list": "research",
  "browser results": "research",
  "pdf generation": "document",
  md: "markdown",
  text: "markdown",
  presentation: "slides",
  deck: "slides",
  powerpoint: "slides",
  pdf: "document",
  doc: "document",
  url: "link",
  website: "link",
  webpage: "link",
  overview: "summary",
  "executive summary": "summary",
  recap: "summary",
  attachment: "file",
  download: "file",
  archive: "file",
  source: "link",
  imagefile: "image",
  "image file": "image",
  sourcecode: "code",
  "source code": "code",
  json: "document",
};

/** Normalizes provider-specific result labels without changing the strict result schema. */
export function normalizeOutputType(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const canonical = value.toLowerCase().trim().replace(/[\-_]+/g, " ").replace(/\s+/g, " ");
  const lookupKey = canonical.replace(/ /g, " ");
  const semantic = classifyOutputType(lookupKey);
  if (semantic) return semantic;
  if (outputTypeAliases[lookupKey]) return outputTypeAliases[lookupKey];
  const singularKey = lookupKey.endsWith("s") ? lookupKey.slice(0, -1) : lookupKey;
  if (outputTypeAliases[singularKey]) return outputTypeAliases[singularKey];
  if (lookupKey === "json" || lookupKey.includes("json array") || lookupKey.includes("json object")) return "research";
  if (/(^| )research( |$)/.test(lookupKey)) return "research";
  if (/(^| )(document|report|pdf)( |$)/.test(lookupKey)) return "document";
  if (/(^| )(markdown|md)( |$)/.test(lookupKey)) return "markdown";
  if (/(^| )(slide|slides|presentation|deck)( |$)/.test(lookupKey)) return "slides";
  if (/(^| )(image|photo|picture)( |$)/.test(lookupKey)) return "image";
  if (/(^| )(code|source)( |$)/.test(lookupKey)) return "code";
  if (/(^| )(url|website|webpage|link)( |$)/.test(lookupKey)) return "link";
  return value;
}

function classifyOutputType(value: string): string | undefined {
  if (value.includes("synthes")) return "research";
  if (value.includes("research") || value.includes("citation") || value.includes("reference") || value.includes("source") || value.includes("finding") || value.includes("analysis")) return "research";
  if (value.includes("executive") && value.includes("summary")) return "summary";
  if (value.includes("summary")) return "summary";
  if (value.includes("markdown")) return "markdown";
  if (value.includes("slide") || value.includes("deck")) return "slides";
  if (value.includes("image")) return "image";
  if (value.includes("document") || value.includes("pdf") || value.includes("report")) return "document";
  if (value.includes("link") || value.includes("url")) return "link";
  if (value.includes("file")) return "file";
  return undefined;
}

export function normalizeAgentResultOutput(raw: unknown): unknown {
  if (raw === null) {
    return {
      summary: "The agent returned no structured result.",
      content: "No structured result was returned by the provider; downstream review should treat this as incomplete evidence.",
      outputType: "summary",
      artifacts: [],
      citations: [],
      metadata: { normalizationWarning: "provider returned null" },
    };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return raw;
  const record = raw as Record<string, unknown>;
  const original = record.outputType;
  const normalized = normalizeOutputType(original);
  const summary = typeof record.summary === "string" && record.summary.trim() ? record.summary.trim() : "Agent result";
  const content = typeof record.content === "string" && record.content.trim() ? record.content.trim() : summary;
  const citations = Array.isArray(record.citations)
    ? record.citations.map((citation) => {
      if (!citation || typeof citation !== "object" || Array.isArray(citation)) return null;
      const item = citation as Record<string, unknown>;
      const url = typeof item.url === "string" ? item.url.trim() : "";
      if (!/^https?:\/\/[^\s]+$/i.test(url)) return null;
      const title = typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Source";
      const claim = typeof item.claim === "string" && item.claim.trim() ? item.claim.trim() : "Observed source material.";
      const confidence = typeof item.confidence === "number" && Number.isFinite(item.confidence)
        ? Math.max(0, Math.min(1, item.confidence))
        : 0.5;
      return { title, url, claim, confidence };
    }).filter((item): item is { title: string; url: string; claim: string; confidence: number } => Boolean(item))
    : [];
  const artifacts = Array.isArray(record.artifacts)
    ? record.artifacts.map((artifact) => {
      if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return null;
      const item = artifact as Record<string, unknown>;
      const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Generated artifact";
      const kind = item.kind === "file" || item.kind === "link" || item.kind === "generated" ? item.kind : "generated";
      const url = typeof item.url === "string" && /^https?:\/\/[^\s]+$/i.test(item.url.trim()) ? item.url.trim() : undefined;
      return { name, kind, ...(url ? { url } : {}), ...(typeof item.mimeType === "string" ? { mimeType: item.mimeType } : {}) };
    }).filter((item): item is { name: string; kind: "file" | "link" | "generated"; url?: string; mimeType?: string } => Boolean(item))
    : [];
  if (process.env.NODE_ENV !== "production" && original !== normalized) {
    console.info("[AgentResult] Output type normalized", { original, normalized });
  }
  return {
    ...record,
    summary,
    content,
    outputType: typeof normalized === "string" && normalized.trim().length > 0 ? normalized : "summary",
    artifacts,
    citations,
    metadata: typeof record.metadata === "object" && record.metadata !== null && !Array.isArray(record.metadata)
      ? record.metadata
      : {},
  };
}

export function determineAgentOutputType(agentId: string, task: { title: string; instructions: string; expectedOutput: string }, goal: string): "document" | "markdown" | "code" | "slides" | "image" | "summary" | "research" | "link" | "file" {
  if (agentId === "research") return "research";
  if (agentId === "coding") return "code";
  const text = `${task.title} ${task.instructions} ${task.expectedOutput} ${goal}`.toLowerCase();
  if (/slide|presentation|deck|powerpoint/.test(text)) return "slides";
  if (/pdf|docx|document|report/.test(text)) return "document";
  if (/markdown|\.md\b/.test(text)) return "markdown";
  if (/image|png|jpg|jpeg/.test(text)) return "image";
  if (/url|website|link/.test(text)) return "link";
  return "summary";
}
