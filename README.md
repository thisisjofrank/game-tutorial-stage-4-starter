# 🦕 Dino Runner Game - Stage 4 Starter

Welcome to Stage 4! Building on your complete Stage 3 game, you'll now add
database integration and add a global leaderboard.

Building on Stage 3's complete game, you'll add:

- 🗄️ SQLite database integration for persistent data
- 🌍 Global leaderboard system with user rankings
- 🎨 Player customization options

## Getting started

### Prerequisites

- **Completed Stage 3** - You should have a working game with obstacles,
  collision detection, and local high scores
- Your Stage 3 project files (we'll build upon them)
- [Deno](https://deno.com/) installed on your system
- A code editor (VS Code recommended)
- Basic understanding of databases and SQL

### Add dependencies for database support

We will install the PostgreSQL driver for Deno to handle database operations.

```bash
deno add npm:pg
```

This will update your `deno.json` to include database dependencies:

<details>
<summary>🔄 Enhanced deno.json (click to expand)</summary>

```json
{
  "tasks": {
    "dev": "deno run --allow-net --allow-read --allow-env --env-file --watch src/main.ts",
    "start": "deno run --allow-net --allow-read --allow-env src/main.ts"
  },
  "imports": {
    "@oak/oak": "jsr:@oak/oak@17",
    "npm:pg": "npm:pg@^8.11.0"
  }
}
```

</details>

### Create a PostgreSQL database with Neon

1. Sign up for a Neon account at [neon.tech](https://neon.tech).
2. Create a new project with a user and copy the database connection string.

## Update .env file

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

## Step-by-Step Implementation

Now let's build Stage 4! We'll transform your local Stage 3 game into a
multiplayer experience with persistent data storage. Think of this as upgrading
from a single-player arcade machine to an online gaming platform where players
from around the world can compete.

### Step 1: Understanding Database Design

Before we write any code, let's understand what we're building. In Stage 3, your
high scores disappeared when you refreshed the page. Now we want to:

1. **Store player information** - usernames, settings, when they joined
2. **Save all high scores** - not just the current player's best score
3. **Track game statistics** - how long games last, obstacles avoided, etc.
4. **Remember player preferences** - custom colors, themes, difficulty settings

We'll use **PostgreSQL** (a powerful database) instead of simple browser storage
because:

- It can handle multiple players simultaneously
- Data persists even if the server restarts
- We can run complex queries (like "show me the top 10 players")
- It's what real web applications use

#### Step 1.1: Design the Database Schema

Think of a database schema like the blueprint for organizing your data. We need
four "tables" (like spreadsheets):

Create `src/database/schema.sql`:

<details>
<summary>📄 src/database/schema.sql (click to expand)</summary>

```sql
-- Stage 4: Database schema for Dino Runner Game

-- Players table for user accounts
-- This is like a "membership registry" for our game
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,              -- Auto-incrementing unique ID (like a player number)
  username VARCHAR(50) UNIQUE NOT NULL, -- Player's chosen name (must be unique!)
  email VARCHAR(100) UNIQUE,          -- Optional email for future features
  avatar_url TEXT,                    -- Optional profile picture URL
  created_at TIMESTAMP DEFAULT NOW(), -- When they first joined
  updated_at TIMESTAMP DEFAULT NOW()  -- Last time they updated their profile
);

-- High scores table for global leaderboard
-- This stores EVERY game score, not just the best ones
CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,              -- Unique ID for each score entry
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE, -- Links to players table
  player_name VARCHAR(50) NOT NULL,   -- Store name directly for anonymous players
  score INTEGER NOT NULL,             -- The actual score achieved
  obstacles_avoided INTEGER DEFAULT 0, -- How many cacti they jumped over
  game_duration_seconds INTEGER DEFAULT 0, -- How long the game lasted
  max_speed_reached DECIMAL(5,2) DEFAULT 0, -- Fastest speed during the game
  created_at TIMESTAMP DEFAULT NOW()  -- When this score was achieved
);

-- Player customization settings
-- Remember each player's preferred colors, themes, etc.
CREATE TABLE IF NOT EXISTS player_settings (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE, -- Links to specific player
  dino_color VARCHAR(7) DEFAULT '#4CAF50',     -- Hex color code (like #FF0000 for red)
  background_theme VARCHAR(20) DEFAULT 'desert', -- Theme name: desert, forest, etc.
  sound_enabled BOOLEAN DEFAULT true,          -- Whether they want sound effects
  difficulty_preference VARCHAR(20) DEFAULT 'normal', -- easy, normal, or hard
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id)                            -- Each player can only have one settings row
);

-- Game sessions for analytics (optional - for future features)
-- Track detailed info about each game played
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Random unique ID
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  final_score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER NOT NULL,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  session_data JSONB,                          -- Extra data as JSON (very flexible!)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
-- These make database queries faster (like an index in a book)
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_high_scores_created_at ON high_scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Sample data for development
-- Let's add some fake players and scores so we have data to work with
INSERT INTO players (username, email) VALUES 
  ('DinoMaster', 'dinomaster@example.com'),
  ('CactusJumper', 'cactus@example.com'),
  ('SpeedRunner', 'speed@example.com')
ON CONFLICT (username) DO NOTHING; -- Don't add duplicates if they already exist

INSERT INTO high_scores (player_name, score, obstacles_avoided) VALUES 
  ('DinoMaster', 120, 12),
  ('CactusJumper', 95, 9),
  ('SpeedRunner', 150, 15),
  ('Anonymous', 75, 7),
  ('ProGamer', 200, 20)
ON CONFLICT DO NOTHING;
```

What's in this code?

- **SERIAL PRIMARY KEY**: Creates auto-incrementing IDs (1, 2, 3, ...)
- **REFERENCES**: Creates relationships between tables (foreign keys)
- **UNIQUE**: Ensures no duplicate usernames or emails
- **DEFAULT**: Sets automatic values when no value is provided
- **VARCHAR(50)**: Text field with maximum length of 50 characters
- **TIMESTAMP**: Stores date and time
- **BOOLEAN**: True/false values
- **JSONB**: Stores flexible JSON data (great for future features!)

The tables work together: a player has settings and can have many high scores,
but each score belongs to one player.

</details>

#### Step 1.2: Create Database Connection Pool

Now we need to create a "connection pool" - think of it like a phone system that
manages multiple conversations with the database at once. Instead of opening a
new connection for every request (which is slow), we keep a few connections
ready to use.

Create `src/database/connection.ts`:

<details>
<summary>📄 src/database/connection.ts (click to expand)</summary>

```typescript
import { Pool } from "npm:pg";

// A global variable to store our connection pool, '| null' means it can be empty initially
let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (!pool) {
    // Try to use DATABASE_URL first (for Neon and other cloud providers)
    const databaseUrl = Deno.env.get("DATABASE_URL");

    if (databaseUrl) {
      // This is the simplest case - we have a complete connection string
      console.log("🔧 Using DATABASE_URL for connection pool");
      pool = new Pool({
        connectionString: databaseUrl, // e.g., "postgresql://user:pass@host:5432/dbname"
        max: 10, // Keep 10 connections ready (adjust based on traffic)
      });
    } else {
      // Check if Deno Deploy standard PostgreSQL environment variables are available
      const pgHost = Deno.env.get("PGHOST");
      const pgUser = Deno.env.get("PGUSER");

      if (pgHost && pgUser) {
        // Deno Deploy automatically sets these standard PostgreSQL env vars
        console.log("🔧 Using Deno Deploy PostgreSQL environment variables");
        const pgPassword = Deno.env.get("PGPASSWORD");
        pool = new Pool({
          host: pgHost, // e.g., "localhost" or "my-db.neon.tech"
          user: pgUser, // e.g., "postgres" or "myuser"
          password: pgPassword || undefined, // Use undefined instead of empty string
          database: Deno.env.get("PGDATABASE") || "postgres", // Database name
          port: parseInt(Deno.env.get("PGPORT") || "5432"), // PostgreSQL default port
          max: 10,
        });
      } else {
        // Fallback to custom environment variables for local development
        console.log(
          "🔧 Using custom DB environment variables (local development)",
        );
        const password = Deno.env.get("DB_PASSWORD");
        pool = new Pool({
          host: Deno.env.get("DB_HOST") || "localhost",
          port: parseInt(Deno.env.get("DB_PORT") || "5432"),
          database: Deno.env.get("DB_NAME") || "dino_runner",
          user: Deno.env.get("DB_USER") || "postgres",
          password: password || undefined, // Use undefined instead of empty string
          max: 10,
        });
      }
    }

    console.log("🗄️ Database pool created successfully");
  }

  return pool; // Return the existing pool (don't create multiple!)
}

// Function to clean up connections when shutting down
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end(); // Close all connections gracefully
    pool = null; // Reset the variable
    console.log("🗄️ Database pool closed");
  }
}
```

What's in this code?

- **Connection Pool**: Instead of opening/closing database connections for each
  request, we maintain a "pool" of ready connections.
- **Singleton Pattern**: We only create one pool and reuse it. Creating multiple
  pools would waste resources.
- **Error Handling**: If the environment variables aren't set, it falls back to
  defaults that work for local development.

</details>

#### Step 1.3: Database Migrations (Setting Up Tables)

"Migrations" are scripts that create or modify database tables. Think of them as
assembly instructions for your database - they transform your empty database
into one with all the tables and data your app needs.

Create `src/database/migrations.ts`:

<details>
<summary>📄 src/database/migrations.ts (click to expand)</summary>

```typescript
import { getDatabase } from "./connection.ts";

export async function initializeDatabase(): Promise<void> {
  // Get our connection pool (which we created in connection.ts)
  const pool = getDatabase();

  console.log("🚀 Initializing database schema...");

  // Read our SQL schema file (the one we created earlier)
  const schema = await Deno.readTextFile("./src/database/schema.sql");

  // Get a single connection from the pool to run our schema
  const client = await pool.connect();
  try {
    // Execute the entire schema file as one big SQL command
    // This creates all our tables, indexes, and sample data
    await client.query(schema);
    console.log("✅ Database schema initialized successfully");
  } finally {
    // ALWAYS release the connection back to the pool when done
    // This is crucial - forgetting this will "leak" connections
    client.release();
  }
}

export function runMigrations(): void {
  // Future migrations can be added here
  // For example: "ADD COLUMN avatar_style to player_settings"
  console.log("📦 No pending migrations");
}
```

What's in this code?

- **Reading Files**: `Deno.readTextFile()` loads our SQL schema from the file
  system
- **Connection Management**: We get a connection from the pool, use it, then
  ALWAYS release it back
- **Error Handling**: The `try/finally` block ensures we release connections
  even if something goes wrong
- **Async/Await**: Database operations take time, so we use `async/await` to
  wait for them to complete
- **Future-Proofing**: The `runMigrations()` function is ready for future
  database changes

</details>

### Step 2: Database Middleware (Making the Database Available to Routes)

Middleware is code that runs between receiving a request and sending a response.
It allows us to add functionality to our application without cluttering our
route handlers. In this case, we'll create middleware that connects to the
database and makes it available to all API routes.

Our database middleware will "attach" the database connection to every request,
so our API routes can easily access the database.

Create `src/middleware/database.ts`:

<details>
<summary>📄 src/middleware/database.ts (click to expand)</summary>

```typescript
import { Context } from "@oak/oak";
import { getDatabase } from "../database/connection.ts";

export async function databaseMiddleware(
  ctx: Context, // The request/response object
  next: () => Promise<unknown>, // The next function to call
): Promise<void> {
  try {
    // Attach database pool to the request context
    // Now any route can access the database with: ctx.state.db
    ctx.state.db = getDatabase();

    // Continue to the next middleware or route handler
    await next();
  } catch (error) {
    // If something goes wrong with the database connection, send an error response
    console.error("❌ Database middleware error:", error);
    ctx.response.status = 500; // Internal Server Error
    ctx.response.body = {
      error: "Database connection failed",
      message: "Please try again later",
    };
  }
}
```

What's in this code?

- **Middleware Pattern**: This function runs for EVERY request before it reaches
  our routes
- **Context State**: `ctx.state` is like a backpack that travels with each
  request - we're putting the database in the backpack
- **Error Handling**: If the database is down, we catch the error and send a
  helpful response instead of crashing
- **Separation of Concerns**: Routes don't need to worry about getting database
  connections - the middleware handles it

</details>

### Step 3: API Routes for Leaderboard (The Brain of Our Global Ranking System)

Now we'll create the API endpoints that handle leaderboard operations:

1. `GET /api/leaderboard` - Show top players
2. `POST /api/scores` - Submit a new score
3. `GET /api/scores/:playerName` - Get a player's personal best scores

Create `src/routes/leaderboard.routes.ts`:

<details>
<summary>📄 src/routes/leaderboard.routes.ts (click to expand)</summary>

```typescript
import { Router } from "@oak/oak";
import type { Context } from "@oak/oak";

// Create a new router to group our leaderboard-related routes
const router = new Router();

// 🏆 GET /api/leaderboard - Show the global leaderboard
router.get("/api/leaderboard", async (ctx: Context) => {
  try {
    // Get the database pool from our middleware
    const pool = ctx.state.db;

    // Check if client wants a specific number of results (default: 10)
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");

    // Get a connection from the pool
    const client = await pool.connect();
    try {
      // Complex SQL query that joins high_scores with players table
      const result = await client.query(
        `
        SELECT 
          hs.player_name,          -- The name used when submitting the score
          hs.score,                -- The actual score
          hs.obstacles_avoided,    -- How many obstacles they jumped
          hs.created_at,           -- When this score was achieved
          p.username,              -- Their registered username (if they have one)
          p.avatar_url             -- Profile picture (for future features)
        FROM high_scores hs        -- Start with the high_scores table
        LEFT JOIN players p ON hs.player_id = p.id  -- Connect to players table (if they're registered)
        ORDER BY hs.score DESC     -- Sort by score (highest first)
        LIMIT $1                   -- Only return the requested number of results
      `,
        [limit], // This replaces $1 in the query (prevents SQL injection!)
      );

      // Transform the database result into a nice JSON response
      ctx.response.body = {
        success: true,
        leaderboard: result.rows.map((row: any, index: number) => ({
          rank: index + 1, // Calculate rank (1st, 2nd, 3rd...)
          playerName: row.username || row.player_name, // Use registered name or the name they submitted
          score: Number(row.score), // Convert to regular number
          obstaclesAvoided: Number(row.obstacles_avoided || 0),
          avatarUrl: row.avatar_url, // Profile picture URL
          date: row.created_at, // When the score was achieved
        })),
      };
    } finally {
      client.release(); // ALWAYS release the connection back to the pool!
    }
  } catch (error) {
    // If anything goes wrong, log it and send an error response
    console.error("❌ Error fetching leaderboard:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch leaderboard",
    };
  }
});

// 📝 POST /api/scores - Submit a new high score
router.post("/api/scores", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;

    // Extract the JSON data from the request body
    const body = await ctx.request.body.json();
    const {
      playerName,
      score,
      obstaclesAvoided = 0, // Default to 0 if not provided
      gameDuration = 0,
      maxSpeed = 0,
    } = body;

    // Validate the input data
    if (!playerName || typeof score !== "number" || score < 0) {
      ctx.response.status = 400; // Bad Request
      ctx.response.body = {
        success: false,
        error: "Invalid player name or score",
      };
      return;
    }

    let rank: number;
    let insertedScore: any;

    const client = await pool.connect();
    try {
      // Insert the new score into the database
      const result = await client.query(
        `
        INSERT INTO high_scores (
          player_name, 
          score, 
          obstacles_avoided, 
          game_duration_seconds,
          max_speed_reached
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING *                    -- Return the inserted row
      `,
        [playerName, score, obstaclesAvoided, gameDuration, maxSpeed],
      );

      // Calculate what rank this score achieved
      const rankResult = await client.query(
        `
        SELECT COUNT(*) + 1 as rank 
        FROM high_scores 
        WHERE score > $1              -- Count how many scores are higher
      `,
        [score],
      );

      rank = Number(rankResult.rows[0]?.rank) || 1;
      insertedScore = result.rows[0];
    } finally {
      client.release();
    }

    // Convert BigInt values to regular numbers for JSON serialization
    const sanitizedScore = {
      ...insertedScore,
      id: Number(insertedScore.id),
      score: Number(insertedScore.score),
      obstacles_avoided: Number(insertedScore.obstacles_avoided || 0),
      game_duration_seconds: Number(insertedScore.game_duration_seconds || 0),
      max_speed_reached: Number(insertedScore.max_speed_reached || 0),
    };

    ctx.response.body = {
      success: true,
      score: sanitizedScore,
      globalRank: rank,
      isNewRecord: rank === 1, // Are they the new champion?
    };

    console.log(
      `🏆 New high score: ${playerName} scored ${score} (Rank #${rank})`,
    );
  } catch (error) {
    console.error("❌ Error submitting score:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to submit score",
    };
  }
});

// 👤 GET /api/scores/:playerName - Get a player's personal best scores
router.get("/api/scores/:playerName", async (ctx: Context) => {
  try {
    const pool = ctx.state.db;

    // Extract the player name from the URL path
    const playerName = ctx.request.url.pathname.split("/").pop();

    const client = await pool.connect();
    try {
      // Get the player's top 5 scores
      const result = await client.query(
        `
        SELECT score, obstacles_avoided, created_at
        FROM high_scores
        WHERE player_name = $1        -- Only this player's scores
        ORDER BY score DESC           -- Highest scores first
        LIMIT 5                       -- Top 5 only
      `,
        [playerName],
      );

      ctx.response.body = {
        success: true,
        playerName,
        personalBests: result.rows.map((row: any) => ({
          score: Number(row.score),
          obstaclesAvoided: Number(row.obstacles_avoided || 0),
          created_at: row.created_at,
        })),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error fetching player scores:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: "Failed to fetch player scores",
    };
  }
});

// Export the router so we can use it in main.ts
export { router as leaderboardRoutes };
```

What's in this code?

- **SQL Joins**: The leaderboard query combines data from two tables using
  `LEFT JOIN`
- **Query Parameters**: We read `?limit=20` from the URL to customize results
- **Input Validation**: We check that the score is valid before saving it
- **SQL Injection Prevention**: Using `$1, $2` placeholders instead of string
  concatenation
- **Rank Calculation**: We count how many scores are higher to determine rank
- **Error Handling**: Each route has try/catch blocks to handle database errors
  gracefully
- **Data Transformation**: Converting database results into clean JSON responses

</details>

### Step 4: Customization API Routes (Let Players Make the Game Their Own)

Now we'll create routes that let players customize their game experience. Think
of this like the settings menu in any modern game - players can choose colors,
themes, difficulty, etc.

**What we're building:**

- `GET /api/customization/:playerName` - Load a player's saved preferences
- `POST /api/customization` - Save new customization settings
- `GET /api/customization/options` - Get all available customization choices

The tricky part here is handling both **registered players** (who have accounts)
and **anonymous players** (who just want to play). We'll store settings in the
database for registered players, and use localStorage for anonymous ones.

Create `src/routes/customization.routes.ts`:

<details>
<summary>📄 src/routes/customization.routes.ts (click to expand)</summary>

```typescript
import { Router } from "@oak/oak";
import type { RouterContext } from "@oak/oak";

const router = new Router();

// Get player customization settings
router.get(
  "/api/customization/:playerName",
  async (ctx: RouterContext<"/api/customization/:playerName">) => {
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
        } else {
          // Check localStorage-style settings for anonymous players
          const anonSettings = ctx.request.url.searchParams.get("settings");
          if (anonSettings) {
            try {
              settings = { ...settings, ...JSON.parse(anonSettings) };
            } catch {
              // Use defaults if parsing fails
            }
          }
        }
      } finally {
        client.release();
      }

      ctx.response.body = {
        success: true,
        playerName,
        settings,
      };
    } catch (error) {
      console.error("❌ Error fetching customization:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Failed to fetch customization settings",
      };
    }
  },
);

