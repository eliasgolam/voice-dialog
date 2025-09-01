export default async function createCustomer(
  params: any,
): Promise<{ ok: boolean; id: number; message: string }> {
  const id = Date.now();
  const name = `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim();
  return { ok: true, id, message: `Kundendossier für ${name} angelegt.` };
}


