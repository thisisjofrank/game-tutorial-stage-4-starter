# 🎨 4C: Player Customization System

In this step, you'll add a complete customization system! Players can
personalize their gaming experience with custom colors, themes, difficulty
settings, and sound preferences - all saved to the database.

## What you'll accomplish

- ✅ Create player settings database schema and API
- ✅ Build a customization modal with color picker and theme options
- ✅ Implement visual theme system with real-time preview
- ✅ Add difficulty scaling and sound preferences
- ✅ Persist all settings to the database per player
- ✅ **Deploy and test**: Each player has unique, saved preferences

## Prerequisites

- Completed [4B: Score Submission & Leaderboard](./4b-leaderboard-system.md)
- Leaderboard system working with player names

## Step 1: Create customization database schema

Update your `src/database/schema.sql` to include player settings:

```sql
-- Stage 4C: Extended schema with player customization

-- Players table (existing from 4A)
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- High scores table (existing from 4B)
CREATE TABLE IF NOT EXISTS high_scores (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  obstacles_avoided INTEGER DEFAULT 0,
  game_duration_seconds INTEGER DEFAULT 0,
  max_speed_reached DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- NEW: Player customization settings
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

-- Indexes for performance (existing + new)
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
```

**Customization features:**

- **Visual themes**: Desert, forest, night, rainbow, and space backgrounds
- **Dino colors**: Customizable hex color for the player's dinosaur
- **Sound preferences**: Enable/disable game sound effects
- **Difficulty settings**: Easy, normal, and hard game modes
- **Player linking**: Settings tied to registered player accounts

## Step 2: Create customization API routes

Create `src/routes/customization.routes.ts` for settings management:

```typescript
import { Router } from "@oak/oak";
import type { RouterContext } from "@oak/oak";

const router = new Router();

/**
 * GET /api/customization/:playerName - Fetch player's customization settings
 */
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

/**
 * POST /api/customization - Save player's customization settings
 */
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

/**
 * GET /api/customization/options - Get available customization options
 */
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

**API design features:**

- **Player-based settings**: Settings linked to registered player accounts
- **Input validation**: Validates theme names and required fields  
- **Default fallbacks**: Provides sensible defaults for new players
- **Theme metadata**: Includes preview colors for each theme
- **Anonymous support**: Allows URL parameters for localStorage-style settings

## Step 3: Add customization routes to main server

Update `src/main.ts` to include the customization routes:

```typescript
import { Application } from "@oak/oak";
import { oakCors } from "@oak/oak/middlewares/cors";
import apiRoutes from "./routes/api.routes.ts";

// Database imports (from 4A)
import { databaseMiddleware } from "./middleware/database.ts";
import { initializeDatabase } from "./database/migrations.ts";

// Routes (existing + new)
import leaderboardRoutes from "./routes/leaderboard.routes.ts";
import { customizationRoutes } from "./routes/customization.routes.ts"; // NEW

const app = new Application();
const PORT = parseInt(Deno.env.get("PORT") || "8000");
const HOST = Deno.env.get("HOST") || "0.0.0.0";

// Initialize database on startup
try {
  await initializeDatabase();
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("⚠️ Continuing without database (some features may not work)");
}

// Enable CORS for all routes
app.use(oakCors());

// Add database middleware for API routes
app.use(databaseMiddleware);

// API routes (existing)
app.use(apiRoutes.routes());
app.use(apiRoutes.allowedMethods());

// Leaderboard routes (from 4B)
app.use(leaderboardRoutes.routes());
app.use(leaderboardRoutes.allowedMethods());

// NEW: Customization routes
app.use(customizationRoutes.routes());
app.use(customizationRoutes.allowedMethods());

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
console.log(`🏆 Leaderboard API at http://${HOST}:${PORT}/api/leaderboard`);

// NEW: Log customization endpoints
console.log(`🎨 Customization API at http://${HOST}:${PORT}/api/customization`);
console.log(`🎨 Options API at http://${HOST}:${PORT}/api/customization/options`);

