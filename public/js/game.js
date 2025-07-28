// Stage 3: Dino Runner Game with Obstacles & Collision Detection
console.log("🦕 Stage 3: Obstacles and Collision Detection loaded!");

class DinoGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.scoreElement = document.getElementById("score");
    this.statusElement = document.getElementById("gameStatus");
    this.highScoreElement = document.getElementById("highScore");

    // Game state
    this.gameState = "waiting"; // 'waiting', 'playing', 'gameOver'
    this.score = 0;
    this.gameSpeed = 3;
    this.initialGameSpeed = 3;

    // Dino properties
    this.dino = {
      x: 50,
      y: 150,
      width: 40,
      height: 40,
      velocityY: 0,
      isJumping: false,
      groundY: 150,
    };

    // Physics
    this.gravity = 0.6;
    this.jumpStrength = -12;

    // Ground
    this.groundY = 180;

    // Obstacles
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.obstacleSpawnRate = 120; // frames between spawns
    this.minObstacleSpawnRate = 60;

    // Animation frame counter
    this.frameCount = 0;

    // High score
    this.highScore = this.loadHighScore();

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.gameLoop();
    this.updateStatus("Click to Start!");
    this.updateHighScore();
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.handleJump();
      }
    });

    // Mouse/touch controls
    this.canvas.addEventListener("click", () => {
      this.handleJump();
    });

    // Prevent space bar from scrolling
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
      }
    });
  }

  handleJump() {
    if (this.gameState === "waiting") {
      this.startGame();
    } else if (this.gameState === "playing" && !this.dino.isJumping) {
      this.jump();
    } else if (this.gameState === "gameOver") {
      this.resetGame();
    }
  }

  startGame() {
    this.gameState = "playing";
    this.score = 0;
    this.gameSpeed = this.initialGameSpeed;
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.frameCount = 0;
    this.updateScore();
    this.updateStatus("");
    console.log("🎮 Game started!");
  }

  jump() {
    if (!this.dino.isJumping) {
      this.dino.velocityY = this.jumpStrength;
      this.dino.isJumping = true;
      console.log("🦘 Dino jumped!");
    }
  }

  spawnObstacle() {
    // Random obstacle types
    const obstacleTypes = [
      { width: 20, height: 40, type: "cactus-small" },
      { width: 25, height: 50, type: "cactus-medium" },
      { width: 30, height: 35, type: "cactus-wide" },
    ];

    const obstacle =
      obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

    this.obstacles.push({
      x: this.canvas.width,
      y: this.groundY - obstacle.height,
      width: obstacle.width,
      height: obstacle.height,
      type: obstacle.type,
    });
  }

  updateObstacles() {
    if (this.gameState !== "playing") return;

    // Spawn new obstacles
    this.obstacleSpawnTimer++;
    if (this.obstacleSpawnTimer >= this.obstacleSpawnRate) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Move and remove obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].x -= this.gameSpeed;

      // Remove obstacles that are off screen
      if (this.obstacles[i].x + this.obstacles[i].width < 0) {
        this.obstacles.splice(i, 1);
        this.score += 10; // Bonus points for avoiding obstacle
      }
    }
  }

  checkCollisions() {
    if (this.gameState !== "playing") return;

    for (let obstacle of this.obstacles) {
      if (
        this.dino.x < obstacle.x + obstacle.width &&
        this.dino.x + this.dino.width > obstacle.x &&
        this.dino.y < obstacle.y + obstacle.height &&
        this.dino.y + this.dino.height > obstacle.y
      ) {
        this.gameOver();
        return;
      }
    }
  }

  updateGameDifficulty() {
    if (this.gameState !== "playing") return;

    // Increase difficulty every 200 points
    const difficultyLevel = Math.floor(this.score / 200);
    this.gameSpeed = this.initialGameSpeed + (difficultyLevel * 0.5);
    this.obstacleSpawnRate = Math.max(
      this.minObstacleSpawnRate,
      120 - (difficultyLevel * 10),
    );
  }

  gameOver() {
    this.gameState = "gameOver";
    this.saveHighScore();
    this.updateHighScore();
    this.updateStatus("Game Over! Click to restart");
    console.log(`💀 Game Over! Final Score: ${Math.floor(this.score)}`);
  }

  loadHighScore() {
    return parseInt(localStorage.getItem("dinoHighScore")) || 0;
  }

  saveHighScore() {
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem("dinoHighScore", this.highScore);
      console.log(`🏆 New High Score: ${this.highScore}!`);
    }
  }

  updateHighScore() {
    if (this.highScoreElement) {
      this.highScoreElement.textContent = this.highScore;
    }
  }

  updatePhysics() {
    if (this.gameState !== "playing") return;

    this.frameCount++;

    // Apply gravity
    this.dino.velocityY += this.gravity;
    this.dino.y += this.dino.velocityY;

    // Ground collision
    if (this.dino.y >= this.dino.groundY) {
      this.dino.y = this.dino.groundY;
      this.dino.velocityY = 0;
      this.dino.isJumping = false;
    }

    // Update score (continuous scoring)
    this.score += 0.1;
    this.updateScore();

    // Update obstacles
    this.updateObstacles();

    // Check collisions
    this.checkCollisions();

    // Update difficulty
    this.updateGameDifficulty();
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ground line
    this.ctx.strokeStyle = "#8B4513";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.canvas.width, this.groundY);
    this.ctx.stroke();

    // Draw obstacles
    this.drawObstacles();

    // Draw dino
    this.drawDino();

    // Draw instructions if waiting
    if (this.gameState === "waiting") {
      this.drawInstructions();
    }

    // Draw game over screen
    if (this.gameState === "gameOver") {
      this.drawGameOver();
    }
  }

  drawObstacles() {
    this.ctx.fillStyle = "#2E7D32";

    for (let obstacle of this.obstacles) {
      // Draw main cactus body
      this.ctx.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
      );

      // Add cactus details based on type
      this.ctx.fillStyle = "#1B5E20";
      if (obstacle.type === "cactus-small") {
        // Small spikes
        this.ctx.fillRect(obstacle.x - 3, obstacle.y + 10, 6, 4);
        this.ctx.fillRect(
          obstacle.x + obstacle.width - 3,
          obstacle.y + 20,
          6,
          4,
        );
      } else if (obstacle.type === "cactus-medium") {
        // Medium spikes
        this.ctx.fillRect(obstacle.x - 4, obstacle.y + 8, 8, 6);
        this.ctx.fillRect(
          obstacle.x + obstacle.width - 4,
          obstacle.y + 15,
          8,
          6,
        );
        this.ctx.fillRect(
          obstacle.x + obstacle.width / 2 - 2,
          obstacle.y + 25,
          4,
          8,
        );
      } else if (obstacle.type === "cactus-wide") {
        // Wide cactus with multiple arms
        this.ctx.fillRect(obstacle.x - 5, obstacle.y + 5, 10, 8);
        this.ctx.fillRect(
          obstacle.x + obstacle.width - 5,
          obstacle.y + 10,
          10,
          8,
        );
        this.ctx.fillRect(
          obstacle.x + obstacle.width / 2 - 3,
          obstacle.y + 20,
          6,
          6,
        );
      }

      this.ctx.fillStyle = "#2E7D32"; // Reset color for next obstacle
    }
  }

  drawDino() {
    // Animate dino legs when running (simple animation)
    const legOffset = this.gameState === "playing" && !this.dino.isJumping
      ? Math.floor(this.frameCount / 10) % 2 * 2
      : 0;

    this.ctx.fillStyle = "#4CAF50";
    this.ctx.fillRect(
      this.dino.x,
      this.dino.y,
      this.dino.width,
      this.dino.height,
    );

    // Simple dino face
    this.ctx.fillStyle = "#2E7D32";
    // Eye
    this.ctx.fillRect(this.dino.x + 25, this.dino.y + 8, 4, 4);
    // Mouth
    this.ctx.fillRect(this.dino.x + 30, this.dino.y + 20, 8, 2);

    // Simple legs with running animation
    if (!this.dino.isJumping) {
      this.ctx.fillStyle = "#4CAF50";
      this.ctx.fillRect(
        this.dino.x + 10,
        this.dino.y + 40 + legOffset,
        6,
        8 - legOffset,
      );
      this.ctx.fillRect(
        this.dino.x + 24,
        this.dino.y + 40 - legOffset,
        6,
        8 + legOffset,
      );
    }
  }

  drawGameOver() {
    // Semi-transparent overlay
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Game Over text
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "36px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "GAME OVER",
      this.canvas.width / 2,
      this.canvas.height / 2 - 40,
    );

    // Final score
    this.ctx.font = "20px Arial";
    this.ctx.fillText(
      `Final Score: ${Math.floor(this.score)}`,
      this.canvas.width / 2,
      this.canvas.height / 2 - 5,
    );

    // High score
    if (Math.floor(this.score) === this.highScore && this.highScore > 0) {
      this.ctx.fillStyle = "#FFD700";
      this.ctx.fillText(
        "🏆 NEW HIGH SCORE! 🏆",
        this.canvas.width / 2,
        this.canvas.height / 2 + 25,
      );
    } else if (this.highScore > 0) {
      this.ctx.fillStyle = "#CCCCCC";
      this.ctx.fillText(
        `High Score: ${this.highScore}`,
        this.canvas.width / 2,
        this.canvas.height / 2 + 25,
      );
    }

    // Restart instruction
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "Click or press SPACE to restart",
      this.canvas.width / 2,
      this.canvas.height / 2 + 55,
    );
  }

  drawInstructions() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.font = "24px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Press SPACE or ↑ to jump!",
      this.canvas.width / 2,
      this.canvas.height / 2 - 20,
    );

    this.ctx.font = "16px Arial";
    this.ctx.fillText(
      "Click anywhere to start",
      this.canvas.width / 2,
      this.canvas.height / 2 + 10,
    );
  }

  updateScore() {
    this.scoreElement.textContent = Math.floor(this.score);
  }

  updateStatus(message) {
    this.statusElement.textContent = message;
    this.statusElement.style.display = message ? "block" : "none";
  }

  resetGame() {
    this.gameState = "waiting";
    this.score = 0;
    this.gameSpeed = this.initialGameSpeed;
    this.obstacles = [];
    this.obstacleSpawnTimer = 0;
    this.frameCount = 0;
    this.dino.y = this.dino.groundY;
    this.dino.velocityY = 0;
    this.dino.isJumping = false;
    this.updateScore();
    this.updateStatus("Click to Start!");
    console.log("🔄 Game reset!");
  }

  gameLoop() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Health check for server
async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    console.log("🎉 Server health check:", data);
  } catch (error) {
    console.error("❌ Health check failed:", error);
  }
}

// Initialize game when page loads
window.addEventListener("load", () => {
  checkHealth();
  new DinoGame();
  console.log(
    "🎯 Stage 3 complete: Full game with obstacles and collision detection!",
  );
});
