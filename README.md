# 🦕 Dino Runner Game - Stage 4 Starter

Welcome to Stage 4 of the Dino Runner Game tutorial! Having built a complete
interactive game in Stages 1-3, you'll now **add database integration and social
features** with PostgreSQL, global leaderboards, and player customization.

## What you'll build in this stage

By the end of Stage 4, you'll have:

- ✅ PostgreSQL database integration using npm:pg with connection pooling
- ✅ Global leaderboard system with persistent high scores
- ✅ Player customization system (dino colors, themes, difficulty)
- ✅ Score submission via `/api/scores` and leaderboard via `/api/leaderboard`
- ✅ Player customization via `/api/customization` endpoints
- ✅ Database middleware for connection management
- ✅ Enhanced UI with leaderboard display and customization modal
- ✅ Data persistence across sessions and devices
- ✅ Professional game architecture with separation of concerns

## Getting started

### Prerequisites

- Completed Stage 3 (or clone the Stage 3 starter as your foundation)
- [Deno](https://deno.com/) installed on your system
- A PostgreSQL database (we recommend [Neon](https://neon.tech/) for cloud
  hosting)
- A code editor (VS Code recommended)
- Understanding of databases, SQL, and API design concepts

### Setup

1. Copy your Stage 3 project or clone this starter repository
2. Install the dependencies with `deno install`

## Database setup

1. Visit [neon.tech](https://neon.tech/) and sign up for an account
2. Create a new project and name it "dino-runner"
3. Copy the connection string from your dashboard, this will be used in your
   `.env` file

## Environment configuration

Update your `.env` file to add a `DATABASE_URL` variable with the database
connection string details, also add feature flags for leaderboard and
customization:

<details>
<summary>.env.example (click to expand)</summary>

```env
# Server Configuration
PORT=8000

# Environment
ENVIRONMENT=development

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/dino_runner

# Features
ENABLE_LEADERBOARD=true
ENABLE_CUSTOMIZATION=true
```

</details>

## Database architecture and schema

In this stage, we'll implement a relational database schema to store game data
persistently. Understanding database design is crucial for building scalable
applications.

We'll create four main tables:

1. **players**: User accounts and profiles
2. **high_scores**: Global leaderboard entries
3. **player_settings**: Customization preferences
4. **game_sessions**: Analytics and session tracking

First, let's define our database structure. We use a schema file to define all
our tables and relationships.

Make a new directory called `database` in your `src` folder and create a file
called `schema.sql`:

<details>
<summary>📁 src/database/schema.sql (click to expand)</summary>

```sql
-- Stage 4: Database schema for Dino Runner Game

-- Players table for user accounts
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- High scores table for global leaderboard
CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL, -- For anonymous players
  score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER DEFAULT 0,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player customization settings
CREATE TABLE IF NOT EXISTS player_settings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  dino_color VARCHAR(7) DEFAULT '#4CAF50',
  background_theme VARCHAR(20) DEFAULT 'desert',
  sound_enabled BOOLEAN DEFAULT true,
  difficulty_preference VARCHAR(20) DEFAULT 'normal',
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id)
);

-- Game sessions for analytics
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  final_score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER NOT NULL,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  session_data JSONB, -- For storing additional game metrics
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
```

- `SERIAL PRIMARY KEY`: An auto-incrementing unique identifier to ensure each
  record has a unique ID
- `REFERENCES`: Foreign key relationships between tables. These create a link
  between two tables, ensuring referential integrity, so for example if a player
  is deleted, their related scores and settings are also removed.
- `ON DELETE CASCADE`: Automatically delete related records
- `DEFAULT NOW()`: Automatically set timestamp on record creation
- `UNIQUE`: Ensure no duplicate values
- `INDEX`: Speed up queries on frequently searched columns
- `JSONB`: Efficient storage for structured data (PostgreSQL-specific)

</details>

### Database connection management

We'll create a connection manager that handles PostgreSQL connections
efficiently using connection pooling. This allows multiple concurrent requests
to share a limited number of database connections, improving performance and
resource utilization.

In your `src/database` directory, create a file called `connection.ts`:

<details>
<summary>📁 src/database/connection.ts (click to expand)</summary>

```typescript
import { Pool } from "npm:pg";

let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    // Try to use DATABASE_URL first (for Neon and other cloud providers)
    const databaseUrl = Deno.env.get("DATABASE_URL");

    if (databaseUrl) {
      console.log("🔧 Using DATABASE_URL for connection pool");
      pool = new Pool({
        connectionString: databaseUrl,
        max: 10, // 10 connections in pool
      });
    } else {
      // Check if Deno Deploy standard PostgreSQL environment variables are available
      const pgHost = Deno.env.get("PGHOST");
      const pgUser = Deno.env.get("PGUSER");

      if (pgHost && pgUser) {
        console.log("🔧 Using Deno Deploy PostgreSQL environment variables");
        // Deno Deploy automatically sets these standard PostgreSQL env vars
        const pgPassword = Deno.env.get("PGPASSWORD");
        pool = new Pool({
          host: pgHost,
          user: pgUser,
          password: pgPassword || undefined, // Use undefined instead of empty string
          database: Deno.env.get("PGDATABASE") || "postgres",
          port: parseInt(Deno.env.get("PGPORT") || "5432"),
          max: 10,
        });
      } else {
        // Fall back to custom environment variables
        console.log("🔧 Using custom environment variables");
        pool = new Pool({
          host: Deno.env.get("DB_HOST") || "localhost",
          user: Deno.env.get("DB_USER") || "postgres",
          password: Deno.env.get("DB_PASSWORD"),
          database: Deno.env.get("DB_NAME") || "dino_runner",
          port: parseInt(Deno.env.get("DB_PORT") || "5432"),
          max: 10,
        });
      }
    }

    console.log("🗄️ Database connection pool initialized");
  }

  return pool;
}

/**
 * Initialize database and return pool (called on server startup)
 */
export function initializeDatabase(): Pool {
  return getDatabase();
}

/**
 * Close the database connection pool
 * Call this during application shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🗄️ Database connection pool closed");
  }
}
```

This connection module provides three-tier fallback:

1. **DATABASE_URL** (for cloud providers like Neon)
2. **Standard PostgreSQL environment variables** (for Deno Deploy)
3. **Custom environment variables** (for local development)

We use `npm:pg` which is the standard Node.js PostgreSQL driver, providing
better compatibility and features than the Deno-specific postgres module.

</details>

### Database migrations and initialization

We'll need to set up our database tables and initial data automatically when the
server starts. This ensures that the database schema is always up-to-date and
ready for use. We can use a migration system to handle this.

In your `src/database` directory, create a file called `migrations.ts`:

<details>
<summary>📁 src/database/migrations.ts (click to expand)</summary>

```typescript
import { Pool } from "npm:pg";
import { getDatabase } from "./connection.ts";

/**
 * Initialize database and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  console.log("🚀 Initializing database...");
  
  const pool = getDatabase();
  const client = await pool.connect();
  
  try {
    // Read and execute the schema file
    const schemaSQL = await Deno.readTextFile("src/database/schema.sql");

    // Split into individual statements and execute them
    const statements = schemaSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        console.error(`❌ Migration error: ${error.message}`);
        throw error;
      }
    }

    // Insert sample data for testing (optional)
    await insertSampleData(client);

    console.log("✅ Database initialization completed successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  } finally {
    client.release(); // Always release the client back to the pool
  }
}

/**
 * Insert sample data for testing and demonstration
 */
async function insertSampleData(client: any): Promise<void> {
  try {
    // Check if sample data already exists
    const existingPlayers = await client.query("SELECT COUNT(*) FROM players");

    if (parseInt(existingPlayers.rows[0].count) === 0) {
      console.log("🌱 Inserting sample data...");

      // Insert sample players
      await client.query(`
        INSERT INTO players (username, email) VALUES 
        ('DemoPlayer1', 'demo1@example.com'),
        ('DemoPlayer2', 'demo2@example.com'),
        ('TestRunner', 'test@example.com')
      `);

      // Insert sample high scores
      await client.query(`
        INSERT INTO high_scores (player_name, score, obstacles_avoided, game_duration, created_at) VALUES 
        ('DemoPlayer1', 2500, 25, 120, NOW() - INTERVAL '2 days'),
        ('DemoPlayer2', 1800, 18, 85, NOW() - INTERVAL '1 day'),
        ('TestRunner', 3200, 32, 180, NOW() - INTERVAL '3 hours')
      `);

      console.log("✅ Sample data inserted");
    }
  } catch (error) {
    console.warn(
      "⚠️ Could not insert sample data (this is normal for production):",
      error.message,
    );
  }
}

    if (parseInt(existingPlayers.rows[0].count) === 0) {
      console.log("🌱 Inserting sample data...");

      // Insert sample players
      await client.query(`
        INSERT INTO players (username, email) VALUES 
        ('DinoMaster', 'dino@example.com'),
        ('JumpQueen', 'jump@example.com'),
        ('CactusDodger', 'dodge@example.com')
        ON CONFLICT (username) DO NOTHING
      `);

      // Insert sample high scores
      await client.query(`
        INSERT INTO high_scores (player_name, score, obstacles_avoided) VALUES 
        ('DinoMaster', 1250, 25),
        ('JumpQueen', 980, 18),
        ('CactusDodger', 750, 12),
        ('SpeedRunner', 2100, 42),
        ('Anonymous', 650, 10)
      `);

      console.log("✅ Sample data inserted");
    }
  } catch (error) {
    console.warn(
      "⚠️ Sample data insertion failed (this is OK):",
      error.message,
    );
  }
}
```

These are idempotent operations, meaning they can be run multiple times without
side effects. The migration system ensures that the database schema is always
up-to-date, and sample data is inserted only if it doesn't already exist.

The sample data helps you to test your application without needing to manually
create records.

</details>

### Database middleware

The different routes will need access to the database connection. To avoid code
duplication, we can create middleware to inject database connections into
request contexts.

Create a directory called `middleware` in your `src` folder and create a file
called `database.ts`:

<details>
<summary>📁 src/middleware/database.ts (click to expand)</summary>

```typescript
import type { Context, Next } from "@oak/oak";
import { getDatabase } from "../database/connection.ts";

/**
 * Database middleware that adds database pool to request context
 * This allows all route handlers to access the database easily
 */
export async function databaseMiddleware(
  ctx: Context,
  next: Next,
): Promise<void> {
  try {
    // Add database pool to the request context state
    ctx.state.db = getDatabase();

    // Continue to the next middleware or route handler
    await next();
  } catch (error) {
    console.error("❌ Database middleware error:", error);

    // Return error response if database is unavailable
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Database connection failed",
    };
  }
}
```

</details>

### Leaderboard API routes

Our backend will expose a REST API for the leaderboard functionality, so that we
can submit and retrieve scores and player data.

In your `src/routes` directory, create a file called `leaderboard.routes.ts`:

<details>
<summary>📁 src/routes/leaderboard.routes.ts (click to expand)</summary>

```typescript
import { Router } from "@oak/oak";
import type { Context } from "@oak/oak";

const router = new Router();

/**
 * GET /api/leaderboard - Fetch global leaderboard
 * Query parameters:
 * - limit: number of entries to return (default: 10)
 */
router.get("/api/leaderboard", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");

    const client = await pool.connect();
    try {
      // Query for top scores with player information
      const result = await client.query(
        `
        SELECT 
          hs.player_name,
          hs.score,
          hs.obstacles_avoided,
          hs.created_at,
          p.username,
          p.avatar_url
        FROM high_scores hs
        LEFT JOIN players p ON hs.player_id = p.id
        ORDER BY hs.score DESC
        LIMIT $1
      `,
        [limit],
      );

      ctx.response.body = {
        success: true,
        leaderboard: result.rows.map((row: any, index: number) => ({
          rank: index + 1,
          playerName: row.username || row.player_name,
          score: Number(row.score),
          obstaclesAvoided: Number(row.obstacles_avoided || 0),
          avatarUrl: row.avatar_url,
          date: row.created_at,
        })),
      };
    } finally {
      client.release(); // Always release the client
    }
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch leaderboard",
    };
  }
});

/**
 * POST /api/scores - Submit a new high score
 * Body: { playerName: string, score: number, obstaclesAvoided: number, gameDuration: number }
 */
router.post("/api/scores", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const body = await ctx.request.body.json();

    // Validate input data
    const { playerName, score, obstaclesAvoided = 0 } = body;

    if (!playerName || typeof score !== "number" || score < 0) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Invalid score data. playerName and positive score required.",
      };
      return;
    }

    const client = await pool.connect();
    try {
      // Insert new high score
      const result = await client.query(
        `
        INSERT INTO high_scores (player_name, score, obstacles_avoided)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
      `,
        [playerName, Math.floor(score), Math.floor(obstaclesAvoided)],
      );

      // Check if this is a new personal best by comparing with existing scores
      const rankResult = await client.query(
        `
        SELECT COUNT(*) + 1 as rank
        FROM high_scores
        WHERE score > $1
      `,
        [Math.floor(score)],
      );

      ctx.response.body = {
        success: true,
        scoreId: result.rows[0].id,
        rank: Number(rankResult.rows[0].rank),
        message: "Score submitted successfully!",
      };

      console.log(`🏆 New score submitted: ${playerName} - ${score}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error submitting score:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to submit score",
    };
  }
});