await app.listen({ hostname: HOST, port: PORT });
```

## Step 4: Add customization modal to HTML

Update your `public/index.html` to include the customization interface:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dino Runner Game - Stage 4C</title>
    <link rel="stylesheet" href="css/styles.css">
  </head>
  <body>
    <div class="container">
      <h1>🦕 Dino Runner Game</h1>

      <!-- Game Controls -->
      <div class="game-controls">
        <button onclick="startGame()" id="startButton">Start Game</button>
        <button onclick="openPlayerModal()" id="nameButton">
          👤 Player Name
        </button>
        <!-- NEW: Customization button -->
        <button onclick="openCustomizationModal()" id="customizeButton">
          🎨 Customize
        </button>
      </div>

      <!-- Game Canvas -->
      <canvas id="gameCanvas" width="800" height="200"></canvas>
      <div class="game-info">
        <div class="score">Score: <span id="scoreDisplay">0</span></div>
        <div class="player-info">
          Player: <span id="playerDisplay">Anonymous</span>
        </div>
      </div>
    </div>

    <!-- Global Leaderboard (from 4B) -->
    <section class="container">
      <h3>Global Leaderboard</h3>
      <div class="leaderboard-container">
        <div class="leaderboard-list" id="leaderboardList">
          <div class="loading">Loading leaderboard...</div>
        </div>
      </div>
    </section>

    <!-- Player Name Modal (from 4A) -->
    <div class="modal" id="playerModal">
      <div class="modal-content">
        <span class="close" onclick="closePlayerModal()">&times;</span>
        <h3>👤 Player Name</h3>
        <p>Enter your name to save scores and join the leaderboard!</p>
        <input
          type="text"
          id="playerNameInput"
          placeholder="Enter your name..."
          maxlength="20"
        >
        <button onclick="savePlayerName()">Save Name</button>
      </div>
    </div>

    <!-- NEW: Customization Modal -->
    <div class="modal" id="customizationModal">
      <div class="modal-content customization-content">
        <span class="close" onclick="closeCustomizationModal()">&times;</span>
        <h3>🎨 Game Customization</h3>
        
        <!-- Visual Settings -->
        <div class="settings-section">
          <h4>🌈 Visual Settings</h4>
          
          <div class="setting-group">
            <label for="dinoColor">Dino Color:</label>
            <input type="color" id="dinoColor" value="#4CAF50">
          </div>
          
          <div class="setting-group">
            <label for="backgroundTheme">Background Theme:</label>
            <select id="backgroundTheme">
              <option value="desert">🏜️ Desert</option>
              <option value="forest">🌲 Forest</option>
              <option value="night">🌙 Night</option>
              <option value="rainbow">� Rainbow</option>
              <option value="space">🚀 Space</option>
            </select>
          </div>
        </div>

        <!-- Gameplay Settings -->
        <div class="settings-section">
          <h4>⚙️ Gameplay Settings</h4>
          
          <div class="setting-group">
            <label for="difficultyPreference">Difficulty Level:</label>
            <select id="difficultyPreference">
              <option value="easy">🟢 Easy</option>
              <option value="normal">🟡 Normal</option>
              <option value="hard">🔴 Hard</option>
            </select>
          </div>
          
          <div class="setting-group checkbox-group">
            <input type="checkbox" id="soundEnabled" checked>
            <label for="soundEnabled">� Sound Effects</label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="modal-actions">
          <button onclick="saveCustomizationSettings()" class="save-button">💾 Save Settings</button>
          <button onclick="resetToDefaults()" class="reset-button">🔄 Reset to Defaults</button>
        </div>
      </div>
    </div>

    <script src="js/game.js"></script>
  </body>
</html>
```

**Modal features:**

- **Color picker**: Simple dino color customization
- **Theme selection**: Five different background themes  
- **Difficulty options**: Easy, normal, and hard modes
- **Sound toggle**: Enable/disable sound effects
- **Action buttons**: Save and reset functionality

## Step 5: Add customization modal CSS

Add these styles to your `public/css/styles.css`:

```css
/* Existing styles from 4A and 4B... */

/* NEW: Customization Modal Styles */
.customization-content {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.settings-section {
  background: #f9f9f9;
  padding: 20px;
  margin: 15px 0;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.settings-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.setting-group {
  display: flex;
  align-items: center;
  margin: 12px 0;
  gap: 10px;
}

.setting-group label {
  font-weight: 500;
  color: #555;
  min-width: 120px;
}

.setting-group input[type="color"] {
  width: 50px;
  height: 35px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.setting-group select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #4caf50;
}

.checkbox-group label {
  min-width: auto;
  flex: 1;
  cursor: pointer;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #ccc;
  display: inline-block;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.modal-actions button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-button {
  background: #4caf50;
  color: white;
}

.save-button:hover {
  background: #45a049;
}

.reset-button {
  background: #f44336;
  color: white;
}

.reset-button:hover {
  background: #da190b;
}

.preview-button {
  background: #2196f3;
  color: white;
}

.preview-button:hover {
  background: #0b7dda;
}

/* NEW: Theme-based body classes */
body.theme-desert {
  background: linear-gradient(to bottom, #87CEEB, #DEB887);
}

body.theme-forest {
  background: linear-gradient(to bottom, #98FB98, #228B22);
}

body.theme-night {
  background: linear-gradient(to bottom, #191970, #2F4F4F);
  color: white;
}

body.theme-rainbow {
  background: linear-gradient(to bottom, #FF69B4, #FFD700);
}

body.theme-space {
  background: linear-gradient(to bottom, #000000, #696969);
  color: white;
}
```

**CSS features:**

- **Organized sections**: Visual grouping of related settings
- **Responsive design**: Works on mobile and desktop devices
- **Theme classes**: Body classes for different background themes
- **Interactive elements**: Hover effects and smooth transitions

## Step 6: Add customization functionality to game

Update your `public/js/game.js` to include the customization system:

