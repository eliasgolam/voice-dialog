export function normalizeDateTime(input: { datum?: string; zeit?: string }, base = new Date()) {
  const lower = (input.datum || '').toLowerCase();
  const map: any = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 };
  let d = new Date(base);
  if (lower === 'morgen') d.setDate(d.getDate() + 1);
  else if (lower in map) {
    const cur = d.getDay();
    let add = map[lower] - cur;
    if (add <= 0) add += 7;
    d.setDate(d.getDate() + add);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) d = new Date(input.datum!);
  const datum = d.toISOString().slice(0, 10);
  const zeit = input.zeit && /^\d{1,2}:\d{2}$/.test(input.zeit) ? input.zeit : undefined;
  return { datum, zeit };
}



