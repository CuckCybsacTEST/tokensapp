import Culqi from 'culqi-node';

let culqiInstance: InstanceType<typeof Culqi> | null = null;

export default function culqi(): InstanceType<typeof Culqi> {
  if (!culqiInstance) {
    const secretKey = process.env.CULQI_SECRET_KEY;

    if (!secretKey) {
      throw new Error('CULQI_SECRET_KEY no está configurada');
    }

    culqiInstance = new Culqi({
      privateKey: secretKey,
    });
  }

  return culqiInstance;
}

// Tipos para compatibilidad
export interface CulqiCharge {
  id: string;
  amount: number;
  currency_code: string;
  email: string;
  source_id: string;
  outcome?: {
    type: string;
    code: string;
  };
  creation_date: number;
  state: string;
}
