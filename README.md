# 🦕 Dino Runner Game - Stage 4: Database Integration & Social Features

Transform your game into a social experience with persistent data and player
customization! This stage adds PostgreSQL database integration, global
leaderboards, and player customization features.

## What you'll build

- 🗄️ PostgreSQL database integration with connection pooling
- 🏆 Global leaderboard system with persistent high scores
- 🎨 Player customization (dino colors, background themes, difficulty)
- 👤 Player identification and score tracking across sessions
- 🌐 RESTful API endpoints for data persistence
- ✨ Enhanced UI with modals and professional styling

## Step-by-step tutorial

This stage is broken into **4 deployable parts** - each builds on the previous
and can be deployed and tested independently:

### [4A: Database Setup & Player Names](./4a-database-setup.md)

- Set up PostgreSQL database and connection management
- Create basic database schema and migrations
- Add player name collection with modal interface
- **Deploy and test**: Players can enter names that persist between sessions

### [4B: Score Submission & Leaderboard](./4b-leaderboard-system.md)

- Create leaderboard database schema and API endpoints
- Implement score submission and global rankings
- Add leaderboard display to game interface
- **Deploy and test**: Scores are saved and displayed in a live leaderboard

### [4C: Player Customization](./4c-customization-system.md)

- Add player settings database schema and API
- Create customization modal with color/theme options
- Implement visual theme system and difficulty scaling
- **Deploy and test**: Customizations persist and change game appearance

### [4D: Enhanced UI & Polish](./4d-ui-enhancements.md)

⏱️ **~15 minutes**

- Create dedicated leaderboard page
- Add enhanced styling, animations, and error handling
- Implement graceful degradation for network issues
- **Deploy and test**: Complete professional-grade game experience

## Quick start options

### Option 1: Step-by-step learning (Recommended)

Follow the individual steps above to learn each concept thoroughly.

### Option 2: Complete Stage 4 instantly

Deploy the final result immediately:

[![Deploy on Deno](https://deno.com/button)](https://app.deno.com/new?clone=https://github.com/thisisjofrank/game-tutorial-stage-4.git&install=deno+install&entrypoint=src/main.ts&mode=dynamic)

## Prerequisites

- Completed Stage 3 (or use the Stage 3 starter as your foundation)
- [Deno](https://deno.com/) installed on your system
- A PostgreSQL database (we recommend [Neon](https://neon.tech/) for cloud
  hosting)
- VS Code or similar code editor
- Basic understanding of databases and APIs

## Learning objectives

After completing Stage 4, you'll understand:

- **Database Design**: Relational schema design with tables, keys, and
  relationships
- **SQL Operations**: Creating, reading, updating data with PostgreSQL
- **API Development**: RESTful endpoints with proper error handling
- **Connection Management**: Database pooling and resource optimization
- **Data Persistence**: Multiple storage layers and their appropriate uses
- **Full-Stack Integration**: Connecting frontend JavaScript with backend APIs
- **Production Deployment**: Environment configuration and database hosting

Ready to get started? Choose your path above and let's build something fun! 🏃‍➡️🦕