export default router;
```

**Important:** Make sure to export the router as the default export so it can be
imported correctly in your main.ts file.

This code provides two new endpoints:

- GET /api/leaderboard: Fetches the global leaderboard with optional limit
  parameter
- POST /api/leaderboard: Submits a new high score with player name and score
  data

</details>

### Player customization API

We will create endpoints for player customization features, allowing users to
save and retrieve their preferences such as dino colors, background themes,
sound settings, and difficulty levels.

In your `src/routes` directory, create a file called `customization.routes.ts`:

<details>
<summary>📁 src/routes/customization.routes.ts (click to expand)</summary>

```typescript
import { Router } from "@oak/oak";
import type { Context } from "@oak/oak";

const router = new Router();

/**
 * GET /api/customization/:playerName - Get player customization settings
 */
router.get("/api/customization/:playerName", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const playerName = ctx.params.playerName;

    let settings = {
      dinoColor: "#4CAF50",
      backgroundTheme: "desert",
      soundEnabled: true,
      difficultyPreference: "normal",
    };

    const client = await pool.connect();
    try {
      // First try to find registered player
      const playerResult = await client.query(
        `SELECT id FROM players WHERE username = $1`,
        [playerName],
      );

      if (playerResult.rows.length > 0) {
        const playerId = Number(playerResult.rows[0].id);
        const settingsResult = await client.query(
          `
          SELECT dino_color, background_theme, sound_enabled, difficulty_preference
          FROM player_settings
          WHERE player_id = $1
        `,
          [playerId],
        );

        if (settingsResult.rows.length > 0) {
          const row = settingsResult.rows[0];
          settings = {
            dinoColor: row.dino_color,
            backgroundTheme: row.background_theme,
            soundEnabled: row.sound_enabled,
            difficultyPreference: row.difficulty_preference,
          };
        }
      }

      ctx.response.body = {
        success: true,
        settings: settings,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error fetching settings:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch settings",
    };
  }
});