// Save player customization settings
router.post(
  "/api/customization",
  async (ctx: RouterContext<"/api/customization">) => {
    try {
      const pool = ctx.state.db;
      const body = await ctx.request.body.json();
      const {
        playerName,
        dinoColor,
        backgroundTheme,
        soundEnabled,
        difficultyPreference,
      } = body;

      // Validate input
      const validThemes = ["desert", "forest", "night", "rainbow", "space"];

      if (!playerName || !dinoColor || !validThemes.includes(backgroundTheme)) {
        ctx.response.status = 400;
        ctx.response.body = {
          success: false,
          error: "Invalid customization data",
        };
        return;
      }

      const client = await pool.connect();
      try {
        // Create or find player
        const playerResult = await client.query(
          `
        INSERT INTO players (username) VALUES ($1)
        ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `,
          [playerName],
        );

        const playerId = Number(playerResult.rows[0].id);

        // Save settings
        await client.query(
          `
        INSERT INTO player_settings (
          player_id, 
          dino_color, 
          background_theme, 
          sound_enabled, 
          difficulty_preference
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (player_id) DO UPDATE SET
          dino_color = $2,
          background_theme = $3,
          sound_enabled = $4,
          difficulty_preference = $5,
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
      } finally {
        client.release();
      }

      ctx.response.body = {
        success: true,
        message: "Customization settings saved successfully",
      };

      console.log(
        `🎨 Customization saved for ${playerName}: ${backgroundTheme} theme, ${dinoColor} dino`,
      );
    } catch (error) {
      console.error("❌ Error saving customization:", error);
      ctx.response.status = 500;
      ctx.response.body = {
        success: false,
        error: "Failed to save customization settings",
      };
    }
  },
);

// Get available customization options
router.get(
  "/api/customization/options",
  async (ctx: RouterContext<"/api/customization/options">) => {
    ctx.response.body = {
      success: true,
      options: {
        themes: [
          {
            id: "desert",
            name: "🏜️ Desert",
            colors: { sky: "#87CEEB", ground: "#DEB887" },
          },
          {
            id: "forest",
            name: "🌲 Forest",
            colors: { sky: "#98FB98", ground: "#228B22" },
          },
          {
            id: "night",
            name: "🌙 Night",
            colors: { sky: "#191970", ground: "#2F4F4F" },
          },
          {
            id: "rainbow",
            name: "🌈 Rainbow",
            colors: { sky: "#FF69B4", ground: "#FFD700" },
          },
          {
            id: "space",
            name: "🚀 Space",
            colors: { sky: "#000000", ground: "#696969" },
          },
        ],
        dinoColors: [
          "#4CAF50",
          "#FF5722",
          "#2196F3",
          "#FF9800",
          "#9C27B0",
          "#F44336",
          "#00BCD4",
          "#795548",
        ],
        difficulties: [
          { id: "easy", name: "Easy", speedMultiplier: 0.8 },
          { id: "normal", name: "Normal", speedMultiplier: 1.0 },
          { id: "hard", name: "Hard", speedMultiplier: 1.3 },
        ],
      },
    };
  },
);

export { router as customizationRoutes };
```

</details>

### Step 5: Update Main Server File

Update your `src/main.ts` to include database initialization and the new API
routes:

<details>
<summary>📄 src/main.ts (click to expand)</summary>

```typescript
import { Application } from "jsr:@oak/oak/application";
import { apiRouter } from "./routes/api.routes.ts";
import { leaderboardRoutes } from "./routes/leaderboard.routes.ts";
import { customizationRoutes } from "./routes/customization.routes.ts";
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";
import { load } from "jsr:@std/dotenv";

// Load environment variables from root .env file
await load({ export: true, envPath: "../../.env" });

const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "localhost";

const app = new Application();

// Initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// CORS middleware for API requests
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

// Database middleware for API routes
app.use(databaseMiddleware);

// Serve static files from public directory
app.use(async (context, next) => {
  try {
    // Special route for leaderboard page
    if (context.request.url.pathname === "/leaderboard") {
      await context.send({
        root: `${Deno.cwd()}/public`,
        path: "leaderboard.html",
      });
      return;
    }

    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

// API routes
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

app.use(leaderboardRoutes.routes());
app.use(leaderboardRoutes.allowedMethods());

app.use(customizationRoutes.routes());
app.use(customizationRoutes.allowedMethods());

app.listen({
  port: PORT,
});

console.log(`🦕 Server is running on http://${HOST}:${PORT}`);
console.log(`🎯 Visit http://${HOST}:${PORT} to see the game`);
console.log(`🏆 Global Leaderboard at http://${HOST}:${PORT}/leaderboard`);
console.log(`🔧 API health check at http://${HOST}:${PORT}/api/health`);
console.log(`🏆 Leaderboard API at http://${HOST}:${PORT}/api/leaderboard`);
console.log(
  `🎨 Customization API at http://${HOST}:${PORT}/api/customization/options`,
);
```

</details>

### Step 6: Frontend Integration (Connecting Your Game to the Database)

Now for the exciting part - making your Stage 3 game talk to the database! This
is where we transform your single-player game into a connected, multiplayer
experience.

**The Big Picture:** Your game currently stores high scores in `localStorage`
(which only you can see). Now we'll:

1. **Ask for player names** when someone first plays
2. **Send scores to our database** when games end
3. **Load global leaderboards** to show worldwide competition
4. **Save custom themes/colors** so players can personalize their experience

#### Understanding the Frontend → Backend Flow

```text
Game Over → JavaScript collects score data → Sends HTTP POST to /api/scores → Database saves it → Updates global leaderboard
```

Let's update your `public/js/game.js` step by step:

#### Step 6.1: Add Database Integration Methods to Your Game Class

**Add these new methods to your existing DinoGame class** (don't replace your
whole file!):

```javascript
// 💾 Load player settings from database or localStorage  
async loadPlayerSettings() {
  try {
    if (this.playerName) {
      // If player has a name, try to load their settings from database
      console.log(`🔄 Loading settings for ${this.playerName}...`);
      const response = await fetch(`/api/customization/${this.playerName}`);
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings;
        this.applyCustomizations();
        console.log(`✅ Settings loaded for ${this.playerName}`);
      }
    } else {
      // For anonymous users, load from browser's localStorage
      const savedSettings = localStorage.getItem("gameSettings");
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        this.applyCustomizations();
        console.log("✅ Local settings loaded");
      }
    }
  } catch (error) {
    console.log("⚠️ Failed to load player settings:", error);
    // Not a big deal - we'll just use defaults
  }
}

// 🏆 Submit score to database (the most important new feature!)
async submitScoreToDatabase(gameDuration) {
  if (!this.playerName) {
    console.log("⚠️ No player name - score not submitted to database");
    return;
  }

  try {
    console.log(`📤 Submitting score for ${this.playerName}: ${Math.floor(this.score)}`);
    
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: this.playerName,
        score: Math.floor(this.score),
        obstaclesAvoided: this.obstaclesAvoided,
        gameDuration: gameDuration,
        maxSpeed: this.maxSpeedReached,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isNewRecord) {
        console.log("🏆 NEW GLOBAL RECORD!");
        this.showNewRecordMessage();
      }
      console.log(`📊 Score submitted! Global rank: #${data.globalRank}`);
      // Refresh the leaderboard to show the new score
      this.loadGlobalLeaderboard();
    } else {
      console.error("❌ Failed to submit score - server error");
    }
  } catch (error) {
    console.error("❌ Failed to submit score - network error:", error);
    // Game continues normally even if score submission fails
  }
}

// 🏅 Load global leaderboard (show top players worldwide)
async loadGlobalLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard?limit=5");
    if (response.ok) {
      const data = await response.json();
      this.displayLeaderboard(data.leaderboard);
      console.log("📊 Global leaderboard updated");
    }
  } catch (error) {
    console.log("⚠️ Failed to load global leaderboard:", error);
  }
}

