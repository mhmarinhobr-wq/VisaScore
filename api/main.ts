import createServer from '../server';

let cachedApp: any;

export default async function handler(req: any, res: any) {
  console.log(`[Vercel Navigator] Received ${req.method} request for: ${req.url}`);
  
  try {
    if (!cachedApp) {
      console.log("[Vercel Navigator] Initializing Express server instance...");
      cachedApp = await createServer();
      console.log("[Vercel Navigator] Express server initialized successfully.");
    }
    
    // Express apps are actually functions (req, res, next) => void
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("[Vercel Navigator] Critical initialization failure:", err);
    res.status(500).json({ 
      error: "Erro crítico de inicialização no Vercel", 
      message: err.message,
      stack: err.stack,
      env: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      }
    });
  }
}
