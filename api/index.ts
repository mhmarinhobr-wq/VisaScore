import createServer from '../server';

let cachedApp;

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      cachedApp = await createServer();
    }
    
    // Express apps are actually functions (req, res, next) => void
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("Vercel logic failure:", err);
    res.status(500).json({ 
      error: "Erro crítico no servidor Vercel", 
      message: err.message,
      env: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
}
