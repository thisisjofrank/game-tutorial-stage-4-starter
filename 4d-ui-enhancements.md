# ✨ 4D: UI Enhancements & Polish

In this final step, you'll add professional polish to your game! Create a
dedicated leaderboard page, add smooth animations, improve error handling, and
ensure everything works beautifully on mobile devices.

⏱️ **Estimated time**: 40 minutes

## What you'll accomplish

- ✅ Create a dedicated leaderboard page with advanced features
- ✅ Add smooth animations, transitions, and visual feedback
- ✅ Implement comprehensive error handling and graceful degradation
- ✅ Optimize for mobile devices with touch controls and responsive design
- ✅ Add loading states, success messages, and user feedback
- ✅ **Deploy and test**: A polished, professional gaming experience

## Prerequisites

- Completed [4C: Player Customization System](./4c-customization-system.md)
- Customization system working with themes and settings

## Step 1: Create dedicated leaderboard page

Create `public/leaderboard.html` for a dedicated leaderboard experience:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏆 Dino Runner - Global Leaderboard</title>
    <link rel="stylesheet" href="css/styles.css">
  </head>
  <body class="leaderboard-page">
    <!-- Header -->
    <header class="page-header">
      <div class="container">
        <h1>🏆 Global Leaderboard</h1>
        <nav class="nav-links">
          <a href="index.html" class="nav-link">🎮 Back to Game</a>
          <button onclick="refreshLeaderboard()" class="refresh-btn">
            🔄 Refresh
          </button>
        </nav>
      </div>
    </header>

    <!-- Leaderboard Stats -->
    <section class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number" id="totalPlayers">-</div>
            <div class="stat-label">Total Players</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="totalGames">-</div>
            <div class="stat-label">Games Played</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="highestScore">-</div>
            <div class="stat-label">Highest Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="averageScore">-</div>
            <div class="stat-label">Average Score</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Filter Controls -->
    <section class="filter-section">
      <div class="container">
        <div class="filters">
          <div class="filter-group">
            <label for="timeFilter">Time Period:</label>
            <select id="timeFilter" onchange="applyFilters()">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div class="filter-group">
            <label for="limitFilter">Show:</label>
            <select id="limitFilter" onchange="applyFilters()">
              <option value="10">Top 10</option>
              <option value="25">Top 25</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
            </select>
          </div>

          <div class="filter-group">
            <input
              type="text"
              id="searchFilter"
              placeholder="Search player name..."
              onkeyup="applyFilters()"
            >
          </div>
        </div>
      </div>
    </section>

    <!-- Main Leaderboard -->
    <section class="main-leaderboard">
      <div class="container">
        <!-- Top 3 Podium -->
        <div class="podium-section" id="podiumSection">
          <div class="podium-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading champions...</p>
          </div>
        </div>

        <!-- Full Leaderboard Table -->
        <div class="leaderboard-table-container">
          <table class="leaderboard-table" id="leaderboardTable">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Score</th>
                <th>Obstacles</th>
                <th>Duration</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="leaderboardBody">
              <!-- Loading state -->
              <tr class="loading-row">
                <td colspan="6">
                  <div class="loading-spinner"></div>
                  <span>Loading leaderboard...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Load More Button -->
        <div class="load-more-section">
          <button
            onclick="loadMoreScores()"
            id="loadMoreBtn"
            class="load-more-btn"
            style="display: none"
          >
            📈 Load More Scores
          </button>
        </div>
      </div>
    </section>

    <!-- Error Message -->
    <div class="error-banner" id="errorBanner" style="display: none">
      <div class="container">
        <span class="error-message" id="errorMessage"></span>
        <button onclick="hideError()" class="error-close">&times;</button>
      </div>
    </div>

    <script src="js/leaderboard.js"></script>
  </body>
</html>
```

**Page features:**

- **Dedicated leaderboard**: Clean, focused leaderboard experience
- **Statistics overview**: Show total players, games, and score stats
- **Advanced filtering**: Time periods, score limits, and player search
- **Podium display**: Special highlighting for top 3 players
- **Responsive table**: Mobile-optimized leaderboard display
- **Error handling**: User-friendly error messages

## Step 2: Create leaderboard JavaScript

Create `public/js/leaderboard.js` for the dedicated leaderboard functionality:

```javascript
// Leaderboard page functionality
class LeaderboardManager {
  constructor() {
    this.currentData = [];
    this.filteredData = [];
    this.loadOffset = 0;
    this.loadLimit = 50;
    this.isLoading = false;
  }

