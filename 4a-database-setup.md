# 📝 4A: Database Setup & Player Names

Welcome to the first step of Stage 4! In this part, you'll set up a PostgreSQL
database and add player name collection to your game. By the end, players will
be able to enter their names and have them persist between sessions.

## What you'll accomplish

- ✅ Set up PostgreSQL database (using Neon cloud hosting)
- ✅ Create database connection management with connection pooling
- ✅ Build basic database schema with migrations
- ✅ Add player name modal interface to your game
- ✅ Store player names in localStorage as a fallback
- ✅ **Deploy and test**: Names persist between game sessions

## Prerequisites

- Completed Stage 3 (or use the Stage 3 starter)
- [Deno](https://deno.com/) installed
- VS Code or similar editor

## Step 1: Set up your PostgreSQL database

We'll use [Neon](https://neon.tech/) for cloud PostgreSQL hosting - it's free,
reliable, and integrates perfectly with Deno Deploy.

### Create your Neon database

1. **Sign up for Neon**: Visit [neon.tech](https://neon.tech/) and create a free
   account
2. **Create a project**: Name it "dino-runner-game"
3. **Copy connection string**: From your dashboard, copy the connection string
   that looks like:
   ```
   postgresql://username:password@host.neon.tech/database?sslmode=require
   ```

### Configure environment variables

Create or update your `.env` file in the root of your project:

```env
# Server Configuration
PORT=8000

# Environment
ENVIRONMENT=development

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://your-username:your-password@your-host.neon.tech/your-database?sslmode=require

# Features (for later stages)
ENABLE_LEADERBOARD=true
ENABLE_CUSTOMIZATION=true
```

**Important**: Replace the `DATABASE_URL` with your actual Neon connection
string!

## Step 2: Create database connection management

We need a robust connection system that can handle multiple concurrent requests
efficiently. Create the database directory structure:

```bash
mkdir -p src/database
```

### Database connection with pooling

Create `src/database/connection.ts`:

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

**What this code does:**

- **Connection pooling**: Instead of opening a new database connection for each
  request, we maintain a pool of 10 reusable connections
- **Three-tier fallback**: Works with Neon (DATABASE_URL), Deno Deploy (standard
  PostgreSQL env vars), or custom environment variables
- **npm:pg**: We use the standard Node.js PostgreSQL driver for better
  compatibility and features

## Step 3: Create basic database schema

For this step, we only need a simple `players` table. Create
`src/database/schema.sql`:

```sql
-- Stage 4A: Basic database schema for player names

-- Players table for user accounts
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
```

**Schema explanation:**

- **`SERIAL PRIMARY KEY`**: Auto-incrementing unique identifier for each player
- **`username VARCHAR(50) UNIQUE NOT NULL`**: Player name, must be unique and
  required
- **`email` and `avatar_url`**: Optional fields for future user features
- **`created_at` and `updated_at`**: Timestamps for when players are created and
  modified
- **Index on `username`**: Speeds up lookups when finding players by name

## Step 4: Database migrations system

Create `src/database/migrations.ts` to automatically set up your database:

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
        ('DinoMaster', 'dino@example.com'),
        ('JumpQueen', 'jump@example.com'),
        ('CactusDodger', 'dodge@example.com')
        ON CONFLICT (username) DO NOTHING
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

**Migration system features:**

- **Idempotent operations**: Can be run multiple times safely without side
  effects
- **Error handling**: Graceful failure if database is unavailable
- **Sample data**: Inserts test players to help with development
- **Connection management**: Properly releases database connections back to the
  pool

## Step 5: Add database middleware

Create `src/middleware/database.ts` to inject database connections into request
contexts:

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

**Why middleware?**

- **Code reuse**: Every API route can access the database via `ctx.state.db`
- **Error handling**: Centralized database error handling
- **Clean separation**: Database concerns separated from business logic

## Step 6: Update your main server

Update `src/main.ts` to initialize the database and add the middleware:

```typescript
import { Application } from "@oak/oak";
import { oakCors } from "@oak/oak/middlewares/cors";
import apiRoutes from "./routes/api.routes.ts";

// NEW: Add database imports
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "0.0.0.0";

// NEW: Initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// Enable CORS for all routes
app.use(oakCors());

// NEW: Add database middleware for API routes
app.use(databaseMiddleware);

// API routes
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

// Serve static files
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

await app.listen({ hostname: HOST, port: PORT });
```

**Key changes:**

- **Database initialization**: Runs migrations on server startup
- **Graceful fallback**: If database fails, server continues with limited
  functionality
- **Database middleware**: All routes now have access to database pool

## Step 7: Add player name modal to frontend

Update your `public/index.html` to include a modal for collecting player names.
Add this before the closing `</body>` tag:

```html
<!-- Player Name Modal -->
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
```

## Step 8: Add modal CSS styling

Add these styles to your `public/css/styles.css`:

```css
/* Modal styling */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
}

.modal.show {
  display: flex;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin-top: 0;
  color: #333;
}

.modal-content p {
  margin-bottom: 20px;
  color: #666;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin-bottom: 20px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box;
}

.modal-content input:focus {
  border-color: #4caf50;
  outline: none;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-buttons button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.btn-primary {
  background-color: #4caf50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #666;
  color: white;
}

.btn-secondary:hover {
  background-color: #555;
}
```

## Step 9: Add player name functionality to game

Update your `public/js/game.js` to include player name management. Add these
properties to your `DinoGame` constructor:

```javascript
class DinoGame {
  constructor() {
    // ... existing properties ...

    // NEW: Player data tracking
    this.playerName = localStorage.getItem("playerName") || null;

    // ... rest of constructor ...
  }

  init() {
    // ... existing initialization ...

    // NEW: Show player name prompt if needed
    this.showPlayerNamePrompt();

    // ... rest of init ...
  }

  // NEW: Player name management methods
  showPlayerNamePrompt() {
    console.log(`🎮 Checking player name... Current: "${this.playerName}"`);

    // Check if player needs to enter a name
    if (
      !this.playerName || this.playerName === "" || this.playerName === "null"
    ) {
      console.log("🎮 No player name found, showing prompt...");

      // Show modal after a short delay to ensure UI is ready
      setTimeout(() => {
        const modal = document.getElementById("playerModal");

        if (modal) {
          console.log("🎮 Opening player modal...");
          window.openModal("playerModal");

          // Focus the input field
          const input = document.getElementById("playerNameInput");
          if (input) {
            input.focus();
            // Handle Enter key
            input.addEventListener("keypress", (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                window.savePlayerName();
              }
            });
          }
        } else {
          // Fallback to browser prompt if modal not found
          console.log("🎮 Modal not found, using prompt fallback...");
          const name = prompt("Enter your name for the leaderboard:");
          if (name && name.trim()) {
            this.setPlayerName(name.trim());
          }
        }
      }, 1000);
    } else {
      console.log(`🎮 Player name found: ${this.playerName}`);
    }
  }

  setPlayerName(name) {
    this.playerName = name;
    localStorage.setItem("playerName", name);
    console.log(`👤 Player name set: ${name}`);
  }
}

// NEW: Global functions for modal interaction
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

window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    modal.style.display = "none";
  }
};

window.savePlayerName = function () {
  const input = document.getElementById("playerNameInput");
  const playerName = input?.value.trim();

  if (playerName && playerName.length > 0 && playerName.length <= 20) {
    localStorage.setItem("playerName", playerName);

    // Update the game instance if it exists
    if (window.game) {
      window.game.setPlayerName(playerName);
    }

    window.closeModal("playerModal");
    console.log(`✅ Player name saved: ${playerName}`);
  } else if (!playerName || playerName.length === 0) {
    alert("Please enter a name");
  } else {
    alert("Please enter a valid name (1-20 characters)");
  }
};

// Make sure to expose the game instance globally
let game = new DinoGame();
window.game = game;
```

**Player name system features:**

- **Persistent storage**: Names are saved in localStorage and survive browser
  restarts
- **Modal interface**: Clean, user-friendly popup for name entry
- **Fallback handling**: Uses browser prompt if modal fails to load
- **Validation**: Ensures names are 1-20 characters
- **Enter key support**: Users can press Enter to save their name

## Step 10: Test your implementation

Now let's test everything works:

### 1. Start your development server

```bash
deno task dev
```

You should see output like:

```
🚀 Initializing database...
🔧 Using DATABASE_URL for connection pool
🗄️ Database connection pool initialized
🌱 Inserting sample data...
✅ Sample data inserted
✅ Database initialization completed successfully
🦕 Dino Runner Game server starting on http://0.0.0.0:8000
🎮 Game available at http://0.0.0.0:8000
🔌 API available at http://0.0.0.0:8000/api
```

### 2. Test the player name modal

1. **Open your game**: Visit `http://localhost:8000`
2. **Modal should appear**: After 1 second, you should see the player name modal
3. **Enter a name**: Type your name and click "Save & Play" or press Enter
4. **Modal closes**: The modal should disappear and your name should be saved
5. **Refresh the page**: Your name should be remembered and the modal shouldn't
   appear again

### 3. Test the database connection

Check your browser's developer console (F12). You should see:

```
🎮 Checking player name... Current: "YourName"
🎮 Player name found: YourName
👤 Player name set: YourName
```

### 4. Clear data to test modal again

To see the modal again:

1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear localStorage for your site
4. Refresh the page - modal should appear again

## Deploy and test live

### Deploy to Deno Deploy

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add database setup and player names (Stage 4A)"
   git push
   ```

2. **Deno Deploy will automatically deploy your changes**: If you have Deno
   Deploy connected to your GitHub repo, it will deploy automatically when you
   push changes. If not, you can manually deploy:

   - Go to your [Deno Deploy dashboard](https://app.deno.com/)
   - Create a new project or select your existing one
   - Connect it to your GitHub repository
   - Set the entrypoint to `src/main.ts`
   - Click "Deploy"

3. **Add database to Deno Deploy**:
   - On your [Deno Deploy dashboard](https://app.deno.com/), click the "Databases" tab
   - Click "**+ Add Database**"

<img width="256" height="640" alt="Deno Deploy add database" src="https://github.com/user-attachments/assets/28a4ac6a-2054-4f44-b043-13c335051eff" />

- Add your database connection string to the form, and Deno Deploy will automatically configure the environment variables for your application. (You can also manually add the Slug, Credentials and Port if needed.) You do not need to include a PEM certificate for this example.

- Once you have added the database details, you can test the connection and save it.
- In the "**Databases**"" tab, you can assign the database to your application.

### Test your live deployment

1. Visit your deployed URL
2. The player name modal should appear
3. Enter a name and verify it persists across page refreshes
4. Check the Deno Deploy logs to confirm database connection

## What you've accomplished 🎉

✅ **Database Foundation**: PostgreSQL database with connection pooling\
✅ **Schema Management**: Automated migrations and sample data\
✅ **Player System**: Name collection with modal interface\
✅ **Data Persistence**: Names saved in localStorage\
✅ **Production Ready**: Deployed with live database

## Next steps

Your database foundation is ready! In the next step, you'll:

- 🏆 Add a leaderboard system with score submission
- 📊 Create API endpoints for saving and retrieving scores
- 📱 Display a live leaderboard in your game

Continue to **[4B: Score Submission & Leaderboard](./4b-leaderboard-system.md)**
→