// 🎨 Apply customization settings to the game
applyCustomizations() {
  // Apply difficulty multiplier to game speed
  const difficulties = { easy: 0.8, normal: 1.0, hard: 1.3 };
  const multiplier = difficulties[this.settings.difficultyPreference] || 1.0;
  this.initialGameSpeed = 3 * multiplier;
  this.gameSpeed = this.initialGameSpeed;

  console.log(`🎨 Applied customizations: ${this.settings.backgroundTheme} theme, ${this.settings.dinoColor} dino, ${this.settings.difficultyPreference} difficulty`);
}
```

#### Step 6.2: Update Your Existing Game Methods

**Modify your existing `gameOver()` method** to include database submission:

```javascript
// Update your existing gameOver method to include database submission
gameOver() {
  if (this.gameState === "gameOver") return;
  
  // Calculate how long the game lasted
  const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
  
  this.gameState = "gameOver";
  
  // 🆕 NEW: Submit to database (this is the big addition!)
  this.submitScoreToDatabase(gameDuration);
  
  // Keep existing local high score logic
  if (this.score > this.highScore) {
    this.highScore = this.score;
    this.saveHighScore(); // Your existing localStorage save
  }
  
  this.updateHighScore();
  this.updateStatus("Game Over! Click to restart");
}
```

**💡 What's happening here?**

- **Async/Await**: We use these keywords when talking to the server (database
  operations take time)
- **Error Handling**: If the database is down, the game still works - we just
  log the error
- **Fetch API**: This is how JavaScript talks to our backend routes
- **JSON**: We convert our game data to JSON format that the server can
  understand
- **Progressive Enhancement**: The game works offline, but gets better when
  connected to the database

```javascript
// Load player settings from database or localStorage
async loadPlayerSettings() {
  try {
    if (this.playerName) {
      const response = await fetch(`/api/customization/${this.playerName}`);
      if (response.ok) {
        const data = await response.json();
        this.settings = data.settings;
        this.applyCustomizations();
      }
    } else {
      // Load from localStorage for anonymous users
      const savedSettings = localStorage.getItem("gameSettings");
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        this.applyCustomizations();
      }
    }
  } catch (error) {
    console.log("Failed to load player settings:", error);
  }
}

