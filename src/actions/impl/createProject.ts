export default async function createProject(params: any): Promise<{ ok: boolean; id: number; message: string }>{
  const id = Date.now();
  const kunde = params?.kunde ?? 'Kunde';
  const projekt = params?.projekt ?? 'Projekt';
  return { ok: true, id, message: `Projekt #${id} "${projekt}" für ${kunde} angelegt.` };
}