```javascript
class DinoGame {
  constructor() {
    // ... existing properties from 4A and 4B ...

    // NEW: Customization settings
    this.settings = {
      dinoColor: "#4CAF50",
      backgroundTheme: "desert",
      soundEnabled: true,
      difficultyPreference: "normal",
    };

    // NEW: Difficulty speed multipliers
    this.difficultyMultipliers = {
      easy: 0.8,
      normal: 1.0,
      hard: 1.3,
    };
  }

  async init() {
    // ... existing initialization from 4A and 4B ...

    // NEW: Load player settings if they have a name
    if (this.playerName) {
      await this.loadPlayerSettings();
    }

    // Apply visual theme
    this.applyTheme();

    // ... rest of init method ...
  }

  // NEW: Load player settings from database
  async loadPlayerSettings() {
    if (!this.playerName) return;

    try {
      const response = await fetch(
        `/api/customization/${encodeURIComponent(this.playerName)}`,
      );

      if (response.ok) {
        const data = await response.json();
        this.settings = { ...this.settings, ...data.settings };
        console.log(`🎨 Loaded settings for ${this.playerName}`);

        // Apply loaded settings
        this.applyTheme();
        this.updateCustomizationUI();
      }
    } catch (error) {
      console.log("Failed to load player settings:", error);
      // Continue with defaults
    }
  }

  // NEW: Apply visual theme to the game
  applyTheme() {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove("theme-desert", "theme-forest", "theme-night", "theme-rainbow", "theme-space");
    
    // Apply selected theme
    body.classList.add(`theme-${this.settings.backgroundTheme}`);
  }  // NEW: Update game speed based on difficulty
  getGameSpeed() {
    const baseSpeed = 2; // Base game speed
    const multiplier =
      this.difficultyMultipliers[this.settings.difficultyPreference] || 1.0;
    return baseSpeed * multiplier;
  }

  // Modified: Update game loop to use customized colors and speed
  update() {
    if (!this.gameRunning) return;

    this.clearCanvas();

    // Update game objects with custom speed
    this.updateDino();
    this.updateObstacles();
    this.updateGround();

    // Draw with custom colors
    this.drawBackground();
    this.drawGround();
    this.drawDino();
    this.drawObstacles();
    this.drawScore();

    // Check for collisions
    this.checkCollisions();
  }

  // NEW: Draw background with theme colors
  drawBackground() {
    const themes = {
      desert: { top: "#87CEEB", bottom: "#DEB887" },
      forest: { top: "#98FB98", bottom: "#228B22" },
      night: { top: "#191970", bottom: "#2F4F4F" },
      rainbow: { top: "#FF69B4", bottom: "#FFD700" },
      space: { top: "#000000", bottom: "#696969" },
    };

    const theme = themes[this.settings.backgroundTheme] || themes.desert;

    // Create gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, theme.top);
    gradient.addColorStop(1, theme.bottom);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Modified: Draw dino with custom color
  drawDino() {
    this.ctx.fillStyle = this.settings.dinoColor;
    this.ctx.fillRect(
      this.dino.x,
      this.dino.y,
      this.dino.width,
      this.dino.height,
    );
  }

  // Modified: Draw obstacles with custom color
  // Modified: Draw obstacles (no color customization in Stage 4)
  drawObstacles() {
    this.ctx.fillStyle = "#FF5722"; // Fixed obstacle color
    for (const obstacle of this.obstacles) {
      this.ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
      );
    }
  }

  // Modified: Game over (simplified - no vibration in Stage 4)
  async gameOver() {
    this.gameRunning = false;
    
    // ... rest of existing game over logic from 4B ...
  }

  // ... rest of existing DinoGame methods from 4A and 4B ...
}

// NEW: Global functions for customization modal

async function openCustomizationModal() {
  // Load current settings into the modal
  updateCustomizationUI();

  const modal = document.getElementById("customizationModal");
  modal.style.display = "block";
}

function closeCustomizationModal() {
  const modal = document.getElementById("customizationModal");
  modal.style.display = "none";
}

function updateCustomizationUI() {
  const settings = window.game?.settings || {
    dinoColor: "#4CAF50",
    backgroundTheme: "desert",
    soundEnabled: true,
    difficultyPreference: "normal",
  };

  // Update form inputs
  document.getElementById("dinoColor").value = settings.dinoColor;
  document.getElementById("backgroundTheme").value = settings.backgroundTheme;
  document.getElementById("difficultyPreference").value = settings.difficultyPreference;
  document.getElementById("soundEnabled").checked = settings.soundEnabled;
}

// Remove updateColorPreviews function - not needed in Stage 4

  const dinoPreview = document.getElementById("dinoColorPreview");
  const obstaclePreview = document.getElementById("obstacleColorPreview");

  if (dinoPreview) dinoPreview.style.backgroundColor = dinoColor;
  if (obstaclePreview) obstaclePreview.style.backgroundColor = obstacleColor;
}

async function saveCustomizationSettings() {
  if (!window.game || !window.game.playerName) {
    alert("Please set your player name first!");
    return;
  }

  // Collect settings from the modal
  const settings = {
    playerName: window.game.playerName,
    dinoColor: document.getElementById("dinoColor").value,
    backgroundTheme: document.getElementById("backgroundTheme").value,
    difficultyPreference: document.getElementById("difficultyPreference").value,
    soundEnabled: document.getElementById("soundEnabled").checked,
  };

  try {
    const response = await fetch(`/api/customization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      // Update game settings and apply them
      window.game.settings = {
        dinoColor: settings.dinoColor,
        backgroundTheme: settings.backgroundTheme,
        difficultyPreference: settings.difficultyPreference,
        soundEnabled: settings.soundEnabled,
      };
      window.game.applyTheme();

      alert("Settings saved successfully! 🎉");
      closeCustomizationModal();

      console.log("🎨 Settings saved:", settings);
    } else {
      throw new Error("Failed to save settings");
    }
  } catch (error) {
    console.error("Failed to save settings:", error);
    alert("Failed to save settings. Please try again.");
  }
}

