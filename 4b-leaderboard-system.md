# 🏆 4B: Score Submission & Leaderboard

In this step, you'll add a complete leaderboard system! Players will be able to
submit their scores to the database and see how they rank against other players
worldwide.

## What you'll accomplish

- ✅ Extend database schema for high scores
- ✅ Create REST API endpoints for score submission and leaderboard retrieval
- ✅ Add score submission logic to the game engine
- ✅ Display a live leaderboard in the game interface
- ✅ Handle ranking and score validation
- ✅ **Deploy and test**: Scores appear on a live global leaderboard

## Prerequisites

- Completed [4A: Database Setup & Player Names](./4a-database-setup.md)
- Database connection working with player names

## Step 1: Extend database schema for scores

Update your `src/database/schema.sql` to include the high scores table:

```sql
-- Stage 4B: Extended schema with high scores table

-- Players table for user accounts (existing from 4A)
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NEW: High scores table for global leaderboard
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
-- NEW: Index for fast leaderboard queries (sorted by score descending)
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
```

**What's new:**

- **`high_scores` table**: Stores individual game scores with rich metadata
- **`player_id` reference**: Links scores to registered players (optional)
- **`player_name`**: Allows anonymous players to submit scores
- **Score metadata**: Tracks obstacles avoided, game duration, and max speed
- **Performance index**: Ensures fast leaderboard queries even with millions of
  scores

## Step 2: Update migrations with sample scores

Update `src/database/migrations.ts` to include sample high scores:

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

      // Insert sample players (existing from 4A)
      await client.query(`
        INSERT INTO players (username, email) VALUES 
        ('DinoMaster', 'dino@example.com'),
        ('JumpQueen', 'jump@example.com'),
        ('CactusDodger', 'dodge@example.com')
        ON CONFLICT (username) DO NOTHING
      `);

      // NEW: Insert sample high scores
      await client.query(`
        INSERT INTO high_scores (player_name, score, obstacles_avoided, game_duration_seconds) VALUES 
        ('DinoMaster', 1250, 25, 85),
        ('JumpQueen', 980, 18, 67),
        ('CactusDodger', 750, 12, 52),
        ('SpeedRunner', 2100, 42, 120),
        ('Anonymous', 650, 10, 38),
        ('GamePro', 1800, 35, 95),
        ('NightOwl', 420, 8, 29)
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

**Sample data benefits:**

- **Realistic leaderboard**: Players see an active leaderboard immediately
- **Testing scores**: You can test different score ranges and rankings
- **User motivation**: Seeing existing scores encourages players to compete

## Step 3: Create leaderboard API routes

Create `src/routes/leaderboard.routes.ts` for score-related API endpoints:

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
    const { playerName, score, obstaclesAvoided = 0, gameDuration = 0 } = body;

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
        INSERT INTO high_scores (player_name, score, obstacles_avoided, game_duration_seconds)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `,
        [
          playerName,
          Math.floor(score),
          Math.floor(obstaclesAvoided),
          Math.floor(gameDuration),
        ],
      );

      // Check global rank for this score
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

      console.log(
        `🏆 New score submitted: ${playerName} - ${score} (rank #${
          rankResult.rows[0].rank
        })`,
      );
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

**API design features:**

- **RESTful endpoints**: Standard HTTP methods and response formats
- **Input validation**: Ensures data integrity and prevents bad submissions
- **SQL injection protection**: Uses parameterized queries ($1, $2, etc.)
- **Real-time ranking**: Calculates player's global rank immediately
- **Flexible queries**: Supports different limits for leaderboard size
- **Error handling**: Graceful failures with helpful error messages

## Step 4: Register the leaderboard routes

Update `src/main.ts` to include the new leaderboard routes:

