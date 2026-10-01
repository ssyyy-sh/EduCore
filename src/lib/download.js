/** Trigger a browser download of text content. Returns false if the browser blocked it. */
export function downloadText(filename, text, type = 'text/plain') {
  try {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** rows: array of arrays (first row = header). UTF-8 BOM keeps Cyrillic readable in Excel. */
export function downloadCSV(filename, rows) {
  const text = '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
  return downloadText(filename, text, 'text/csv');
}

const pad = (n) => String(n).padStart(2, '0');
const icsDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const icsText = (s) => String(s).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

/** events: [{ title, start: Date, end: Date, location, description }] */
export function downloadICS(filename, events) {
  const now = icsDate(new Date());
  const body = events
    .map(
      (e, i) =>
        [
          'BEGIN:VEVENT',
          `UID:edufy-${i}-${e.start.getTime()}@edufy`,
          `DTSTAMP:${now}`,
          `DTSTART:${icsDate(e.start)}`,
          `DTEND:${icsDate(e.end)}`,
          `SUMMARY:${icsText(e.title)}`,
          e.location ? `LOCATION:${icsText(e.location)}` : null,
          e.description ? `DESCRIPTION:${icsText(e.description)}` : null,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n')
    )
    .join('\r\n');
  const text = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EduFY//Schedule//EN', 'CALSCALE:GREGORIAN', body, 'END:VCALENDAR'].join('\r\n');
  return downloadText(filename, text, 'text/calendar');
}
