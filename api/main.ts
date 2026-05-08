import * as fs from 'node:fs';
import * as path from 'node:path';

let cachedApp: any;

export default async function handler(req: any, res: any) {
  console.log(`[Vercel] Received ${req.method} request for: ${req.url}`);
  
  try {
    if (!cachedApp) {
      console.log("[Vercel] Initializing Express server instance...");
      // Using try-catch with dynamic import to identify which module fails
      try {
        const serverModule = await import('../server.js');
        const createServer = serverModule.default;
        cachedApp = await createServer();
        console.log("[Vercel] Express server initialized successfully.");
      } catch (importErr: any) {
        console.error("[Vercel] MODULE IMPORT FAILED:", importErr.code, importErr.message);
        throw importErr;
      }
    }
    
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("[Vercel] Critical initialization failure:", err);
    res.status(500).json({ 
      error: "Erro crítico de inicialização no Vercel", 
      message: err.message,
      stack: err.stack,
      debug: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        serviceAccountLength: (process.env.FIREBASE_SERVICE_ACCOUNT || "").length,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        cwd: process.cwd(),
        firebaseInitError: (global as any).firebaseInitError
      }
    });
  }
}