/**
 * POST /api/customization - Save player customization settings
 * Body: { playerName: string, dinoColor: string, backgroundTheme: string, etc. }
 */
router.post("/api/customization", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;
    const body = await ctx.request.body.json();

    const {
      playerId,
      dinoColor = "#4CAF50",
      backgroundTheme = "desert",
      soundEnabled = true,
      difficultyPreference = "normal",
    } = body;

    // Validate color format (simple hex color validation)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(dinoColor)) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Invalid color format. Use hex format like #4CAF50",
      };
      return;
    }

    const client = await pool.connect();
    try {
      // Use UPSERT (INSERT ON CONFLICT UPDATE) to handle both new and existing settings
      await client.query(
        `
        INSERT INTO player_settings (player_id, dino_color, background_theme, sound_enabled, difficulty_preference)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (player_id) 
        DO UPDATE SET 
          dino_color = EXCLUDED.dino_color,
          background_theme = EXCLUDED.background_theme,
          sound_enabled = EXCLUDED.sound_enabled,
          difficulty_preference = EXCLUDED.difficulty_preference,
          updated_at = NOW()
      `,
        [
          playerId,
          dinoColor,
          backgroundTheme,
          soundEnabled,
          difficultyPreference,
        ],
      );

      ctx.response.body = {
        success: true,
        message: "Settings saved successfully!",
      };

      console.log(`⚙️ Settings updated for player ${playerId}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error saving settings:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to save settings",
    };
  }
});

export default router;
```

**Important:** Make sure to export the router as the default export so it can be
imported correctly in your main.ts file.

This code adds two endpoints:

- GET /api/customization/:playerName: Retrieves player customization settings by
  player name
- POST /api/customization: Saves or updates player customization settings

</details>

### Update the main server

Now we need to integrate all these components into our main server file. This
will set up the application, initialize the database, and register our routes.

Update your `src/main.ts` file to include the new routes and middleware:

<details>
<summary>📁 src/main.ts (click to expand)</summary>

```typescript
// NEW: Add new imports
import { leaderboardRoutes } from "./routes/leaderboard.routes.ts";
import { customizationRoutes } from "./routes/customization.routes.ts";
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";

// NEW: After the application instance is set up, initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// NEW: Update the middleware to handle CORS for API requests
app.use(async (context, next) => {
  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  context.response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  if (context.request.method === "OPTIONS") {
    context.response.status = 200;
    return;
  }
  await next();
});

// NEW: Add database middleware for API routes
app.use(databaseMiddleware);

// NEW: Add more API routes for leaderboard and customization
app.use(leaderboardRoutes.routes());
app.use(leaderboardRoutes.allowedMethods());

app.use(customizationRoutes.routes());
app.use(customizationRoutes.allowedMethods());

// NEW: Add helpful console logs for debugging
console.log(`🏆 Global Leaderboard at http://${HOST}:${PORT}/leaderboard`);
console.log(`🏆 Leaderboard API at http://${HOST}:${PORT}/api/leaderboard`);
console.log(`🏆 Scores API at http://${HOST}:${PORT}/api/scores`);
console.log(
  `🎨 Customization API at http://${HOST}:${PORT}/api/customization`,
);
```

</details>

## Frontend implementation

### Update index.html

We'll add a leaderboard to the `index.html` file and create a modal for
customization options.

<details>
<summary>📁 public/index.html (click to expand)</summary>

```html
<!-- NEW: Global Leaderboard Section -->
<section class="container">
  <h3>Global Leaderboard</h3>
  <div class="leaderboard-container">
    <div class="leaderboard-list" id="leaderboardList">
      <div class="loading">Loading leaderboard...</div>
    </div>
    <div style="text-align: center; margin-top: 15px">
      <a href="/leaderboard" class="btn btn-primary btn-block"
      >View Full Leaderboard</a>
    </div>
  </div>
</section>

<!-- NEW: Player Name Modal -->
<div class="modal" id="playerModal">
  <div class="modal-content">
    <h3>🎮 Welcome to Dino Runner!</h3>
    <p>
      Enter your name to save scores and compete on the global leaderboard:
    </p>
    <input
      type="text"
      id="playerNameInput"
      placeholder="Your name"
      maxlength="20"
    />
    <div class="modal-buttons">
      <button onclick="savePlayerName()" class="btn btn-primary">
        Save & Play
      </button>
      <button
        onclick="closeModal('playerModal')"
        class="btn btn-secondary"
      >
        Play Anonymous
      </button>
    </div>
  </div>
</div>

<!-- NEW: Customization Modal -->
<div class="modal" id="customizationModal">
  <div class="modal-content">
    <h3>🎨 Customize Your Game</h3>

    <div class="customization-options">
      <div class="option-group">
        <label for="dinoColorPicker">Dino Color:</label>
        <input type="color" id="dinoColorPicker" value="#4CAF50" />
      </div>

      <div class="option-group">
        <label for="backgroundTheme">Background Theme:</label>
        <select id="backgroundTheme">
          <option value="desert">🏜️ Desert</option>
          <option value="forest">🌲 Forest</option>
          <option value="night">🌙 Night</option>
          <option value="rainbow">🌈 Rainbow</option>
          <option value="space">🚀 Space</option>
        </select>
      </div>

      <div class="option-group">
        <label for="difficultyPreference">Difficulty:</label>
        <select id="difficultyPreference">
          <option value="easy">😊 Easy</option>
          <option value="normal">😐 Normal</option>
          <option value="hard">😈 Hard</option>
        </select>
      </div>
    </div>

    <div class="modal-buttons">
      <button onclick="saveCustomization()" class="btn btn-primary">
        Save Changes
      </button>
      <button
        onclick="closeModal('customizationModal')"
        class="btn btn-secondary"
      >
        Cancel
      </button>
    </div>
  </div>
</div>
```

The modal system provides popup interfaces for customization and leaderboard
views. We use semantic HTML with proper ARIA attributes for accessibility.

</details>

### Make a new page for the leaderboard

We'll make a new HTML file for the leaderboard, which will live at
`/leaderboard`.

Create a new file called `leaderboard.html` in the `public` directory to display
the global leaderboard:

<details>
<summary>📁 public/leaderboard.html (click to expand)</summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link
      rel="preload"
      href="https://demo-styles.deno.deno.net/fonts/Moranga-Regular.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link
      rel="preload"
      href="https://demo-styles.deno.deno.net/fonts/Moranga-Medium.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link
      rel="preload"
      href="https://demo-styles.deno.deno.net/fonts/Recursive_Variable.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
    <link rel="stylesheet" href="https://demo-styles.deno.deno.net/styles.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="icon" href="favicon.ico" type="image/x-icon">
    <title>Dino Runner - Global Leaderboard</title>
  </head>

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>

  <body>
    <main class="leaderboard-container">
      <header>
        <h1>🏆 Global Leaderboard</h1>
        <p>Top players from around the world</p>
      </header>
      <nav>
        <a href="/" class="btn">🎮 Play Game</a>
        <button
          onclick="refreshLeaderboard()"
          class="btn btn-secondary refresh-btn"
        >
          🔄 Refresh
        </button>
      </nav>

      <section class="container" id="leaderboard-content">
        <div class="loading">
          <div>🦕 Loading leaderboard...</div>
        </div>
      </section>

      <div class="last-updated" id="last-updated"></div>
    </main>

    <script src="js/leaderboard.js" type="module"></script>
  </body>
</html>
```

</details>

### Enhanced CSS for modals and leaderboards

Updated styles for the leaderboard and modals and for the leaderboard page are
available in
[this CSS file](https://raw.githubusercontent.com/thisisjofrank/game-tutorial-stage-4/refs/heads/main/public/css/styles.css).

### Enhanced JavaScript game engine

The Stage 4 game engine builds upon Stage 3 with significant enhancements for
database integration and player customization. We will add:

#### Player Management System

- Player name prompt and storage
- Player ID generation for database operations
- Persistent player identification across sessions

#### Global Leaderboard Integration

- Real-time score submission to database
- Automatic leaderboard updates after each game
- Global ranking display with player names and scores

#### Player Settings Management

- Dino color customization with hex color picker
- Background theme selection (desert, forest, night, rainbow, space)
- Sound preferences toggle
- Difficulty level selection (easy, normal, hard)

#### Theme System

- Dynamic canvas background updates based on selected theme
- Color gradient generation for different environments
- Visual feedback for theme changes

#### Difficulty Scaling

- Configurable game speed multipliers
- Adaptive obstacle spawn rates
- Personalized challenge levels

#### RESTful API Integration

- Fetch player settings from `/api/customization/:playerName`
- Save customization preferences to `/api/customization`
- Submit scores to `/api/scores`
- Load global leaderboard from `/api/leaderboard`

#### Error Handling & Graceful Degradation

- Network error recovery
- Offline mode fallback
- User-friendly error messages

<details>
<summary>📁 public/js/game.js (click to expand)</summary>

```javascript
// Stage 4: Enhanced game engine with database integration and customization
// Key additions from Stage 3:
// - Player management system with persistent names
// - Database API integration for scores and settings
// - Customization system with themes and preferences
// - Global leaderboard with real-time updates
// - Enhanced UI with modals and better user experience

class DinoGame {
  constructor() {
    // ... existing canvas and UI element initialization ...

    // NEW: Player data tracking for database integration
    this.playerName = localStorage.getItem("playerName") || null;
    this.obstaclesAvoided = 0;
    this.gameStartTime = 0;
    this.maxSpeedReached = 0;

    // NEW: Customization settings with defaults
    this.settings = {
      dinoColor: "#4CAF50",
      backgroundTheme: "desert",
      soundEnabled: true,
      difficultyPreference: "normal",
    };

    // NEW: Theme system for visual customization
    this.themes = {
      desert: { sky: "#87CEEB", ground: "#DEB887" },
      forest: { sky: "#98FB98", ground: "#228B22" },
      night: { sky: "#191970", ground: "#2F4F4F" },
      rainbow: { sky: "#FF69B4", ground: "#FFD700" },
      space: { sky: "#000000", ground: "#696969" },
    };

    // ... existing game state initialization ...
  }

  init() {
    // ... existing initialization ...

    // NEW: Load player settings from database
    this.loadPlayerSettings();
    // NEW: Load and display global leaderboard
    this.loadGlobalLeaderboard();
    // NEW: Show player name prompt if needed
    this.showPlayerNamePrompt();
  }

  // NEW: Database API integration methods
  async loadPlayerSettings() {
    // Fetch player customization settings from API
    // Apply settings to game (colors, themes, difficulty)
  }

  async savePlayerSettings() {
    // Save current settings to database via API
    // Handle network errors gracefully
  }

  async loadGlobalLeaderboard() {
    // Fetch top scores from global leaderboard API
    // Update UI with current rankings
  }

  async submitScoreToDatabase(gameDuration) {
    // Submit final score with player statistics
    // Handle new record notifications
    // Refresh leaderboard after submission
  }

  // NEW: Customization system methods
  applyCustomizations() {
    // Apply selected theme to canvas background
    // Adjust difficulty multipliers based on preference
    // Update visual elements with custom colors
  }

  showPlayerNamePrompt() {
    // Display modal for new players to enter name
    // Handle player identification for database
  }

  // NEW: Enhanced game tracking
  startGame() {
    // ... existing game start logic ...

    // NEW: Initialize tracking variables
    this.obstaclesAvoided = 0;
    this.gameStartTime = Date.now();
    this.maxSpeedReached = this.gameSpeed;
  }

  updateObstacles() {
    // ... existing obstacle logic ...

    // NEW: Count avoided obstacles for statistics
    if (obstacle.x + obstacle.width < 0) {
      this.obstacles.splice(i, 1);
      this.obstaclesAvoided++; // Track for database submission
      this.score += 10;
    }
  }

  async gameOver() {
    // ... existing game over logic ...

    // NEW: Calculate game duration and submit to database
    const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
    await this.submitScoreToDatabase(gameDuration);
  }

  // NEW: Enhanced visual rendering with customization
  drawDino() {
    // Use customizable dino color from settings
    this.ctx.fillStyle = this.settings.dinoColor;
    // ... existing drawing logic with custom colors ...
  }

  // NEW: Global UI interaction functions for modals
  // openModal(), closeModal(), saveCustomization(), etc.
}

// NEW: Global leaderboard management functions
window.loadLeaderboard = async function () {
  // Fetch and display leaderboard data
};

// NEW: Player customization functions
window.openCustomization = function () {
  // Open customization modal with current settings
};

window.saveCustomization = function () {
  // Save new customization preferences
};
```

</details>

Next we'll implement each of the new methods we just set up.

### loadPlayerSettings()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
async loadPlayerSettings() {
  try {
    // Check if player has a registered name for database lookup
    if (this.playerName) {
      // Attempt to fetch player's customization settings from the database API
      const response = await fetch(`/api/customization/${this.playerName}`);
      
      // If the API request was successful (status 200-299)
      if (response.ok) {
        // Parse the JSON response containing the player's settings
        const data = await response.json();
        
        // Replace current settings with the retrieved database settings
        this.settings = data.settings;
        
        // Apply the loaded settings to the game (colors, themes, difficulty)
        this.applyCustomizations();
      }
      // Note: If response is not ok, we fall through to use default settings
    } else {
      // For anonymous users (no player name), fall back to browser localStorage
      const savedSettings = localStorage.getItem("gameSettings");
      
      // If settings exist in localStorage, load them
      if (savedSettings) {
        // Merge saved settings with defaults (spread operator preserves defaults for missing keys)
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        
        // Apply the loaded local settings to the game
        this.applyCustomizations();
      }
      // Note: If no localStorage settings exist, game uses constructor defaults
    }
  } catch (error) {
    // Handle any network errors, JSON parsing errors, or API failures gracefully
    // Game continues with default settings rather than crashing
    console.log("Using default settings:", error);
  }
}
```

</details>

### applyCustomizations()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
  applyCustomizations() {
    // === THEME CUSTOMIZATION ===
    // Get the selected theme colors from the themes object, with desert as fallback
    const theme = this.themes[this.settings.backgroundTheme] ||
      this.themes.desert;
    
    // Apply a CSS gradient background to the canvas element
    // Creates a sky-to-ground effect: sky color for top 75%, ground color for bottom 25%
    this.canvas.style.background =
      `linear-gradient(to bottom, ${theme.sky} 0%, ${theme.sky} 75%, ${theme.ground} 75%, ${theme.ground} 100%)`;

    // === DIFFICULTY CUSTOMIZATION ===
    // Define speed multipliers for each difficulty level
    // Easy: 20% slower, Normal: standard speed, Hard: 30% faster
    const difficultyMultipliers = { easy: 0.8, normal: 1.0, hard: 1.3 };
    
    // Calculate the base game speed by applying the difficulty multiplier to base speed (3)
    // Uses fallback of 1.0 if difficulty preference is invalid
    this.initialGameSpeed = 3 *
      (difficultyMultipliers[this.settings.difficultyPreference] || 1.0);
    
    // Update the current game speed to match the new initial speed
    // This affects obstacle movement speed and overall game pace
    this.gameSpeed = this.initialGameSpeed;

    // Log the applied customizations for debugging and user feedback
    console.log(
      `🎨 Applied theme: ${this.settings.backgroundTheme}, difficulty: ${this.settings.difficultyPreference}`,
    );
  }
```

</details>

### savePlayerSettings()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
 async savePlayerSettings() {
  try {
    // === REGISTERED PLAYER: Save to Database ===
    // Check if player has a registered name (logged in user)
    if (this.playerName) {
      // Send player settings to the database via POST API request
      await fetch("/api/customization", {
        method: "POST",
        
        // Set content type to JSON for proper server parsing
        headers: { "Content-Type": "application/json" },
        
        // Serialize the request body with player name and all current settings
        // Uses spread operator to include all properties from this.settings object
        body: JSON.stringify({
          playerName: this.playerName,        // Player identification
          ...this.settings,                   // All customization settings (color, theme, etc.)
        }),
      });
      // Note: We don't check response status here - fire and forget approach
      // Settings will be loaded from database on next game session
    } else {
      // === ANONYMOUS PLAYER: Save to Local Storage ===
      // For users without registered names, fall back to browser localStorage
      // This provides persistence across browser sessions for anonymous users
      localStorage.setItem("gameSettings", JSON.stringify(this.settings));
      
      // Note: localStorage is synchronous and has no network dependency
      // Settings are immediately available for the current browser/device
    }
  } catch (error) {
    // === ERROR HANDLING ===
    // Handle network failures, server errors, or localStorage quota exceeded
    // Log error but don't crash the game - settings just won't be saved
    console.error("Failed to save settings:", error);
    
    // Note: Game continues normally even if save fails
    // User will need to reconfigure settings on next session
  }
}
```

</details>

### loadGlobalLeaderboard()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
async loadGlobalLeaderboard() {
  try {
    // === FETCH LEADERBOARD DATA ===
    // Request top 5 scores from the leaderboard API endpoint
    // Query parameter "limit=5" restricts results to show only top performers
    const response = await fetch("/api/leaderboard?limit=5");
    
    // === PROCESS SUCCESSFUL RESPONSE ===
    // Check if the HTTP request was successful (status 200-299)
    if (response.ok) {
      // Parse the JSON response containing leaderboard data
      // Expected format: { success: true, leaderboard: [...] }
      const data = await response.json();
      
      // Update the UI with the fetched leaderboard entries
      // Calls a separate method to handle DOM manipulation and display
      this.displayLeaderboard(data.leaderboard);
    }
    // Note: If response is not ok (404, 500, etc.), we silently fail
    // Game continues without leaderboard data - graceful degradation
    
  } catch (error) {
    // === ERROR HANDLING ===
    // Handle network failures, server downtime, or JSON parsing errors
    // Log the error for debugging but don't crash the game
    console.log("Failed to load leaderboard:", error);
    
    // Note: Game remains fully functional even if leaderboard fails to load
    // Users can still play and their scores will be submitted when available
  }
}
```

</details>

## displayLeaderboard()

<details><summary>📁 public/js/game.js (continued)</summary>

```js
displayLeaderboard(leaderboard) {
   // === DOM ELEMENT RETRIEVAL ===
   // Find the HTML element where we'll display the leaderboard entries
   // This element should exist in the HTML with id="leaderboardList"
   const leaderboardElement = document.getElementById("leaderboardList");
   
   // === SAFETY CHECK AND DATA VALIDATION ===
   // Only proceed if both conditions are true:
   // 1. leaderboardElement exists in the DOM (prevents null reference errors)
   // 2. leaderboard data was provided and is not null/undefined
   if (leaderboardElement && leaderboard) {
     
     // === DYNAMIC HTML GENERATION ===
     // Transform the leaderboard array into HTML string using map() method
     // Each entry object contains: { rank, playerName, score, ... }
     leaderboardElement.innerHTML = leaderboard.map((entry) => `
       <div class="leaderboard-entry">
         <span class="rank">#${entry.rank}</span>
         <span class="name">${entry.playerName}</span>
         <span class="hscore">${entry.score}</span>
       </div>
     `).join("");
     
     // How this works:
     // 1. leaderboard.map() creates a new array of HTML strings
     // 2. Template literals (backticks) allow embedded variables with ${}
     // 3. .join("") converts the array of strings into one continuous HTML string
     // 4. innerHTML replaces the element's content with the generated HTML
     
     // Note: This approach completely replaces existing content each time
     // Alternative approaches could append or update individual entries
   }
   // Note: If element doesn't exist or no data provided, method silently returns
   // This prevents errors and allows the game to continue functioning
 }
```

## showPlayerNamePrompt()

<details><summary>📁 public/js/game.js (continued)</summary>

```js
showPlayerNamePrompt() {
  // === DEBUG LOGGING ===
  // Log current player name state for debugging and development tracking
  console.log(`🎮 Checking player name... Current: "${this.playerName}"`);
  
  // === PLAYER NAME VALIDATION ===
  // Check if player needs to enter a name for leaderboard tracking
  // Conditions that trigger name prompt:
  // 1. this.playerName is null or undefined (!this.playerName)
  // 2. playerName is an empty string ("")
  // 3. playerName is the string "null" (from corrupted localStorage)
  if (
    !this.playerName || this.playerName === "" || this.playerName === "null"
  ) {
    console.log("🎮 No player name found, showing prompt...");
    
    // === DELAYED MODAL DISPLAY ===
    // Use setTimeout to ensure the game UI has finished loading
    // 1000ms delay prevents modal from appearing before page is ready
    setTimeout(() => {
      // === PRIMARY METHOD: MODAL INTERFACE ===
      // Try to find the player name modal in the DOM
      const modal = document.getElementById("playerModal");
      
      if (modal) {
        console.log("🎮 Opening player modal...");
        
        // Open the modal using global function (defined elsewhere in the code)
        window.openModal("playerModal");
        
        // === INPUT FIELD SETUP ===
        // Find the text input field where user will type their name
        const input = document.getElementById("playerNameInput");
        
        if (input) {
          // Automatically focus the input so user can start typing immediately
          // Improves user experience by eliminating extra clicks
          input.focus();
          
          // === EVENT LISTENER MANAGEMENT ===
          // Clean up any existing keypress listeners to prevent duplicates
          // This is important when the method might be called multiple times
          input.removeEventListener("keypress", this.handlePlayerNameEnter);
          
          // Add new keypress listener to handle Enter key submission
          // this.handlePlayerNameEnter should be defined elsewhere to save the name
          input.addEventListener("keypress", this.handlePlayerNameEnter);
        }
      } else {
        // === FALLBACK METHOD: BROWSER PROMPT ===
        console.log("🎮 Modal not found, using prompt fallback...");
        
        // If modal element doesn't exist in DOM, use browser's built-in prompt
        // This ensures the feature works even if the modal HTML is missing
        const name = prompt("Enter your name for the leaderboard:");
        
        // === NAME VALIDATION AND SAVING ===
        // Only save the name if user provided valid input
        // name.trim() removes leading/trailing whitespace
        if (name && name.trim()) {
          // Call method to save the cleaned name (defined elsewhere)
          this.setPlayerName(name.trim());
        }
        // Note: If user cancels prompt or enters empty string, nothing happens
      }
    }, 1000);
  } else {
    // === PLAYER NAME EXISTS ===
    // Player already has a name, no prompt needed
    // Log confirmation for debugging purposes
    console.log(`🎮 Player name found: ${this.playerName}`);
  }
}
```

</details>

### submitScoreToDatabase()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
async submitScoreToDatabase(gameDuration) {
  // === PLAYER NAME VALIDATION ===
  // Only submit scores for players with names (prevents anonymous spam)
  if (!this.playerName) return;

  try {
    // === API SUBMISSION ===
    // Send POST request to scores API endpoint with game statistics
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: this.playerName,              // Player identification
        score: Math.floor(this.score),            // Final game score (rounded)
        obstaclesAvoided: this.obstaclesAvoided,  // Number of obstacles jumped over
        gameDuration: gameDuration,               // Total game time in seconds
        maxSpeed: this.maxSpeedReached,           // Peak speed achieved during game
      }),
    });

    // === RESPONSE PROCESSING ===
    if (response.ok) {
      const data = await response.json();
      
      // Check if this is a new global record
      if (data.isNewRecord) {
        console.log("🏆 NEW GLOBAL RECORD!");
        this.showNewRecordMessage();
      }
      
      // Log the player's global rank
      console.log(`📊 Score submitted! Global rank: #${data.globalRank}`);
      
      // Refresh leaderboard to show updated rankings
      this.loadGlobalLeaderboard();
    }
    
  } catch (error) {
    // === ERROR HANDLING ===
    // Network failures, server downtime, or JSON parsing errors
    // Game continues normally even if score submission fails
    console.error("Failed to submit score:", error);
  }
}
  setTimeout(() => recordMsg.remove(), 3000);
