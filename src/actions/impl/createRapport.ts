export default async function createRapport(
  params: any,
): Promise<{ ok: boolean; id: number; message: string }> {
  const id = Date.now();
  return { ok: true, id, message: `Rapport #${id} für ${params.kunde} angelegt.` };
}