// Submit score to database
async submitScoreToDatabase(gameDuration) {
  if (!this.playerName) return;

  try {
    const response = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: this.playerName,
        score: Math.floor(this.score),
        obstaclesAvoided: this.obstaclesAvoided,
        gameDuration: gameDuration,
        maxSpeed: this.maxSpeedReached,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isNewRecord) {
        console.log("🏆 NEW GLOBAL RECORD!");
        this.showNewRecordMessage();
      }
      console.log(`📊 Score submitted! Global rank: #${data.globalRank}`);
      // Refresh leaderboard
      this.loadGlobalLeaderboard();
    }
  } catch (error) {
    console.error("Failed to submit score:", error);
  }
}

// Load global leaderboard
async loadGlobalLeaderboard() {
  try {
    const response = await fetch("/api/leaderboard?limit=5");
    if (response.ok) {
      const data = await response.json();
      this.displayLeaderboard(data.leaderboard);
    }
  } catch (error) {
    console.log("Failed to load leaderboard:", error);
  }
}

// Apply customization settings
applyCustomizations() {
  // Apply difficulty multiplier
  const difficulties = { easy: 0.8, normal: 1.0, hard: 1.3 };
  this.initialGameSpeed = 3 * (difficulties[this.settings.difficultyPreference] || 1.0);
  this.gameSpeed = this.initialGameSpeed;

  // Background color changes are applied in the render method
  console.log(`🎨 Applied customizations: ${this.settings.backgroundTheme} theme, ${this.settings.dinoColor} dino`);
}