```

</details>

### showNewRecordMessage()

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
showNewRecordMessage() {
  // === NEW RECORD NOTIFICATION ===
  // Create a temporary DOM element to celebrate a new global record
  const recordMsg = document.createElement("div");
  recordMsg.className = "new-record-message";
  recordMsg.innerHTML = "🏆 NEW GLOBAL RECORD! 🏆";
  
  // Add to DOM and auto-remove after 3 seconds
  document.body.appendChild(recordMsg);
  setTimeout(() => recordMsg.remove(), 3000);
}
```

</details>

### handle and set player name

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
handlePlayerNameEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    window.savePlayerName();
  }
}

setPlayerName(name) {
  this.playerName = name;
  localStorage.setItem("playerName", name);
  this.loadPlayerSettings();
  console.log(`👤 Player name set: ${name}`);
}
```

</details>

## Global UI Functions

Now we need to add the global functions that handle the modal interactions. Add
these functions outside of the DinoGame class:

<details><summary>📁 public/js/game.js (continued)</summary>

```javascript
// === GLOBAL MODAL MANAGEMENT FUNCTIONS ===
// These functions are attached to the window object so they can be called from HTML onclick handlers

/**
 * Open a modal dialog by ID
 * Adds 'show' class and sets display style for proper modal display
 */
