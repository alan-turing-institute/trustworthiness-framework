/**
 * Authentication Module
 *
 * Handles user authentication, session management, and password security.
 * Uses Passport.js with local strategy and better-sqlite3 for session storage.
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import SqliteStoreFactory from "better-sqlite3-session-store";
import { sqlite } from "./db";

// Sessions table will be managed by better-sqlite3-session-store

/**
 * Extend Express namespace to include User type information
 * This allows TypeScript to know what properties are available on req.user
 */
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string | null;
      password: string;
      firstName: string | null;
      lastName: string | null;
      role: "admin" | "assessor" | "external";
      isActive: boolean;
      lastLogin: Date | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

// Promisify the scrypt function to use async/await instead of callbacks
const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt
 *
 * @param password - The plain text password to hash
 * @returns A string in the format "hashedPassword.salt"
 *
 * Scrypt is a password-based key derivation function designed to be
 * computationally expensive to defend against brute-force attacks.
 */
async function hashPassword(password: string) {
  // Generate a random 16-byte salt for this password
  const salt = randomBytes(16).toString("hex");

  // Hash the password with the salt using scrypt (64-byte key length)
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;

  // Return the hash and salt combined with a dot separator
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compares a supplied password with a stored hashed password
 *
 * @param supplied - The plain text password provided by the user
 * @param stored - The stored password in the format "hashedPassword.salt"
 * @returns True if passwords match, false otherwise
 *
 * Uses timingSafeEqual to prevent timing attacks during comparison
 */
async function comparePasswords(supplied: string, stored: string) {
  // Extract the hash and salt from the stored password
  const [hashed, salt] = stored.split(".");

  // Convert the stored hash from hex string to Buffer
  const hashedBuf = Buffer.from(hashed, "hex");

  // Hash the supplied password with the same salt
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Configures authentication for the Express application
 *
 * Sets up Passport.js with local strategy, session management with SQLite storage,
 * and defines all authentication-related routes (login, logout, register)
 *
 * @param app - Express application instance
 */
export function setupAuth(app: Express) {
  // Session TTL (Time To Live) set to 7 days in milliseconds
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Create a SQLite-backed session store
  const SqliteStore = SqliteStoreFactory(session);
  const sessionStore = new SqliteStore({
    client: sqlite,
    expired: {
      clear: true,
      intervalMs: 900000 // Clean up expired sessions every 15 minutes
    }
  });

  // Configure session middleware settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key", // Secret for signing session ID cookie
    resave: true, // Force session save even if unmodified
    saveUninitialized: true, // Save uninitialized sessions
    store: sessionStore, // Use SQLite to persist sessions
    rolling: true, // Reset expiry on each request (keeps session alive while user is active)
    cookie: {
      httpOnly: false, // Allow JavaScript access for debugging (should be true in production)
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl, // Cookie expiration time
      sameSite: 'lax', // CSRF protection
      path: '/',
    },
    name: 'connect.sid', // Session cookie name
  };

  // Trust the first proxy (required when behind reverse proxy like nginx)
  app.set("trust proxy", 1);

  // Apply session middleware to all routes
  app.use(session(sessionSettings));

  // Initialize Passport.js authentication
  app.use(passport.initialize());

  // Enable persistent login sessions
  app.use(passport.session());

  /**
   * Configure Passport Local Strategy for username/password authentication
   *
   * This strategy is executed when passport.authenticate("local") is called.
   * It verifies the username and password, and returns the user object if valid.
   */
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Attempt to find user by username
        const user = await storage.getUserByUsername(username);

        // Reject if user doesn't exist or is inactive
        if (!user || !user.isActive) {
          return done(null, false);
        }

        // Verify the provided password matches the stored hash
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false);
        }

        // Update the user's last login timestamp
        await storage.updateUserLastLogin(user.id);

        // Authentication successful - return the user object
        return done(null, user);
      } catch (error) {
        // Pass any errors to Passport
        return done(error);
      }
    }),
  );

  /**
   * Serialize user for session storage
   *
   * Only the user ID is stored in the session to minimize session size.
   * This function is called when a user logs in.
   */
  passport.serializeUser((user, done) => done(null, user.id));

  /**
   * Deserialize user from session storage
   *
   * Retrieves the full user object from the database using the stored user ID.
   * This function is called on each request to populate req.user.
   */
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  /**
   * POST /api/register
   *
   * Handles user registration - creates a new user account and automatically logs them in
   */
  app.post("/api/register", async (req, res, next) => {
    try {
      // Extract user data from request body
      const { username, email, firstName, lastName, role = "external" } = req.body;
      const password = req.body.password;

      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email is already in use (if email provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Hash the password before storing it
      const hashedPassword = await hashPassword(password);

      // Create the new user in the database
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      });

      // Automatically log in the newly registered user
      req.login(user, (err) => {
        if (err) return next(err);

        // Remove password from response for security
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  /**
   * POST /api/login
   *
   * Handles user login using Passport's local strategy.
   * If authentication succeeds, returns user data without password.
   */
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Debug logging to help troubleshoot session issues
    console.log("=== LOGIN SUCCESS DEBUG ===");
    console.log("Session ID after login:", req.sessionID);
    console.log("Session data after login:", req.session);
    console.log("Is authenticated after login:", req.isAuthenticated());
    console.log("User after login:", req.user);
    console.log("=== END LOGIN DEBUG ===");

    // Return user data without password for security
    const { password: _, ...userWithoutPassword } = req.user!;
    res.status(200).json(userWithoutPassword);
  });

  /**
   * POST /api/logout
   *
   * Logs out the current user by destroying their session
   */
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  /**
   * GET /api/logout
   *
   * Alternative logout endpoint that redirects to login page after logout
   */
  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect("/login");
    });
  });

  /**
   * GET /api/auth/user
   *
   * Returns the currently authenticated user's information.
   * Used by the frontend to check authentication status on app load.
   */
  app.get("/api/auth/user", (req, res) => {
    // Debug logging to help troubleshoot authentication issues
    console.log("=== /api/auth/user DEBUG ===");
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User:", req.user);
    console.log("Cookies:", req.headers.cookie);
    console.log("=== END DEBUG ===");

    // Return 401 if user is not authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Return user data without password for security
    const { password: _, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
}

/**
 * Middleware: Check if user is authenticated
 *
 * Use this middleware on routes that require a logged-in user.
 * Returns 401 Unauthorized if user is not authenticated.
 *
 * @example
 * app.get("/api/protected", isAuthenticated, handler);
 */
export const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

/**
 * Middleware: Check if user is an admin
 *
 * Use this middleware on routes that require admin privileges.
 * Returns 403 Forbidden if user is not authenticated or not an admin.
 *
 * @example
 * app.delete("/api/users/:id", isAdmin, handler);
 */
export const isAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  next();
};

// Export password utility functions for use in other modules (e.g., user management)
export { hashPassword, comparePasswords };