  async init() {
    console.log("🏆 Initializing leaderboard page...");

    // Load initial data
    await this.loadInitialData();

    // Set up auto-refresh (every 30 seconds)
    setInterval(() => this.autoRefresh(), 30000);

    console.log("✅ Leaderboard page initialized");
  }

  async loadInitialData() {
    try {
      this.showLoading();

      // Load comprehensive leaderboard data
      await Promise.all([
        this.loadLeaderboardStats(),
        this.loadFullLeaderboard(),
      ]);

      this.hideLoading();
    } catch (error) {
      this.showError(
        "Failed to load leaderboard data. Please check your connection.",
      );
      console.error("❌ Error loading initial data:", error);
    }
  }

  async loadLeaderboardStats() {
    try {
      // Get extended stats from the API
      const response = await fetch("/api/leaderboard?limit=100");

      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      const scores = data.leaderboard || [];

      // Calculate statistics
      const stats = {
        totalPlayers: new Set(scores.map((s) => s.playerName)).size,
        totalGames: scores.length,
        highestScore: scores.length > 0
          ? Math.max(...scores.map((s) => s.score))
          : 0,
        averageScore: scores.length > 0
          ? Math.round(
            scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
          )
          : 0,
      };

      this.updateStatsDisplay(stats);
    } catch (error) {
      console.error("❌ Error loading stats:", error);
    }
  }

  updateStatsDisplay(stats) {
    // Animate number changes
    this.animateNumber("totalPlayers", stats.totalPlayers);
    this.animateNumber("totalGames", stats.totalGames);
    this.animateNumber("highestScore", stats.highestScore);
    this.animateNumber("averageScore", stats.averageScore);
  }

  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000; // 1 second animation
    const steps = 60; // 60 FPS
    const stepValue = (targetValue - startValue) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const currentValue = Math.round(startValue + (stepValue * currentStep));
      element.textContent = currentValue.toLocaleString();