```typescript
import { Application } from "@oak/oak";
import { oakCors } from "@oak/oak/middlewares/cors";
import apiRoutes from "./routes/api.routes.ts";

// Database imports (from 4A)
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";

// NEW: Import leaderboard routes
import leaderboardRoutes from "./routes/leaderboard.routes.ts";

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "0.0.0.0";

// Initialize database on startup (from 4A)
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// Enable CORS for all routes
app.use(oakCors());

// Add database middleware for API routes (from 4A)
app.use(databaseMiddleware);

// API routes (existing)
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

// NEW: Add leaderboard routes
app.use(leaderboardRoutes.routes());
app.use(leaderboardRoutes.allowedMethods());

// Serve static files (existing)
app.use(async (context, next) => {
  try {
    await context.send({
      root: `${Deno.cwd()}/public`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

console.log(`🦕 Dino Runner Game server starting on http://${HOST}:${PORT}`);
console.log(`🎮 Game available at http://${HOST}:${PORT}`);
console.log(`🔌 API available at http://${HOST}:${PORT}/api`);

// NEW: Log leaderboard endpoints
console.log(`🏆 Leaderboard API at http://${HOST}:${PORT}/api/leaderboard`);
console.log(`🏆 Scores API at http://${HOST}:${PORT}/api/scores`);

await app.listen({ hostname: HOST, port: PORT });
```

## Step 5: Add leaderboard display to the game

Update your `public/index.html` to include a leaderboard section. Add this after
your game canvas:

```html
<!-- Existing game content... -->

<!-- NEW: Global Leaderboard Section -->
<section class="container">
  <h3>Global Leaderboard</h3>
  <div class="leaderboard-container">
    <div class="leaderboard-list" id="leaderboardList">
      <div class="loading">Loading leaderboard...</div>
    </div>
  </div>
</section>

<!-- Player Name Modal (existing from 4A) -->
<div class="modal" id="playerModal">
  <!-- ... existing modal content ... -->
</div>
```

## Step 6: Add leaderboard CSS styling

Add these styles to your `public/css/styles.css`:

```css
/* Existing modal styles from 4A... */

/* NEW: Leaderboard styling */
.leaderboard-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.leaderboard-entry:nth-child(1) {
  border-left-color: #ffd700; /* Gold for 1st place */
  background: #fffbf0;
}

.leaderboard-entry:nth-child(2) {
  border-left-color: #c0c0c0; /* Silver for 2nd place */
  background: #f8f8f8;
}

.leaderboard-entry:nth-child(3) {
  border-left-color: #cd7f32; /* Bronze for 3rd place */
  background: #fdf6f0;
}

.leaderboard-entry .rank {
  font-weight: bold;
  font-size: 18px;
  color: #333;
  min-width: 40px;
}

.leaderboard-entry .name {
  flex: 1;
  font-weight: 500;
  color: #555;
  margin-left: 15px;
}

.leaderboard-entry .hscore {
  font-weight: bold;
  font-size: 16px;
  color: #4caf50;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
```

**Styling features:**

- **Ranking colors**: Gold, silver, bronze for top 3 positions
- **Clean layout**: Flexbox for perfect alignment
- **Visual hierarchy**: Different font weights and colors for easy scanning
- **Loading state**: Shows feedback while leaderboard loads

## Step 7: Add leaderboard functionality to game

Update your `public/js/game.js` to include score submission and leaderboard
loading:

```javascript
class DinoGame {
  constructor() {
    // ... existing properties from 4A ...

    // NEW: Game tracking for leaderboard submissions
    this.obstaclesAvoided = 0;
    this.gameStartTime = 0;

    // ... rest of constructor ...
  }

  init() {
    // ... existing initialization from 4A ...

    // NEW: Load global leaderboard on game start
    this.loadGlobalLeaderboard();

    // ... rest of init ...
  }

  // NEW: Start game tracking
  startGame() {
    // ... existing startGame logic ...

    // Reset tracking variables
    this.obstaclesAvoided = 0;
    this.gameStartTime = Date.now();
  }

  // NEW: Update obstacle tracking
  updateObstacles() {
    // ... existing obstacle update logic ...

    // When removing obstacles that went off screen, count them
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];

      if (obstacle.x + obstacle.width < 0) {
        this.obstacles.splice(i, 1);
        this.obstaclesAvoided++; // Track for leaderboard submission
        this.score += 10;
      }
    }
  }

  // NEW: Game over with score submission
  async gameOver() {
    // ... existing game over logic ...

    // Calculate game duration and submit to leaderboard
    const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);
    await this.submitScoreToDatabase(gameDuration);
  }

  // NEW: Load and display global leaderboard
  async loadGlobalLeaderboard() {
    try {
      // Fetch top 5 scores from the leaderboard API
      const response = await fetch("/api/leaderboard?limit=5");

      if (response.ok) {
        const data = await response.json();
        this.displayLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.log("Failed to load leaderboard:", error);
      // Game continues without leaderboard - graceful degradation
    }
  }

  // NEW: Display leaderboard in the UI
  displayLeaderboard(leaderboard) {
    const leaderboardElement = document.getElementById("leaderboardList");

    if (leaderboardElement && leaderboard) {
      // Generate HTML for each leaderboard entry
      leaderboardElement.innerHTML = leaderboard.map((entry) => `
        <div class="leaderboard-entry">
          <span class="rank">#${entry.rank}</span>
          <span class="name">${entry.playerName}</span>
          <span class="hscore">${entry.score}</span>
        </div>
      `).join("");
    }
  }

  // NEW: Submit score to database
  async submitScoreToDatabase(gameDuration) {
    // Only submit scores for players with names
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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Score submitted! Global rank: #${data.rank}`);

        // Refresh leaderboard to show updated rankings
        this.loadGlobalLeaderboard();
      }
    } catch (error) {
      console.error("Failed to submit score:", error);
      // Game continues normally even if score submission fails
    }
  }

  // ... rest of existing DinoGame methods from 4A ...
}