window.openModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
    modal.style.display = "flex";

    // Set focus to input if it's the player modal
    if (modalId === "playerModal") {
      setTimeout(() => {
        const input = document.getElementById("playerNameInput");
        if (input) {
          input.focus();
          input.select(); // Select any existing text
        }
      }, 100);
    }
  }
};

/**
 * Close a modal dialog by ID
 * Removes 'show' class and hides the modal
 */
window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
  }
};

/**
 * Save player name from the modal input field
 * Called when user clicks "Save & Play" button
 */
window.savePlayerName = function () {
  const input = document.getElementById("playerNameInput");
  const playerName = input?.value.trim();

  if (playerName && playerName.length > 0 && playerName.length <= 20) {
    localStorage.setItem("playerName", playerName);
    const playerDisplay = document.getElementById("playerNameDisplay");
    if (playerDisplay) {
      playerDisplay.textContent = playerName;
    }
    if (window.dinoGame) {
      window.dinoGame.setPlayerName(playerName);
    }
    window.closeModal("playerModal");
    console.log(`✅ Player name saved: ${playerName}`);
  } else if (!playerName || playerName.length === 0) {
    alert("Please enter a name");
  } else {
    alert("Please enter a valid name (1-20 characters)");
  }
};

/**
 * Open the customization modal and populate current settings
 */