// Update your gameOver method to include database submission
gameOver() {
  if (this.gameState === "gameOver") return;
  
  const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
  
  this.gameState = "gameOver";
  
  // Submit to database
  this.submitScoreToDatabase(gameDuration);
  
  // Update local high score
  if (this.score > this.highScore) {
    this.highScore = this.score;
    this.saveHighScore();
  }
  
  this.updateHighScore();
  this.updateStatus("Game Over! Click to restart");
}

// Update your render method to use theme colors
render() {
  // Get theme colors
  const theme = this.themes[this.settings.backgroundTheme] || this.themes.desert;
  
  // Clear canvas with theme sky color
  this.ctx.fillStyle = theme.sky;
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

  // Draw ground with theme ground color
  this.ctx.fillStyle = theme.ground;
  this.ctx.fillRect(0, this.groundY, this.canvas.width, this.canvas.height - this.groundY);
  
  // ... rest of your render code
}

// Update your drawDino method to use custom color
drawDino() {
  // Use player's custom dino color
  this.ctx.fillStyle = this.settings.dinoColor;
  
  // ... rest of your dino drawing code
}
```

#### Add Player Name Modal

Add this HTML to your `public/index.html` before the closing `</body>` tag:

```html
<!-- Player Name Modal -->
<div id="playerModal" class="modal">
  <div class="modal-content">
    <h3>🎮 Enter Your Name</h3>
    <p>Join the global leaderboard!</p>
    <input
      type="text"
      id="playerNameInput"
      placeholder="Your name (1-20 characters)"
      maxlength="20"
      class="form-input"
    >
    <div class="modal-buttons">
      <button onclick="savePlayerName()" class="btn btn-primary">
        Save & Play 🦕
      </button>
    </div>
    <p class="small-text">Your name will be shown on the global leaderboard</p>
  </div>