function resetToDefaults() {
  if (confirm("Reset all settings to defaults? This cannot be undone.")) {
    // Reset to default values
    document.getElementById("dinoColor").value = "#4a90e2";
    document.getElementById("backgroundTheme").value = "desert";
    document.getElementById("difficultyPreference").value = "medium";
    document.getElementById("soundEnabled").checked = true;
  }
}

function previewSettings() {
  if (!window.game) return;

  // Temporarily apply settings for preview
  const tempSettings = {
    dinoColor: document.getElementById("dinoColor").value,
    backgroundTheme: document.getElementById("backgroundTheme").value,
    difficultyPreference: document.getElementById("difficultyPreference").value,
    soundEnabled: document.getElementById("soundEnabled").checked,
  };

  const originalSettings = { ...window.game.settings };
  window.game.settings = tempSettings;
  window.game.applyTheme();

  // Revert after 3 seconds
  setTimeout(() => {
    window.game.settings = originalSettings;
    window.game.applyTheme();
  }, 3000);

  alert("Preview applied for 3 seconds!");
}

// Event listeners for real-time color preview updates
document.addEventListener("DOMContentLoaded", () => {
  // Update color previews when colors change
  const colorInputs = ["dinoColor", "obstacleColor"];
  colorInputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener("input", updateColorPreviews);
    }
  });
});

// ... existing global functions from 4A and 4B (openPlayerModal, closePlayerModal, savePlayerName) ...
```

**Customization features:**

- **Real-time theme switching**: Background changes immediately
- **Color customization**: Live preview of dino and obstacle colors
- **Difficulty scaling**: Game speed adjusts based on selected difficulty
- **Accessibility support**: High contrast and reduced motion modes
- **Haptic feedback**: Vibration on game events (mobile devices)
- **Particle effects**: Optional visual enhancements for better experience

## Step 7: Test your customization system

### 1. Restart your development server

```bash
deno task dev
```

Look for the new database table and API endpoints:

```bash
🚀 Initializing database...
✅ Database initialization completed successfully
🎨 Customization API at http://0.0.0.0:8000/api/customization
```

### 2. Test the customization API

Open your browser and visit:

- `http://localhost:8000/api/customization/TestPlayer` - Should return default settings

### 3. Test the customization interface

1. **Open the game**: Visit `http://localhost:8000`
2. **Set player name**: Click "👤 Player Name" and enter a name
3. **Open customization**: Click "🎨 Customize" button
4. **Test color changes**: Use the dino color picker
5. **Try themes**: Switch between desert, forest, night, rainbow, and space themes
6. **Test difficulty**: Change from medium to easy or hard and play a game
7. **Save settings**: Click "💾 Save Settings"
8. **Reload page**: Settings should persist across browser sessions

## Deploy and test live

### 1. Deploy your changes

```bash
git add .
git commit -m "Add player customization system with themes and settings (Stage 4C)"
git push
```

### 2. Test live customization

1. **Visit your deployed URL**
2. **Create unique settings**: Customize colors, theme, and difficulty
3. **Test persistence**: Close browser, reopen, verify settings saved
4. **Share with friends**: Each player gets their own customization settings

## What you've accomplished 🎉

✅ **Visual Customization**: Players can change dino colors and background themes\
✅ **Difficulty Scaling**: Easy/Medium/Hard modes with speed adjustments\
✅ **Settings Persistence**: All preferences saved to database per player\
✅ **Professional UI**: Modal interface with organized sections

## Next steps

Your customization system is complete! In the final step, you'll add:

- 📄 Dedicated leaderboard page with advanced features
- 🎨 Enhanced UI with animations and visual polish
- ⚠️ Error handling and graceful degradation
- 📱 Mobile responsiveness and touch improvements

Continue to **[4D: UI Enhancements & Polish](./4d-ui-enhancements.md)** →

## Troubleshooting

**Settings not saving**: Check that player name is set and API endpoints are
accessible

**Colors not applying**: Verify the color picker values are valid hex colors

**Theme not switching**: Check browser console for JavaScript errors

**Database errors**: Verify the player_settings table was created correctly

**Modal not opening**: Ensure all JavaScript functions are loaded properly

Ready for the final polish? Let's make your game shine! ✨
