export default async function setAppointment(
  params: any,
): Promise<{ ok: boolean; id: number; message: string }> {
  const id = Date.now();
  return { ok: true, id, message: `Termin ${params.kunde} am ${params.datum} ${params.zeit}${params.ort ? ' @ ' + params.ort : ''}.` };
}


