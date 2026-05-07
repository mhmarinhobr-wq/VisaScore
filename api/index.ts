import createServer from '../server.ts';

let cachedApp;

export default async function handler(req, res) {
  console.log(`Vercel Handler: ${req.method} ${req.url}`);
  try {
    if (!cachedApp) {
      console.log("Initializing server for first time in this worker...");
      cachedApp = await createServer();
      console.log("Server initialized successfully");
    }
    return cachedApp(req, res);
  } catch (err: any) {
    console.error("CRITICAL Vercel handler crash:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
}