window.openCustomization = function () {
  // Populate the form with current settings
  if (window.game) {
    const settings = window.game.settings;

    // Set current values in the form inputs
    const colorPicker = document.getElementById("dinoColorPicker");
    const themeSelect = document.getElementById("backgroundTheme");
    const difficultySelect = document.getElementById("difficultyPreference");

    if (colorPicker) colorPicker.value = settings.dinoColor;
    if (themeSelect) themeSelect.value = settings.backgroundTheme;
    if (difficultySelect) {
      difficultySelect.value = settings.difficultyPreference;
    }
  }

  window.openModal("customizationModal");
};

/**
 * Save customization settings from the modal form
 */
window.saveCustomization = function () {
  if (!window.game) return;

  // Get values from form inputs
  const colorPicker = document.getElementById("dinoColorPicker");
  const themeSelect = document.getElementById("backgroundTheme");
  const difficultySelect = document.getElementById("difficultyPreference");

  // Update game settings
  window.game.settings.dinoColor = colorPicker?.value || "#4CAF50";
  window.game.settings.backgroundTheme = themeSelect?.value || "desert";
  window.game.settings.difficultyPreference = difficultySelect?.value ||
    "normal";

  // Apply the changes immediately
  window.game.applyCustomizations();

  // Save to database/localStorage
  window.game.savePlayerSettings();

  // Close the modal
  window.closeModal("customizationModal");

  console.log("🎨 Customization saved:", window.game.settings);
};