</div>

<!-- Customization Modal -->
<div id="customizationModal" class="modal">
  <div class="modal-content">
    <h3>🎨 Customize Your Game</h3>

    <div class="form-group">
      <label for="dinoColorPicker">Dino Color:</label>
      <input
        type="color"
        id="dinoColorPicker"
        value="#4CAF50"
        class="color-picker"
      >
    </div>

    <div class="form-group">
      <label for="backgroundTheme">Background Theme:</label>
      <select id="backgroundTheme" class="form-select">
        <option value="desert">🏜️ Desert</option>
        <option value="forest">🌲 Forest</option>
        <option value="night">🌙 Night</option>
        <option value="rainbow">🌈 Rainbow</option>
        <option value="space">🚀 Space</option>
      </select>
    </div>

    <div class="form-group">
      <label for="difficultyPreference">Difficulty:</label>
      <select id="difficultyPreference" class="form-select">
        <option value="easy">😌 Easy (Slower)</option>
        <option value="normal">😐 Normal</option>
        <option value="hard">😤 Hard (Faster)</option>
      </select>
    </div>

    <div class="form-group">
      <label class="checkbox-label">
        <input type="checkbox" id="soundEnabled" checked>
        🔊 Enable Sound Effects
      </label>
    </div>

    <div class="modal-buttons">
      <button onclick="saveCustomization()" class="btn btn-primary">
        Save Settings ✅
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

