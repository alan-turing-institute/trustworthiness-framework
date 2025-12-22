/**
 * Configuration Module
 *
 * Loads environment variables from .env file into process.env
 * This file should be imported before any other modules that need environment variables
 */

import dotenv from "dotenv";

// Load environment variables as early as possible
// This reads the .env file and makes variables available via process.env
dotenv.config();