/**
 * Load and display global leaderboard (for leaderboard page)
 */
window.loadLeaderboard = async function () {
  try {
    const response = await fetch("/api/leaderboard?limit=20");
    if (response.ok) {
      const data = await response.json();
      window.displayFullLeaderboard(data.leaderboard);
    }
  } catch (error) {
    console.error("Failed to load full leaderboard:", error);
  }
};

/**
 * Display full leaderboard on dedicated leaderboard page
 */
window.displayFullLeaderboard = function (leaderboard) {
  const container = document.getElementById("leaderboard-content");
  if (!container || !leaderboard) return;

  const html = `
    <div class="leaderboard-table">
      <div class="leaderboard-header">
        <span>Rank</span>
        <span>Player</span>
        <span>Score</span>
        <span>Date</span>
      </div>
      ${
    leaderboard.map((entry) => `
        <div class="leaderboard-row">
          <span class="rank">#${entry.rank}</span>
          <span class="player">${entry.playerName}</span>
          <span class="score">${entry.score.toLocaleString()}</span>
          <span class="date">${new Date(entry.date).toLocaleDateString()}</span>
        </div>
      `).join("")
  }
    </div>
  `;

  container.innerHTML = html;

  // Update last updated time
  const lastUpdated = document.getElementById("last-updated");
  if (lastUpdated) {
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }
};

