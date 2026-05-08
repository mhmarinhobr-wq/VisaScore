import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let databaseId: string | undefined = process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID;

// Normalizing databaseId for default one
if (databaseId === "(default)") {
  databaseId = undefined;
}

// Helper to read config safely
const getFirebaseConfig = () => {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
  } catch (e) {
    console.warn("[Firebase Admin] Could not read config file:", e);
  }
  return null;
};

const firebaseConfig = getFirebaseConfig();

// Use config for databaseId if not in env
if (!databaseId && firebaseConfig && firebaseConfig.firestoreDatabaseId) {
  databaseId = firebaseConfig.firestoreDatabaseId;
}

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) return;

  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountVar) {
    try {
      const trimmedValue = serviceAccountVar.trim();
      let serviceAccount;
      
      if (trimmedValue.startsWith("{")) {
        serviceAccount = JSON.parse(trimmedValue);
      } else {
        // Try base64
        try {
          serviceAccount = JSON.parse(Buffer.from(trimmedValue, 'base64').toString());
        } catch {
          throw new Error("Formato de Service Account inválido.");
        }
      }
      
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error("JSON da Service Account incompleto.");
      }

      // Vercel/Environment specific private key fix
      if (typeof serviceAccount.private_key === 'string') {
        // Step 1: Replace literal "\n" strings with real newlines
        let key = serviceAccount.private_key.replace(/\\n/g, '\n');
        
        // Step 2: Handle cases where environmental variable stripped all newlines 
        // but left spaces or nothing between fragments
        if (!key.includes('\n') && key.includes('---')) {
           // This looks like a PEM key that lost its newlines
           const match = key.match(/-----BEGIN PRIVATE KEY-----([^-]+)-----END PRIVATE KEY-----/);
           if (match) {
             const body = match[1].replace(/\s+/g, '\n');
             key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
           }
        }
        
        serviceAccount.private_key = key;
      }
      
      try {
        initializeApp({
          credential: cert(serviceAccount)
        });
        console.log(`[Firebase Admin] SUCCESS: Initialized for project "${serviceAccount.project_id}"`);
      } catch (innerErr: any) {
        if (innerErr.code === 'app/duplicate-app') {
          console.log("[Firebase Admin] App already initialized.");
        } else {
          console.error("[Firebase Admin] initializeApp Failed:", innerErr.message);
          throw innerErr;
        }
      }
      
      // Project ID consistency check
      const clientProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
      if (clientProjectId && serviceAccount.project_id !== clientProjectId) {
        console.warn(`[Firebase Admin] WARNING: Project ID Mismatch! 
          Service Account Project: ${serviceAccount.project_id}
          Client Config Project: ${clientProjectId}
          This WILL cause Error 500 on Vercel unless updated.`);
      }
      
      console.log("[Firebase Admin] Target Database ID:", databaseId || "(default)");
    } catch (e: any) {
      console.error("[Firebase Admin] Initialization error:", e.message);
      (global as any).firebaseInitError = `Erro na Service Account: ${e.message}`;
    }
  } else {
    console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT is missing.");
    (global as any).firebaseInitError = "Variável FIREBASE_SERVICE_ACCOUNT não definida.";
  }
};

// No global initialization call to prevent crashes in serverless

const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION || !!process.env.AWS_REGION;
const isProd = process.env.NODE_ENV === "production";
console.log(`[Environment] Vercel: ${isVercel}, Production: ${isProd}, NODE_ENV: ${process.env.NODE_ENV}`);

