import createRapport from './impl/createRapport';
import createCustomer from './impl/createCustomer';
import addMaterial from './impl/addMaterial';
import setAppointment from './impl/setAppointment';
import createProject from './impl/createProject';
import { z } from 'zod';

const ZCreateRapport   = z.object({ kunde: z.string().min(1), datum: z.string().optional(), zeit: z.string().optional(), beschreibung: z.string().optional() });
const ZCreateCustomer  = z.object({ firstName:z.string().min(1), lastName:z.string().min(1), telefon:z.string().optional(), adresse:z.string().optional() });
const ZAddMaterial     = z.object({ kunde:z.string().min(1), artikel:z.string().min(1), menge:z.number(), einheit:z.string().optional(), preis:z.number().optional() });
const ZSetAppointment  = z.object({ kunde:z.string().min(1), datum:z.string().min(4), zeit:z.string().min(3), ort:z.string().optional(), zweck:z.string().optional() });
const ZCreateProject   = z.object({ kunde:z.string().min(1), projekt:z.string().min(1), start:z.string().optional(), beschreibung:z.string().optional() });

const validators: Record<string,(p:any)=>any> = {
  CREATE_RAPPORT: ZCreateRapport.parse,
  CREATE_CUSTOMER: ZCreateCustomer.parse,
  ADD_MATERIAL: ZAddMaterial.parse,
  SET_APPOINTMENT: ZSetAppointment.parse,
  CREATE_PROJECT: ZCreateProject.parse,
};

const schemas: Record<string, z.ZodObject<any>> = {
  CREATE_RAPPORT: ZCreateRapport,
  CREATE_CUSTOMER: ZCreateCustomer,
  ADD_MATERIAL: ZAddMaterial,
  SET_APPOINTMENT: ZSetAppointment,
  CREATE_PROJECT: ZCreateProject,
};

export const ActionRegistry = {
  validate(name: string, params: any): { ok: boolean; missing: string[]; details?: string } {
    const schema = schemas[name];
    if (!schema) return { ok: true, missing: [] };
    const sp = schema.safeParse(params || {});
    if (sp.success) return { ok: true, missing: [] };
    const missingSet = new Set<string>();
    try {
      for (const issue of sp.error.issues || []) {
        const pathKey = String(issue.path?.[0] ?? '');
        if (!pathKey) continue;
        if (issue.code === 'invalid_type' || issue.code === 'too_small' || issue.code === 'custom') {
          missingSet.add(pathKey);
        }
      }
    } catch {}
    return { ok: false, missing: Array.from(missingSet), details: sp.error.message };
  },
  async execute(name: string, params: any) {
    const validate = validators[name];
    if (validate) {
      try {
        params = validate(params);
      } catch (e: any) {
        return { ok: false, error: 'validation', details: e?.message };
      }
    }
    const map: Record<string, (p: any) => Promise<any>> = {
      CREATE_RAPPORT: createRapport,
      CREATE_CUSTOMER: createCustomer,
      ADD_MATERIAL: addMaterial,
      SET_APPOINTMENT: setAppointment,
      CREATE_PROJECT: createProject,
    };
    const fn = map[name];
    if (!fn) return { ok: false, error: `Unknown action ${name}` };
    return fn(params);
  },
};


