// Rebuilds screenplay-style plain text from a PDF's positioned text items.
// unpdf's extractText flattens each page into one line, losing the layout
// (indentation) that screenplay formatting depends on. Here we group text
// items into lines by their y coordinate and convert each line's x offset
// into leading spaces, so character cues / dialogue / parentheticals keep
// their indentation in the editor.

import type { PDFDocumentProxy } from "unpdf/pdfjs";

type PositionedItem = { str: string; x: number; y: number; width: number };

const Y_TOLERANCE = 2.5; // pts — items within this vertical distance share a line
const FALLBACK_CHAR_WIDTH = 7.2; // pts — Courier 12pt advance width

export async function extractPdfScreenplay(pdf: PDFDocumentProxy): Promise<string> {
  const out: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: PositionedItem[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      items.push({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width,
      });
    }
    if (items.length === 0) continue;

    // Group items into lines by y (PDF y grows upward, so sort descending).
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: { y: number; items: PositionedItem[] }[] = [];
    for (const it of items) {
      const line = lines[lines.length - 1];
      if (line && Math.abs(line.y - it.y) <= Y_TOLERANCE) {
        line.items.push(it);
      } else {
        lines.push({ y: it.y, items: [it] });
      }
    }

    // Estimate the character advance width from the items themselves
    // (median of width-per-character), so indentation survives PDFs that
    // aren't exactly Courier 12.
    const perChar = items
      .filter((it) => it.str.length >= 3 && it.width > 0)
      .map((it) => it.width / it.str.length)
      .sort((a, b) => a - b);
    const charWidth = perChar.length
      ? perChar[Math.floor(perChar.length / 2)]
      : FALLBACK_CHAR_WIDTH;

    // The leftmost line start on the page is the action margin (indent 0).
    const marginX = Math.min(...lines.map((l) => l.items[0].x));

    // Single-line spacing = the smallest vertical gap between consecutive
    // lines (larger gaps are intentional blank lines between blocks).
    const gaps = lines
      .slice(1)
      .map((l, i) => lines[i].y - l.y)
      .filter((g) => g > 4);
    const lineHeight = gaps.length ? Math.min(...gaps) : 12;

    let prevY: number | null = null;
    for (const line of lines) {
      if (prevY !== null && lineHeight > 0) {
        const skipped = Math.round((prevY - line.y) / lineHeight) - 1;
        for (let i = 0; i < Math.min(skipped, 2); i++) out.push("");
      }
      prevY = line.y;

      line.items.sort((a, b) => a.x - b.x);
      const indent = Math.max(0, Math.round((line.items[0].x - marginX) / charWidth));

      let text = "";
      let cursor = line.items[0].x;
      for (const it of line.items) {
        const gapChars = Math.round((it.x - cursor) / charWidth);
        if (text && gapChars > 0) text += " ".repeat(Math.min(gapChars, 20));
        text += it.str;
        cursor = it.x + it.width;
      }

      out.push(" ".repeat(Math.min(indent, 40)) + text.trimEnd());
    }

    out.push(""); // page break → blank line
  }

  // Collapse runs of 3+ blank lines left by page furniture.
  return out
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