#### Create Leaderboard Page

Create `public/leaderboard.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://demo-styles.deno.deno.net/styles.css">
    <link rel="stylesheet" href="css/styles.css">
    <title>Dino Runner - Global Leaderboard</title>
  </head>
  <body>
    <main class="leaderboard-container">
      <header>
        <h1>🏆 Global Leaderboard</h1>
        <p>Top players from around the world</p>
      </header>

      <nav>
        <a href="/" class="btn">🎮 Play Game</a>
        <button onclick="refreshLeaderboard()" class="btn btn-secondary">
          🔄 Refresh
        </button>
      </nav>

      <section class="leaderboard-section">
        <div class="leaderboard-list" id="leaderboardList">
          <div class="loading">Loading leaderboard...</div>
        </div>
      </section>

      <footer>
        <p>🦕 Dino Runner - Stage 4: Database Integration</p>
      </footer>
    </main>

    <script>
      // Load and display leaderboard
      async function loadLeaderboard() {
        try {
          const response = await fetch("/api/leaderboard?limit=50");
          if (response.ok) {
            const data = await response.json();
            displayLeaderboard(data.leaderboard);
          } else {
            displayError("Failed to load leaderboard");
          }
        } catch (error) {
          console.error("Error loading leaderboard:", error);
          displayError("Unable to connect to server");
        }
      }

      function displayLeaderboard(leaderboard) {
        const container = document.getElementById("leaderboardList");

        if (!leaderboard || leaderboard.length === 0) {
          container.innerHTML =
            '<div class="no-scores">No scores yet. Be the first!</div>';
          return;
        }

        const html = leaderboard.map((entry) => {
          let rankClass = "";
          if (entry.rank === 1) rankClass = "gold";
          else if (entry.rank === 2) rankClass = "silver";
          else if (entry.rank === 3) rankClass = "bronze";

          return `
          <div class="leaderboard-item">
            <div class="leaderboard-rank ${rankClass}">#${entry.rank}</div>
            <div class="leaderboard-name">${entry.playerName}</div>
            <div class="leaderboard-score">${entry.score.toLocaleString()}</div>
            <div class="leaderboard-obstacles">${
            entry.obstaclesAvoided || 0
          } obstacles</div>
            <div class="leaderboard-date">${
            new Date(entry.date).toLocaleDateString()
          }</div>
          </div>
        `;
        }).join("");

        container.innerHTML = html;
      }

      function displayError(message) {
        const container = document.getElementById("leaderboardList");
        container.innerHTML =
          `<div class="error-message">⚠️ ${message}</div>`;
      }

      function refreshLeaderboard() {
        document.getElementById("leaderboardList").innerHTML =
          '<div class="loading">Refreshing...</div>';
        loadLeaderboard();
      }

      // Load leaderboard when page loads
      document.addEventListener("DOMContentLoaded", loadLeaderboard);
    </script>
  </body>
</html>
```