      if (currentStep >= steps) {
        element.textContent = targetValue.toLocaleString();
        clearInterval(timer);
      }
    }, duration / steps);
  }

  async loadFullLeaderboard() {
    try {
      const limit = document.getElementById("limitFilter")?.value || "50";
      const response = await fetch(`/api/leaderboard?limit=${limit}`);

      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const data = await response.json();
      this.currentData = data.leaderboard || [];

      // Apply current filters
      this.applyFilters();

      // Update displays
      this.updatePodiumDisplay();
      this.updateTableDisplay();
    } catch (error) {
      console.error("❌ Error loading leaderboard:", error);
      this.showError("Failed to load leaderboard. Please try again.");
    }
  }

  updatePodiumDisplay() {
    const podiumSection = document.getElementById("podiumSection");
    if (!podiumSection || this.filteredData.length === 0) return;

    const top3 = this.filteredData.slice(0, 3);

    podiumSection.innerHTML = `
      <div class="podium">
        ${
      top3.map((player, index) => `
          <div class="podium-place place-${
        index + 1
      }" data-rank="${player.rank}">
            <div class="podium-crown">${this.getCrownEmoji(index)}</div>
            <div class="podium-avatar">
              ${
        player.avatarUrl
          ? `<img src="${player.avatarUrl}" alt="${player.playerName}">`
          : `<div class="default-avatar">${
            player.playerName.charAt(0).toUpperCase()
          }</div>`
      }
            </div>
            <div class="podium-name">${player.playerName}</div>
            <div class="podium-score">${player.score.toLocaleString()}</div>
            <div class="podium-rank">#${player.rank}</div>
          </div>
        `).join("")
    }
      </div>
    `;
  }

  getCrownEmoji(index) {
    return ["👑", "🥈", "🥉"][index] || "🏅";
  }

  updateTableDisplay() {
    const tbody = document.getElementById("leaderboardBody");
    if (!tbody) return;

    if (this.filteredData.length === 0) {
      tbody.innerHTML = `
        <tr class="no-data-row">
          <td colspan="6">
            <div class="no-data">
              <div class="no-data-icon">🦕</div>
              <div class="no-data-text">No scores found</div>
              <div class="no-data-subtitle">Be the first to play and submit a score!</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredData.map((player) => `
      <tr class="leaderboard-row" data-rank="${player.rank}">
        <td class="rank-cell">
          <span class="rank-number">#${player.rank}</span>
          ${
      player.rank <= 3
        ? `<span class="rank-crown">${
          this.getCrownEmoji(player.rank - 1)
        }</span>`
        : ""
    }
        </td>
        <td class="player-cell">
          <div class="player-info">
            ${
      player.avatarUrl
        ? `<img src="${player.avatarUrl}" alt="${player.playerName}" class="player-avatar">`
        : `<div class="player-avatar-default">${
          player.playerName.charAt(0).toUpperCase()
        }</div>`
    }
            <span class="player-name">${player.playerName}</span>
          </div>
        </td>
        <td class="score-cell">
          <span class="score-value">${player.score.toLocaleString()}</span>
        </td>
        <td class="obstacles-cell">${player.obstaclesAvoided || 0}</td>
        <td class="duration-cell">${
      this.formatDuration(player.gameDuration)
    }</td>
        <td class="date-cell">${this.formatDate(player.date)}</td>
      </tr>
    `).join("");

    // Add loading animation
    this.animateTableRows();
  }

  animateTableRows() {
    const rows = document.querySelectorAll(".leaderboard-row");
    rows.forEach((row, index) => {
      row.style.opacity = "0";
      row.style.transform = "translateY(20px)";

      setTimeout(() => {
        row.style.transition = "all 0.3s ease";
        row.style.opacity = "1";
        row.style.transform = "translateY(0)";
      }, index * 50); // Stagger animation
    });
  }

  formatDuration(seconds) {
    if (!seconds) return "-";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  formatDate(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  applyFilters() {
    const timeFilter = document.getElementById("timeFilter")?.value || "all";
    const searchFilter =
      document.getElementById("searchFilter")?.value.toLowerCase() || "";

    let filtered = [...this.currentData];

    // Apply time filter
    if (timeFilter !== "all") {
      const now = new Date();
      let cutoffDate;

      switch (timeFilter) {
        case "today":
          cutoffDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      if (cutoffDate) {
        filtered = filtered.filter((player) =>
          new Date(player.date) >= cutoffDate
        );
      }
    }

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter((player) =>
        player.playerName.toLowerCase().includes(searchFilter)
      );
    }

    this.filteredData = filtered;
    this.updatePodiumDisplay();
    this.updateTableDisplay();
  }

  async autoRefresh() {
    if (this.isLoading) return;

    try {
      console.log("🔄 Auto-refreshing leaderboard...");
      await this.loadFullLeaderboard();
      this.showSuccessMessage("Leaderboard updated! 🔄", 2000);
    } catch (error) {
      console.error("❌ Auto-refresh failed:", error);
    }
  }

  showLoading() {
    this.isLoading = true;
    // Show loading spinners
    const loadingElements = document.querySelectorAll(".loading-spinner");
    loadingElements.forEach((el) => el.style.display = "block");
  }

  hideLoading() {
    this.isLoading = false;
    // Hide loading spinners
    const loadingElements = document.querySelectorAll(".loading-spinner");
    loadingElements.forEach((el) => el.style.display = "none");
  }

  showError(message) {
    const errorBanner = document.getElementById("errorBanner");
    const errorMessage = document.getElementById("errorMessage");

    if (errorBanner && errorMessage) {
      errorMessage.textContent = message;
      errorBanner.style.display = "block";

      // Auto-hide after 5 seconds
      setTimeout(() => this.hideError(), 5000);
    }
  }

  hideError() {
    const errorBanner = document.getElementById("errorBanner");
    if (errorBanner) {
      errorBanner.style.display = "none";
    }
  }

  showSuccessMessage(message, duration = 3000) {
    // Create and show temporary success message
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.style.animation = "slideOut 0.3s ease";
      setTimeout(() => successDiv.remove(), 300);
    }, duration);
  }
}

// Global functions for the leaderboard page
let leaderboardManager;

async function refreshLeaderboard() {
  if (leaderboardManager) {
    await leaderboardManager.loadInitialData();
    leaderboardManager.showSuccessMessage("Leaderboard refreshed! 🔄");
  }
}

function applyFilters() {
  if (leaderboardManager) {
    leaderboardManager.applyFilters();
  }
}

function hideError() {
  if (leaderboardManager) {
    leaderboardManager.hideError();
  }
}

async function loadMoreScores() {
  // Future enhancement: pagination
  console.log("Load more functionality could be added here");
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", async () => {
  leaderboardManager = new LeaderboardManager();
  await leaderboardManager.init();
});

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
```

**JavaScript features:**

- **Real-time statistics**: Calculates and animates player stats
- **Advanced filtering**: Time periods, search, and score limits
- **Smooth animations**: Staggered row loading and number animations
- **Auto-refresh**: Updates leaderboard every 30 seconds
- **Error handling**: Graceful failure with user feedback
- **Performance optimization**: Efficient filtering and rendering

## Step 3: Add enhanced CSS for leaderboard page

Add these styles to your `public/css/styles.css`:

```css
/* Existing styles from 4A, 4B, and 4C... */

/* NEW: Leaderboard Page Styling */
.leaderboard-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.page-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 20px 0;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.page-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 28px;
}

.nav-links {
  display: flex;
  gap: 15px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  background: #4caf50;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;
}

.nav-link:hover {
  background: #45a049;
}

.refresh-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.refresh-btn:hover {
  background: #0b7dda;
}

/* Statistics Section */
.stats-section {
  padding: 40px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 30px 20px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Filter Section */
.filter-section {
  padding: 20px 0;
}

.filters {
  display: flex;
  gap: 20px;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.filter-group label {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  border: 1px solid #ddd;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
}

.filter-group input[type="text"] {
  min-width: 200px;
}

/* Podium Section */
.podium-section {
  padding: 40px 0;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.podium {
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 20px;
  margin-bottom: 40px;
}

.podium-place {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s;
  position: relative;
}

.podium-place:hover {
  transform: scale(1.05);
}

.place-1 {
  order: 2;
  transform: scale(1.1);
  background: linear-gradient(135deg, #ffd700, #ffa500);
  color: #333;
}

.place-2 {
  order: 1;
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
  color: #333;
}

.place-3 {
  order: 3;
  background: linear-gradient(135deg, #cd7f32, #b8860b);
  color: white;
}

.podium-crown {
  font-size: 32px;
  margin-bottom: 10px;
}

.podium-avatar {
  width: 60px;
  height: 60px;
  margin: 0 auto 15px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.podium-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-avatar {
  font-size: 24px;
  font-weight: bold;
  color: #666;
}

.podium-name {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 16px;
}

.podium-score {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
}

.podium-rank {
  font-size: 14px;
  opacity: 0.8;
}

/* Leaderboard Table */
.main-leaderboard {
  padding: 20px 0 60px;
}

.leaderboard-table-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin: 0 auto;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.leaderboard-table th {
  background: #f8f9fa;
  padding: 15px 10px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e9ecef;
}

.leaderboard-table td {
  padding: 15px 10px;
  border-bottom: 1px solid #e9ecef;
}

.leaderboard-row:hover {
  background: rgba(76, 175, 80, 0.05);
}

.rank-cell {
  font-weight: bold;
  text-align: center;
  min-width: 80px;
}

.rank-crown {
  margin-left: 5px;
  font-size: 16px;
}

.player-cell {
  min-width: 200px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-avatar,
.player-avatar-default {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: #666;
}

.player-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.score-cell {
  font-weight: bold;
  color: #4caf50;
  text-align: right;
}

.obstacles-cell,
.duration-cell {
  text-align: center;
  color: #666;
}

.date-cell {
  text-align: right;
  color: #999;
  font-size: 12px;
}

/* Loading and Error States */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-row td {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-data {
  text-align: center;
  padding: 40px;
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.no-data-text {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.no-data-subtitle {
  color: #666;
  font-size: 14px;
}

.error-banner {
  background: #f44336;
  color: white;
  padding: 15px 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.error-message {
  flex: 1;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0 10px;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .page-header .container {
    flex-direction: column;
    gap: 15px;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    justify-content: space-between;
  }

  .filter-group input[type="text"] {
    min-width: auto;
    flex: 1;
  }

  .podium {
    flex-direction: column;
    align-items: center;
  }

  .podium-place {
    width: 100%;
    max-width: 300px;
  }

  .place-1 {
    order: 1;
  }

  .place-2 {
    order: 2;
  }

  .place-3 {
    order: 3;
  }

  .leaderboard-table-container {
    overflow-x: auto;
    margin: 0 10px;
  }

  .leaderboard-table {
    min-width: 600px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .leaderboard-table th,
  .leaderboard-table td {
    padding: 10px 5px;
    font-size: 12px;
  }

  .player-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
```

**CSS features:**

- **Glass morphism**: Frosted glass effect with backdrop blur
- **Responsive grid**: Adapts to different screen sizes
- **Smooth animations**: Hover effects, loading states, and transitions
- **Mobile optimization**: Touch-friendly design for mobile devices
- **Visual hierarchy**: Clear distinction between different content areas
- **Loading states**: Visual feedback during data loading

## Step 4: Add mobile enhancements to main game

Update your `public/js/game.js` to include mobile optimizations:

```javascript
class DinoGame {
  constructor() {
    // ... existing properties from 4A, 4B, and 4C ...

    // NEW: Mobile and touch support
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    this.touchStartY = 0;
    this.lastTouchTime = 0;
  }

  init() {
    // ... existing initialization ...

    // NEW: Setup mobile controls
    this.setupMobileControls();
    this.setupKeyboardControls();

    // NEW: Add performance optimizations
    this.setupPerformanceOptimizations();

    // ... rest of init method ...
  }

  // NEW: Mobile touch controls
  setupMobileControls() {
    if (!this.isMobile) return;

    // Add touch event listeners
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.touchStartY = e.touches[0].clientY;
      this.lastTouchTime = Date.now();
    });

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      const touchEndY = e.changedTouches[0].clientY;
      const touchDuration = Date.now() - this.lastTouchTime;
      const swipeDistance = this.touchStartY - touchEndY;

      // Detect upward swipe for jump
      if (swipeDistance > 30 && touchDuration < 300) {
        this.jump();
      }
    });

    // Prevent scrolling on the canvas
    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
    }, { passive: false });

    console.log("📱 Mobile touch controls enabled");
  }

  // NEW: Enhanced keyboard controls
  setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (this.gameRunning) {
          this.jump();
        } else {
          this.startGame();
        }
      }

      // NEW: Pause functionality
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  // NEW: Performance optimizations
  setupPerformanceOptimizations() {
    // Use requestAnimationFrame for smooth 60fps
    this.gameLoop = () => {
      this.update();

      if (this.gameRunning || this.gameStarted) {
        requestAnimationFrame(this.gameLoop);
      }
    };

    // Optimize canvas for better performance
    this.ctx.imageSmoothingEnabled = false; // Pixel perfect rendering

    // Reduce particle effects on lower-end devices
    if (this.isMobile && window.devicePixelRatio > 2) {
      this.settings.particleEffects = false;
      console.log("📱 Reduced particle effects for better mobile performance");
    }
  }

  // NEW: Pause/resume functionality
  togglePause() {
    if (!this.gameStarted) return;

    this.gamePaused = !this.gamePaused;

    if (this.gamePaused) {
      this.gameRunning = false;
      this.showPauseScreen();
    } else {
      this.gameRunning = true;
      this.hidePauseScreen();
      requestAnimationFrame(this.gameLoop);
    }
  }

  // NEW: Pause screen display
  showPauseScreen() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "white";
    this.ctx.font = "36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "PAUSED",
      this.canvas.width / 2,
      this.canvas.height / 2 - 20,
    );

    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "Press P or ESC to resume",
      this.canvas.width / 2,
      this.canvas.height / 2 + 20,
    );
  }

  hidePauseScreen() {
    // Simply continue the game loop - pause overlay will be cleared by next update
  }

  // NEW: Enhanced error handling
  async submitScoreToDatabase(gameDuration) {
    if (!this.playerName) return;

    // Show loading state
    this.showLoadingMessage("Submitting score...");

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const response = await fetch("/api/scores", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            playerName: this.playerName,
            score: Math.floor(this.score),
            obstaclesAvoided: this.obstaclesAvoided,
            gameDuration: gameDuration,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          this.hideLoadingMessage();
          this.showSuccessMessage(
            `Score submitted! Global rank: #${data.rank} 🎉`,
          );

          // Refresh leaderboard
          this.loadGlobalLeaderboard();
          return;
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        retryCount++;
        console.error(
          `❌ Score submission attempt ${retryCount} failed:`,
          error,
        );

        if (retryCount >= maxRetries) {
          this.hideLoadingMessage();
          this.showErrorMessage(
            "Failed to submit score. Playing offline mode.",
          );
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  // NEW: User feedback messages
  showLoadingMessage(message) {
    this.showUserMessage(message, "#2196F3", "⏳");
  }

  showSuccessMessage(message) {
    this.showUserMessage(message, "#4CAF50", "✅");
  }

  showErrorMessage(message) {
    this.showUserMessage(message, "#f44336", "❌");
  }

  showUserMessage(message, color, icon) {
    // Remove existing message
    this.hideUserMessage();

    const messageDiv = document.createElement("div");
    messageDiv.id = "userMessage";
    messageDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${color};
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      font-weight: 500;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;
    messageDiv.innerHTML = `${icon} ${message}`;

    document.body.appendChild(messageDiv);
  }

  hideUserMessage() {
    const existingMessage = document.getElementById("userMessage");
    if (existingMessage) {
      existingMessage.remove();
    }
  }

  hideLoadingMessage() {
    this.hideUserMessage();
  }

  // NEW: Enhanced game over screen
  async gameOver() {
    this.gameRunning = false;
    this.gamePaused = false;

    // Trigger vibration feedback
    this.triggerVibration([200, 100, 200]);

    // Calculate game duration
    const gameDuration = Math.floor((Date.now() - this.gameStartTime) / 1000);

    // Submit score with enhanced error handling
    await this.submitScoreToDatabase(gameDuration);

    // Show enhanced game over screen
    this.showGameOverScreen(gameDuration);
  }

  showGameOverScreen(gameDuration) {
    // Dark overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Game Over text
    this.ctx.fillStyle = "white";
    this.ctx.font = "48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GAME OVER",
      this.canvas.width / 2,
      this.canvas.height / 2 - 60,
    );

    // Score details
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      `Final Score: ${Math.floor(this.score)}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 20,
    );
    this.ctx.fillText(
      `Obstacles Avoided: ${this.obstaclesAvoided}`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 10,
    );
    this.ctx.fillText(
      `Duration: ${Math.floor(gameDuration / 60)}m ${gameDuration % 60}s`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 40,
    );

    // Restart instruction
    this.ctx.font = "16px Arial";
    this.ctx.fillStyle = "#ccc";
    this.ctx.fillText(
      "Press SPACE or TAP to play again",
      this.canvas.width / 2,
      this.canvas.height / 2 + 80,
    );
  }

  // ... rest of existing DinoGame methods from 4A, 4B, and 4C ...
}

// Add CSS for animations
const gameStyle = document.createElement("style");
gameStyle.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  
  #gameCanvas {
    touch-action: none; /* Prevent default touch behaviors */
    user-select: none;  /* Prevent text selection */
  }
`;
document.head.appendChild(gameStyle);

// ... existing global functions from 4A, 4B, and 4C ...
```

**Mobile enhancements:**

- **Touch controls**: Swipe up to jump on mobile devices
- **Performance optimization**: Reduced effects on lower-end devices
- **Responsive feedback**: Loading, success, and error messages
- **Pause functionality**: Pause/resume with P or ESC keys
- **Enhanced game over**: Detailed statistics and retry instructions
- **Retry mechanism**: Automatic retry for failed network requests

## Step 5: Add link to leaderboard page in main game

Update your `public/index.html` to include a link to the dedicated leaderboard:

```html
<!-- Game Controls (updated) -->
<div class="game-controls">
  <button onclick="startGame()" id="startButton">Start Game</button>
  <button onclick="openPlayerModal()" id="nameButton">👤 Player Name</button>
  <button onclick="openCustomizationModal()" id="customizeButton">
    🎨 Customize
  </button>
  <!-- NEW: Link to dedicated leaderboard page -->
  <a href="leaderboard.html" class="leaderboard-link">🏆 Full Leaderboard</a>
</div>
```

And add CSS for the leaderboard link:

```css
/* NEW: Leaderboard link styling */
.leaderboard-link {
  display: inline-block;
  background: #ff9800;
  color: white;
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;
}

.leaderboard-link:hover {
  background: #f57c00;
  text-decoration: none;
}

.game-controls {
  display: flex;
  gap: 10px;
  margin: 20px 0;
  flex-wrap: wrap;
  justify-content: center;
}
```

## Step 6: Test your enhanced UI system

### 1. Restart your development server

```bash
deno task dev
```

### 2. Test the main game enhancements

1. **Visit the main game**: `http://localhost:8000`
2. **Test mobile controls**: Use browser dev tools to simulate mobile
3. **Test pause functionality**: Press P or ESC during gameplay
4. **Test error handling**: Disconnect internet and try to submit a score
5. **Test touch controls**: Swipe up on mobile devices to jump

### 3. Test the dedicated leaderboard page

1. **Visit leaderboard page**: `http://localhost:8000/leaderboard.html`
2. **Test statistics**: Verify player counts and score calculations
3. **Test filtering**: Try different time periods and search functionality
4. **Test auto-refresh**: Wait 30 seconds and see automatic updates
5. **Test mobile responsiveness**: Check on different screen sizes

### 4. Test error scenarios

- **Network offline**: Test graceful degradation
- **API unavailable**: Verify error messages appear
- **Invalid data**: Check input validation

## Deploy and test live

### 1. Deploy your final version

```bash
git add .
git commit -m "Add UI enhancements, leaderboard page, and mobile optimization (Stage 4D - Complete!)"
git push
```

### 2. Test the complete experience

1. **Full game flow**: Play through complete game experience
2. **Multi-device testing**: Test on desktop, tablet, and mobile
3. **Share with friends**: Get feedback on the complete experience
4. **Performance testing**: Check loading times and responsiveness

## What you've accomplished 🎉

✅ **Dedicated Leaderboard Page**: Professional leaderboard with advanced
features\
✅ **Mobile Optimization**: Touch controls and responsive design\
✅ **Enhanced Error Handling**: Graceful failures with user feedback\
✅ **Performance Optimization**: Smooth 60fps gameplay and efficient rendering\
✅ **Professional Polish**: Animations, loading states, and visual feedback\
✅ **Complete Gaming Experience**: From registration to global competition

## Final Stage 4 Summary

🎮 **What You Built**: A complete multiplayer browser game with:

- **Database Integration**: PostgreSQL with player management and high scores
- **Global Leaderboard**: Real-time competition with rankings and statistics
- **Player Customization**: Themes, colors, difficulty settings, and
  accessibility
- **Professional UI**: Responsive design, animations, and mobile optimization
- **Robust Architecture**: Error handling, performance optimization, and
  scalability

🚀 **Technologies Used**:

- **Backend**: Deno, Oak framework, PostgreSQL, Neon database
- **Frontend**: HTML5 Canvas, CSS3, Vanilla JavaScript
- **Deployment**: Deno Deploy with environment-based configuration
- **Features**: REST APIs, real-time updates, mobile support

🎯 **Achievement Unlocked**: Professional Game Developer!

Your game is now production-ready with all the features of a modern web game.
Players can register, compete globally, customize their experience, and enjoy
smooth gameplay across all devices.

## Next Steps (Optional Enhancements)

Want to take your game even further? Consider adding:

- 🔊 **Sound Effects**: Audio feedback for jumps, collisions, and achievements
- 🎵 **Background Music**: Ambient music with volume controls
- 🏅 **Achievement System**: Unlock badges for milestones and special
  accomplishments
- 👥 **Social Features**: Share scores on social media and challenge friends
- 📊 **Analytics Dashboard**: Track player engagement and game statistics
- 🎨 **Advanced Graphics**: Sprite animations and visual effects
- 🌍 **Internationalization**: Multi-language support for global players

## Troubleshooting

**Leaderboard page not loading**: Check that all files are uploaded and API
endpoints are accessible

**Mobile controls not working**: Verify touch event listeners are properly set
up

**Performance issues**: Check browser console for errors and optimize based on
device capabilities

**Database connection errors**: Verify DATABASE_URL environment variable and
Neon database status

**Deployment issues**: Check Deno Deploy logs for any runtime errors

Congratulations! You've built an amazing, professional-quality browser game!
🎉🦕
