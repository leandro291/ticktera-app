/** Browser-only: saves a blob as a file. The link must be in the document (Firefox) and the URL alive until the click is handled (Safari). */
export function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: filename, rel: "noopener" });
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