/**
 * Refresh leaderboard data (for leaderboard page)
 */
window.refreshLeaderboard = function () {
  const container = document.getElementById("leaderboard-content");
  if (container) {
    container.innerHTML =
      '<div class="loading">🔄 Refreshing leaderboard...</div>';
  }
  window.loadLeaderboard();
};
```

</details>

## Adding a database to Deno Deploy

Once you have set up your database, you can integrate it with your Deno Deploy
application. In your [Deno Deploy dashboard](https://app.deno.com/), click the
"Databases" tab and then "**+ Add Database**".

<img width="256" height="640" alt="Deno Deploy add database" src="https://github.com/user-attachments/assets/28a4ac6a-2054-4f44-b043-13c335051eff" />

Add your database connection string to the form, and Deno Deploy will
automatically configure the environment variables for your application. You can
also manually add the Slug, Credentials and Port if needed. You do not need to
include a PEM certificate for this example.

Once you have added the database details, you can test the connection and save
it. Then you can assign the database to your application.

## Testing your complete application

1. **Start the server**:
   ```bash
   deno task dev
   ```

2. **Test database integration**:

- Submit a high score and verify it appears in the leaderboard
- Customize your dino and verify settings persist after refresh
- Check the browser console for database operation logs

3. **Test the leaderboard**:

- Play multiple games with different scores
- Verify ranking is correct
- Test the full leaderboard modal

4. **Test customization**:

- Change dino colors and themes
- Verify changes persist across browser sessions
- Test form validation for invalid inputs

5. **Test error handling**:

- Temporarily disconnect from the database
- Verify graceful degradation and error messages

## Deploy your finished app

Commit and push your changes to GitHub, and Deno Deploy will automatically
deploy your application with the new features. You can also manually deploy your
application from the Deno Deploy dashboard.

## Learning objectives completed

After completing Stage 4, you should understand:

- [x] **Database Design**: Relational schema design with tables, keys, and
      relationships
- [x] **SQL Operations**: Creating, reading, updating data with PostgreSQL
- [x] **API Development**: RESTful endpoints with proper error handling
- [x] **Connection Management**: Database pooling and resource optimization
- [x] **Data Persistence**: Multiple storage layers and their appropriate uses
- [x] **Full-Stack Integration**: Connecting frontend JavaScript with backend
      APIs
- [x] **Production Deployment**: Environment configuration and database hosting

## Congratulations! 🎉

You've built a complete, professional-grade game with:

- Interactive gameplay with realistic physics
- Database-backed global leaderboards
- Player customization with persistent settings
- Modern web technologies and best practices
- Production-ready architecture

You've learned fundamental concepts that apply to any web application:

- **Frontend Development**: HTML5 Canvas, JavaScript, responsive design
- **Backend Development**: Server APIs, database integration, middleware
- **Database Management**: Schema design, SQL queries, connection pooling
- **Full-Stack Architecture**: Client-server communication, state management

Your Dino Runner game demonstrates real-world development skills and patterns
used in professional software development. You can extend this foundation to
build even more complex applications!

## Next steps

Consider enhancing your game further with:

- User authentication and accounts
- Real-time multiplayer features
- Advanced analytics and reporting
- Mobile app versions
- Social features and sharing
- Power-ups and special abilities

Keep building and learning! 🚀🦕
