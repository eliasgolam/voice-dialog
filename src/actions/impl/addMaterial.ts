export default async function addMaterial(
  params: any,
): Promise<{ ok: boolean; id: number; message: string }> {
  const id = Date.now();
  return { ok: true, id, message: `Material „${params.artikel}“ (${params.menge}) für ${params.kunde} erfasst.` };
}


