import { z } from 'zod';

const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'firstName ist erforderlich'),
  lastName: z.string().min(1, 'lastName ist erforderlich'),
});

export type CreateCustomerArgs = z.infer<typeof createCustomerSchema>;

export async function CREATE_CUSTOMER(args: unknown): Promise<{ ok: boolean; message: string }>{
  const { firstName, lastName } = createCustomerSchema.parse(args);
  return {
    ok: true,
    message: `Kundendossier für ${firstName} ${lastName} angelegt.`,
  };
}



