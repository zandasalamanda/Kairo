"use client";

import * as React from "react";

// Renders a Mermaid diagram from AI-authored ```mermaid blocks. Mermaid is heavy,
// so it's dynamically imported (kept out of the main bundle) and only loaded the
// first time a diagram actually appears. securityLevel "strict" sanitizes the
// output, so the model-generated diagram source can't inject scripts/links.
let mermaidP: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (!mermaidP) {
    mermaidP = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: "dark",
        themeVariables: {
          background: "transparent",
          primaryColor: "#1a1d24",
          primaryTextColor: "#e8eaed",
          primaryBorderColor: "#e6b877",
          lineColor: "#7c828e",
          secondaryColor: "#20242c",
          tertiaryColor: "#15181e",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          fontSize: "13px",
        },
      });
      return m.default;
    });
  }
  return mermaidP;
}

export function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const id = "mmd" + React.useId().replace(/[^a-zA-Z0-9]/g, "");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        const { svg } = await mermaid.render(id, code.trim());
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (failed) {
    // Invalid diagram source — fall back to showing it as a code block.
    return (
      <pre className="overflow-x-auto rounded-lg border border-line bg-white/[0.04] p-3">
        <code className="whitespace-pre font-mono text-[0.85em] text-muted">{code}</code>
      </pre>
    );
  }
  if (!svg) {
    return <div className="rounded-lg border border-line bg-white/[0.03] p-4 text-center font-mono text-[11px] uppercase tracking-wide text-faint">Rendering diagram…</div>;
  }
  return (
    <div
      className="my-1 overflow-x-auto rounded-lg border border-line bg-white/[0.03] p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      // Mermaid output is sanitized (securityLevel: strict).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