async function createServer() {
  console.log("[Server] createServer() called. Starting initialization...");
  const app = express();
  
  // Ensure admin is initialized
  try {
    console.log("[Firebase Admin] Triggering initializeFirebaseAdmin()...");
    initializeFirebaseAdmin();
    console.log("[Firebase Admin] initialization function finished.");
  } catch (e: any) {
    console.error("[Firebase Admin] CRITICAL initialization error:", e.message);
  }
  
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Explicitly handle options for CORS
  app.options("*", (req, res) => res.sendStatus(200));

  // Health check - check this first
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      adminLoaded: getApps().length > 0,
      env: {
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        databaseId: databaseId || "(default)",
        nodeEnv: process.env.NODE_ENV
      }
    });
  });

  // Diagnostic Endpoint
  app.get("/api/debug-firebase", async (req, res) => {
    try {
      if (getApps().length === 0) {
        console.log("[Debug] Re-init triggered via debug endpoint");
        initializeFirebaseAdmin();
      }
      const apps = getApps().map(a => ({ 
        name: a.name, 
        projectId: (a.options as any).credential?.projectId || (a.options as any).projectId || "unknown" 
      }));
      
      let dbStatus = "Not tested";
      try {
        const db = getFirestore(databaseId);
        const test = await db.collection("whitelists").limit(1).get();
        dbStatus = `Connected to '${databaseId || '(default)'}'. Found ${test.size} docs.`;
      } catch (e: any) {
        dbStatus = `Error on '${databaseId || '(default)'}': ${e.message}`;
        // Try default as well
        if (databaseId) {
          try {
            const defaultDb = getFirestore();
            const testDefault = await defaultDb.collection("whitelists").limit(1).get();
            dbStatus += ` | Default DB fallback WORKS: Found ${testDefault.size} docs.`;
          } catch (e2: any) {
            dbStatus += ` | Default DB fallback also FAILED: ${e2.message}`;
          }
        }
      }

      res.json({
        initialized: getApps().length > 0,
        initError: (global as any).firebaseInitError || "none",
        apps,
        databaseId: databaseId || "(default)",
        dbStatus,
        env: {
          hasKey: !!process.env.FIREBASE_SERVICE_ACCOUNT,
          keyLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
          isVercel: !!process.env.VERCEL
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Hotmart Webhook Endpoint
  app.post("/api/hotmart-webhook", async (req, res) => {
    const hotmartToken = process.env.HOTMART_TOKEN;
    const receivedToken = req.headers["h2-hotmart-hcm-token"];

    if (hotmartToken && receivedToken !== hotmartToken) {
      console.error("Invalid Hotmart Token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, data } = req.body;

    if (event === "PURCHASE_APPROVED") {
      const email = data.buyer.email.toLowerCase();
      const name = data.buyer.name || "Usuário Hotmart";

      if (getApps().length > 0) {
        const db = getFirestore(databaseId);
        
        await db.collection("whitelists").doc(email).set({
          email: email,
          name: name,
          source: "hotmart",
          purchasedAt: new Date().toISOString(),
          status: "approved"
        }, { merge: true });

        const snapshot = await db.collection("users").where("email", "==", email).get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({ status: "active", lastAccess: new Date().toISOString() });
        }
      }
    }

    res.status(200).send("OK");
  });

  // WIAPY Webhook Endpoint
  app.post("/api/wiapy-webhook", async (req, res) => {
    const wiapyToken = process.env.WIAPY_TOKEN;
    const wiapyProductId = process.env.WIAPY_PRODUCT_ID;
    
    // WIAPY usually sends token in a header or body.
    const receivedToken = req.headers["x-wiapy-token"] || req.body.token;
    // Check for product ID if provided in payload (WIAPY usually sends 'product_id' or 'id')
    const receivedProductId = req.body.product_id || req.body.id;

    // Security check: Either Token (if configured) OR Product ID must match
    let isAuthorized = false;

    if (wiapyToken && receivedToken === wiapyToken) {
      isAuthorized = true;
    } else if (wiapyProductId && receivedProductId === wiapyProductId) {
      isAuthorized = true;
    } else if (!wiapyToken && !wiapyProductId) {
      // If none configured, we accept for now but log a warning (not recommended for prod)
      console.warn("WIAPY Webhook received without server-side validation variables configured.");
      isAuthorized = true; 
    }

    if (!isAuthorized) {
      console.error("Unauthorized WIAPY Webhook call. Check WIAPY_TOKEN or WIAPY_PRODUCT_ID.");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // WIAPY payload structure (standard fields)
    const { email, customer_name, status, event } = req.body;
    
    // Status can vary: 'paid', 'approved', 'complete'
    const isApproved = status === 'paid' || status === 'approved' || event === 'payment.confirmed';

    if (isApproved && email) {
      const normalizedEmail = email.toLowerCase().trim();
      const name = customer_name || "Usuário WIAPY";

      if (getApps().length > 0) {
        const db = getFirestore(databaseId);
        
        await db.collection("whitelists").doc(normalizedEmail).set({
          email: normalizedEmail,
          name: name,
          source: "wiapy",
          purchasedAt: new Date().toISOString(),
          status: "approved"
        }, { merge: true });

        console.log(`[WIAPY] Access granted for: ${normalizedEmail}`);

        const snapshot = await db.collection("users").where("email", "==", normalizedEmail).get();
        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({ status: "active", lastAccess: new Date().toISOString() });
        }
      }
    }

    res.status(200).send("OK");
  });

  // Verify if an email is whitelisted
  app.post("/api/verify-whitelist", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "O e-mail é obrigatório." });
    const normalizedEmail = email.toLowerCase().trim();

    console.log(`[Verify Whitelist] Checking access for: ${normalizedEmail}`);

    try {
      if (getApps().length === 0) {
        initializeFirebaseAdmin();
      }

      if (getApps().length === 0) {
        return res.status(500).json({ 
          error: "O servidor não pôde inicializar o Firebase Admin.",
          details: (global as any).firebaseInitError || "Verifique se o JSON da Service Account está correto.",
          debug: { hasEnv: !!process.env.FIREBASE_SERVICE_ACCOUNT, isVercel: process.env.VERCEL === '1' }
        });
      }

      // Access logic
      let db;
      try {
        db = getFirestore(databaseId);
        console.log(`[Verify Whitelist] Using databaseId: ${databaseId || "(default)"}`);
      } catch (e: any) {
        console.warn("[Firebase Admin] Initialization with Custom ID failed, using default:", e.message);
        db = getFirestore();
      }

      let whitelistDoc;
      try {
        whitelistDoc = await db.collection("whitelists").doc(normalizedEmail).get();
      } catch (dbErr: any) {
        console.error(`[Verify Whitelist] Error on database "${databaseId || "(default)"}":`, dbErr.message);
        
        // Hard fallback to default database
        if (databaseId) {
          console.log("[Verify Whitelist] Attempting HARD FALLBACK to (default) database...");
          try {
            const defaultDb = getFirestore();
            whitelistDoc = await defaultDb.collection("whitelists").doc(normalizedEmail).get();
            db = defaultDb;
            console.log("[Verify Whitelist] Hard fallback success!");
          } catch (retryErr: any) {
            console.error("[Verify Whitelist] All access attempts failed.");
            return res.status(500).json({ 
              error: "Falha ao acessar o banco de dados.",
              message: retryErr.message,
              details: `Erro no banco '${databaseId}': ${dbErr.message}. Erro no banco '(default)': ${retryErr.message}`,
              help: "URGENTE: Como você mudou de projeto no Firebase, você PRECISA atualizar o JSON da 'FIREBASE_SERVICE_ACCOUNT' na Vercel para o novo projeto. O erro indica que as credenciais atuais não têm acesso a este projeto.",
              debug: { 
                databaseId, 
                adminProjectId: getApps()[0]?.options.projectId || "unknown",
                configProjectId: process.env.VITE_FIREBASE_PROJECT_ID || "unknown",
                initError: (global as any).firebaseInitError
              }
            });
          }
        } else {
          return res.status(500).json({ 
            error: "Erro de conexão com Firestore (default).",
            message: dbErr.message,
            help: "O banco de dados Firestore (default) foi criado no seu Console Firebase?",
            debug: { databaseId: "(default)", initError: (global as any).firebaseInitError }
          });
        }
      }
      
      const isCreator = normalizedEmail === 'mhmarinhobr@gmail.com';
      
      let isAdminUser = false;
      try {
        const adminDoc = await db.collection("admins").doc(normalizedEmail).get();
        isAdminUser = adminDoc.exists;
      } catch (adminErr) {
        // Ignore fallback
      }

      if (!whitelistDoc?.exists && !isCreator && !isAdminUser) {
        return res.json({ 
          whitelisted: false, 
          error: "Email não cadastrado. Verifique o email usado na compra." 
        });
      }

    // Check if user already exists in Auth to know if we should show Login or Register
    let exists = false;
    try {
      const auth = getAuth();
      await auth.getUserByEmail(normalizedEmail);
      exists = true;
    } catch (e: any) {
        if (e.code !== 'auth/user-not-found') {
          console.error("Auth check error:", e);
        }
      }

      res.json({ 
        whitelisted: true, 
        existsInAuth: exists,
        email: normalizedEmail
      });
    } catch (error: any) {
      console.error("Error in verify-whitelist:", error);
      res.status(500).json({ 
        error: `Erro interno no servidor ao verificar acesso: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Login by email (simplified access)
  app.post("/api/login-by-email", async (req, res) => {
    console.log("Login attempt for email:", req.body.email);
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (getApps().length === 0) {
        console.error("Admin not initialized during login attempt");
        return res.status(500).json({ error: "Firebase Admin não inicializado. Verifique a variável FIREBASE_SERVICE_ACCOUNT no menu de Secrets." });
      }

      let db;
      try {
        db = getFirestore(databaseId);
      } catch (e) {
        db = getFirestore();
      }
      
      let whitelistDoc;
      try {
        whitelistDoc = await db.collection("whitelists").doc(normalizedEmail).get();
      } catch (dbErr: any) {
        console.warn(`[Login] Failed to access database "${databaseId || "(default)"}":`, dbErr.message);
        if (databaseId) {
          try {
            db = getFirestore();
            whitelistDoc = await db.collection("whitelists").doc(normalizedEmail).get();
          } catch (retryErr: any) {
            return res.status(500).json({ 
              error: "Erro ao acessar banco de dados.", 
              details: `Falha no banco "${databaseId}" e no padrão. Erro: ${retryErr.message}`,
              debug: { databaseId, adminInitialized: true }
            });
          }
        } else {
          return res.status(500).json({ 
            error: "Erro ao acessar banco de dados.", 
            details: dbErr.message,
            debug: { databaseId: databaseId || "(default)", adminInitialized: true }
          });
        }
      }

      const isCreator = normalizedEmail === 'mhmarinhobr@gmail.com';
      let isAdminUser = false;
      
      try {
        const adminDoc = await db.collection("admins").doc(normalizedEmail).get();
        isAdminUser = adminDoc.exists;
      } catch (adminErr) {
        console.warn("Could not check admin status for login:", adminErr);
      }

      if (!whitelistDoc.exists && !isCreator && !isAdminUser) {
        console.log("Email not authorized (not whitelist/creator/admin):", normalizedEmail);
        return res.status(403).json({ error: "Email não cadastrado. Verifique o email usado na compra." });
      }

      // Try to find existing user in Firebase Auth to reuse same UID (e.g. from Google login)
      let uid: string;
      try {
        const auth = getAuth();
        const userRecord = await auth.getUserByEmail(normalizedEmail);
        uid = userRecord.uid;
        console.log("Found existing user with UID:", uid);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          // If not found, use a deterministic UID for this email
          uid = `email_${Buffer.from(normalizedEmail).toString('hex')}`;
          console.log("No existing user found, using deterministic UID:", uid);
        } else {
          throw e;
        }
      }

      const auth = getAuth();
      const customToken = await auth.createCustomToken(uid, {
        email: normalizedEmail,
        isWhitelisted: true
      });

      console.log("Custom token generated for:", normalizedEmail);
      res.json({ token: customToken });
    } catch (error: any) {
      console.error("Error in login-by-email:", error);
      res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
  });

// Vite middleware for development or fallback
  const distPath = path.join(process.cwd(), "dist");
  const distExists = fs.existsSync(distPath);

  if (!isVercel) {
    if (!isProd || !distExists) {
      console.log(isProd ? "Production mode but dist missing, falling back to Vite middleware..." : "Adding Vite middleware (Development)...");
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            host: '0.0.0.0',
            port: 3000
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
        console.log("Vite middleware added successfully.");
      } catch (viteError: any) {
        console.error("CRITICAL: Failed to load Vite middleware:", viteError);
        if (distExists) {
          app.use(express.static(distPath));
          app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
        }
      }
    } else {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    // On Vercel, the static files are handled by the vercel.json rewrites, 
    // so we don't need to serve them here. The Express app only handles /api.
    console.log("Vercel environment detected: Express will only handle API routes.");
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Error Handler]", err);
    res.status(500).json({
      error: "Ocorreu um erro inesperado no servidor.",
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  });

  return app;
}

// Para o AI Studio (dev) ou execução direta, rodamos o servidor
if (!isVercel || process.env.RUN_SERVER === 'true') {
  console.log("Starting server in environment:", process.env.NODE_ENV || "development");
  createServer().then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to start server:", err);
  });
}

export default createServer;