// ... existing global functions from 4A (openModal, closeModal, savePlayerName) ...
```

**Score submission features:**

- **Rich metadata**: Tracks obstacles avoided and game duration
- **Global ranking**: Shows player's rank immediately after submission
- **Graceful degradation**: Game works offline or with network issues
- **Automatic refresh**: Leaderboard updates after each score submission
- **Anonymous protection**: Only named players can submit scores

## Step 8: Test your leaderboard system

### 1. Restart your development server

```bash
deno task dev
```

Look for the new database tables being created:

```
🚀 Initializing database...
🌱 Inserting sample data...
✅ Sample data inserted
✅ Database initialization completed successfully
🏆 Leaderboard API at http://0.0.0.0:8000/api/leaderboard
🏆 Scores API at http://0.0.0.0:8000/api/scores
```

### 2. Test the leaderboard API directly

Open your browser and visit:

- `http://localhost:8000/api/leaderboard` - Should show JSON leaderboard data
- `http://localhost:8000/api/leaderboard?limit=3` - Should show top 3 scores

### 3. Test score submission and ranking

1. **Play the game**: Visit `http://localhost:8000`
2. **Enter your name**: Use the modal from Step 4A
3. **Play and lose**: Let your dino hit an obstacle
4. **Check console**: Look for "Score submitted!" message
5. **Check leaderboard**: The leaderboard should update with new scores
6. **Play again**: Try to beat your score and get a better ranking

### 4. Test different scenarios

- **Anonymous play**: Close the name modal without entering a name - score
  shouldn't submit
- **Multiple players**: Use different names and see the leaderboard update
- **High scores**: Try to get a score that beats the sample data

## Deploy and test live

### 1. Deploy your changes

```bash
git add .
git commit -m "Add leaderboard system with score submission (Stage 4B)"
git push
```

### 2. Test the live leaderboard

1. **Visit your deployed URL**
2. **Share with friends**: Have multiple people play and submit scores
3. **Watch the leaderboard**: See real-time global competition
4. **Test API endpoints**: Visit your deployed `/api/leaderboard` URL

## What you've accomplished

✅ **Global Leaderboard**: Players can see worldwide rankings\
✅ **Score Submission**: Rich score data with metadata tracking\
✅ **REST API**: Professional endpoints for score management\
✅ **Real-time Updates**: Leaderboard refreshes after each game\
✅ **Competitive Gaming**: Players can compete for global rankings

## Next steps

Your leaderboard system is working! In the next step, you'll add:

- 🎨 Player customization with color picker and themes
- ⚙️ Difficulty settings and sound preferences
- 💾 Settings persistence in the database
- 🌈 Visual themes that change the game appearance

Continue to **[4C: Player Customization](./4c-customization-system.md)** →
