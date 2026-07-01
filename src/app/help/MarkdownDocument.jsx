import React from "react";

function markdownBlocks(source) {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language, text: code.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    // history.md predates the viewer and uses "*V. x" as its version heading format.
    if (/^\*V\.\s*/i.test(line)) {
      blocks.push({ type: "heading", level: 2, text: line.slice(1) });
      index += 1;
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const type = ordered ? "orderedList" : "list";
      const items = [];
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(pattern);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type, items });
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim()) {
      if (/^(#{1,6})\s+/.test(lines[index]) || /^\*V\.\s*/i.test(lines[index]) || /^\s*[-*]\s+/.test(lines[index]) || /^\s*\d+\.\s+/.test(lines[index]) || lines[index].startsWith("```")) break;
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function MarkdownDocument({ source }) {
  const blocks = markdownBlocks(source);
  return (
    <div className="help-markdown">
      {blocks.map((block, index) => {
        const key = `${block.type}:${index}`;
        if (block.type === "heading") {
          const Heading = `h${block.level}`;
          return <Heading key={key}>{block.text}</Heading>;
        }
        if (block.type === "code") return <pre key={key}><code className={block.language ? `language-${block.language}` : undefined}>{block.text}</code></pre>;
        if (block.type === "list") return <ul key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}:${item}`}>{item}</li>)}</ul>;
        if (block.type === "orderedList") return <ol key={key}>{block.items.map((item, itemIndex) => <li key={`${itemIndex}:${item}`}>{item}</li>)}</ol>;
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}