### Step 7: Enhanced CSS Styles

Add these styles to your `public/css/styles.css` to support the new features:

```css
/* Modal Styles */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  animation: fadeIn 0.3s ease-in-out;
}

.modal.show {
  display: flex !important;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #fff;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  color: #333;
  margin-bottom: 20px;
}

.form-input {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.form-input:focus {
  border-color: #4caf50;
  outline: none;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

/* Customization Form Styles */
.form-group {
  margin: 15px 0;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-select {
  width: 100%;
  padding: 10px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
}

.color-picker {
  width: 60px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

/* Leaderboard Styles */
.leaderboard-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.leaderboard-section {
  background: #f9f9f9;
  border-radius: 15px;
  padding: 20px;
  margin: 20px 0;
}

.leaderboard-item {
  display: grid;
  grid-template-columns: 60px 1fr 100px 120px 120px;
  gap: 15px;
  align-items: center;
  padding: 12px;
  margin: 5px 0;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #ddd;
}

.leaderboard-rank {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  padding: 8px;
  border-radius: 50%;
  background: #f0f0f0;
  color: #666;
}

.leaderboard-rank.gold {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}

.leaderboard-rank.silver {
  background: linear-gradient(135deg, #c0c0c0, #808080);
  color: white;
  box-shadow: 0 2px 8px rgba(192, 192, 192, 0.3);
}

.leaderboard-rank.bronze {
  background: linear-gradient(135deg, #cd7f32, #a0522d);
  color: white;
  box-shadow: 0 2px 8px rgba(205, 127, 50, 0.3);
}

.leaderboard-name {
  font-weight: bold;
  color: #333;
}

.leaderboard-score {
  font-size: 18px;
  font-weight: bold;
  color: #4caf50;
  text-align: right;
}

.leaderboard-obstacles {
  color: #666;
  font-size: 14px;
  text-align: center;
}

.leaderboard-date {
  color: #999;
  font-size: 12px;
  text-align: right;
}

/* New Record Animation */
.new-record-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: white;
  padding: 20px 40px;
  border-radius: 15px;
  font-size: 24px;
  font-weight: bold;
  z-index: 1000;
  animation: newRecord 3s ease-in-out;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.5);
}

@keyframes newRecord {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

/* Loading and Error States */
.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

.error-message {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
  background: #fdf2f2;
  border-radius: 8px;
  border: 1px solid #f5c6cb;
}

.no-scores {
  text-align: center;
  padding: 40px;
  color: #999;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .leaderboard-item {
    grid-template-columns: 50px 1fr 80px;
    gap: 10px;
  }

  .leaderboard-obstacles,
  .leaderboard-date {
    display: none;
  }

  .modal-content {
    margin: 20px;
    padding: 20px;
  }

  .modal-buttons {
    flex-direction: column;
  }
}
```

## Running Your Stage 4 Game

### 1. Set Up Your Database

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** and copy your connection string
3. **Update your .env file** with the DATABASE_URL

### 2. Start the Development Server

```bash
deno task dev
```

Your game will be available at:

- **Main Game**: `http://localhost:8000`
- **Global Leaderboard**: `http://localhost:8000/leaderboard`
- **API Health Check**: `http://localhost:8000/api/health`

### 3. Test the Features

- **Play the game** and enter your name when prompted
- **Submit high scores** that get saved to the PostgreSQL database
- **View the global leaderboard** to see all players' scores
- **Customize your game** with different themes, colors, and difficulty
- **Check the console** for database connection and API logs

## Stage 4 Complete! 🎉

Congratulations! You've successfully built a complete multiplayer dino game
with:

✅ **PostgreSQL Database Integration** - Persistent data storage\
✅ **Global Leaderboard System** - Real-time player rankings\
✅ **Player Customization** - Themes, colors, and difficulty settings\
✅ **User Management** - Player names and persistent settings\
✅ **RESTful API** - Clean endpoints for all game features\
✅ **Responsive UI** - Modal dialogs and interactive elements

### What's Next?

Your game is now production-ready! Here are some ideas for further enhancements:

- **Authentication System** - Add proper user login/registration
- **Real-time Features** - WebSocket connections for live updates
- **Game Analytics** - Track detailed player behavior
- **Achievement System** - Unlock rewards for milestones
- **Social Features** - Friend lists and challenges
- **Mobile App** - Convert to a Progressive Web App (PWA)

### Deploy to Production

Your Stage 4 game is ready to deploy to [Deno Deploy](https://deno.com/deploy)
with your Neon PostgreSQL database!

## Troubleshooting

**Database Connection Issues:**

- Verify your DATABASE_URL in .env is correct
- Check that your Neon database is active
- Ensure your IP is whitelisted in Neon settings

**API Errors:**

- Check the server console for detailed error messages
- Verify all database tables were created successfully
- Test API endpoints directly in your browser

**Game Not Loading:**

- Check browser console for JavaScript errors
- Ensure all static files are being served correctly
- Verify the game initialization sequence
