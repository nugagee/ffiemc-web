/** Export rows to CSV and trigger download (audit / reports). */
export function exportToCsv(filename, rows, columns) {
  if (!rows?.length) return;
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escape(typeof c.value === "function" ? c.value(row) : row[c.key])).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterRows(rows, query, keys) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((key) => {
      const val = row[key];
      if (val == null) return false;
      if (typeof val === "object") return JSON.stringify(val).toLowerCase().includes(q);
      return String(val).toLowerCase().includes(q);
    })
  );
}
