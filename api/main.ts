import createServer from '../server.ts';
import fs from 'fs';
import path from 'path';

let cachedApp: any;

export default async function handler(req: any, res: any) {
  console.log(`[Vercel] Received ${req.method} request for: ${req.url}`);
  
  // Debugging filesystem on Vercel
  try {
    const rootDir = process.cwd();
    console.log(`[Vercel] Current working directory: ${rootDir}`);
    console.log(`[Vercel] Files in root: ${fs.readdirSync(rootDir).join(', ')}`);
    const apiDir = path.join(rootDir, 'api');
    if (fs.existsSync(apiDir)) {
      console.log(`[Vercel] Files in /api: ${fs.readdirSync(apiDir).join(', ')}`);
    }
  } catch (debugErr) {
    console.log(`[Vercel] Debug filesystem failed: ${debugErr}`);
  }

  try {
    if (!cachedApp) {
      console.log("[Vercel] Initializing Express server instance...");
      cachedApp = await createServer();
      console.log("[Vercel] Express server initialized successfully.");
    }
    
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("[Vercel] Critical initialization failure:", err);
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
