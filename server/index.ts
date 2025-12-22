/**
 * Server Entry Point
 *
 * Main Express application setup and configuration.
 * Handles middleware, CORS, logging, routing, and server initialization.
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { log } from "./vite";

// Create Express application instance
const app = express();

/**
 * CORS Middleware
 *
 * Configures Cross-Origin Resource Sharing to allow:
 * - Credentials (cookies/sessions) from frontend
 * - Requests from the origin (development or production)
 * - All standard HTTP methods
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * Body Parsing Middleware
 *
 * Parses JSON and URL-encoded request bodies.
 * 50mb limit allows for large framework/assessment imports.
 */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

/**
 * Request Logging Middleware
 *
 * Logs all API requests with:
 * - Method and path
 * - Status code
 * - Duration in milliseconds
 * - Response JSON (truncated if too long)
 *
 * Only logs requests to /api/* endpoints to reduce noise.
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Intercept res.json to capture response for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log when response is finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate long log lines
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Server Initialization
 *
 * Async IIFE (Immediately Invoked Function Expression) that:
 * 1. Registers all API routes and initializes database
 * 2. Sets up error handling middleware
 * 3. Configures static file serving (development or production)
 * 4. Starts the HTTP server
 */
(async () => {
  // Register all API routes, setup authentication, and initialize database
  const server = await registerRoutes(app);

  /**
   * Global Error Handler
   *
   * Catches any errors thrown by route handlers and returns JSON response.
   * This middleware must be registered after all routes.
   */
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err; // Re-throw for logging
  });

  /**
   * Frontend Serving Setup
   *
   * Development: Uses Vite dev server for HMR (Hot Module Replacement)
   * Production: Serves pre-built static files from dist/public
   *
   * IMPORTANT: This must be set up AFTER API routes to prevent
   * the catch-all route from intercepting API requests.
   */
  if (process.env.NODE_ENV !== "production") {
    // Development mode: Use Vite dev server
    try {
      const { setupVite } = await import("./vite-dev");
      await setupVite(app, server);
    } catch (error) {
      console.warn("Vite development setup failed:", error);
      // Fall back to serving built static files
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }
  } else {
    // Production mode: Serve built static files
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  /**
   * Start HTTP Server
   *
   * Port: Environment variable PORT (default: 5000)
   * Host: 0.0.0.0 in production (all interfaces), 127.0.0.1 in development (localhost only)
   *
   * This single port serves both the API (/api/*) and the frontend (all other routes).
   */
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
