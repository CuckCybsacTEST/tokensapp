const Culqi = require('culqi-node');

let culqiInstance: any = null;

function getCulqiInstance() {
  if (!culqiInstance) {
    if (!process.env.CULQI_SECRET_KEY || !process.env.CULQI_PUBLIC_KEY) {
      throw new Error('CULQI_SECRET_KEY and CULQI_PUBLIC_KEY environment variables are required');
    }

    culqiInstance = new Culqi({
      privateKey: process.env.CULQI_SECRET_KEY,
      pciCompliant: true,
      publicKey: process.env.CULQI_PUBLIC_KEY,
    });
  }
  return culqiInstance;
}

export default getCulqiInstance;