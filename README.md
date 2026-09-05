# VoChat

VoChat is an enterprise-grade, voice-first ephemeral social and real-time messaging platform. It allows users to communicate through expiring voice notes, 24-hour audio stories, and an interactive audio social feed, featuring real-time audio pitch and rate modulation filters, streak tracking, and WebSocket-driven live presence.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [UML Sequence Diagram](#uml-sequence-diagram)
3. [Database Architecture and ER Model](#database-architecture-and-er-model)
4. [Core Features](#core-features)
5. [Voice Processing Engine](#voice-processing-engine)
6. [Technology Stack](#technology-stack)
7. [Directory Structure](#directory-structure)
8. [API Reference](#api-reference)
9. [WebSocket Event System](#websocket-event-system)
10. [Environment Variables](#environment-variables)
11. [Installation and Setup](#installation-and-setup)
12. [Security and Privacy](#security-and-privacy)
13. [License](#license)

---

## System Architecture

The following UML component and deployment diagram illustrates the system architecture of the VoChat ecosystem, representing the interaction between the cross-platform mobile client, backend application layers, real-time socket gateways, persistent storage, and third-party cloud services.

```mermaid
graph TD
    subgraph Client_Layer ["Mobile Client Layer (React Native / Expo SDK 54)"]
        UI["UI / Presentation Layer\n(Expo Router, Reanimated, Native Screens)"]
        AudioEngine["Audio Subsystem\n(Expo-AV Recording & Playback, Rate/Pitch Filter Engine)"]
        SocketClient["Socket.io Client\n(Real-Time Messaging & Status)"]
        ApiClient["HTTP / REST Client\n(Axios Interceptor, SecureStore Token)"]
    end

    subgraph Gateway_Layer ["API Gateway & Middleware Layer (Express 5)"]
        Router["Express Router & Route Handlers"]
        AuthMiddleware["Authentication & JWT Guard"]
        RateLimiter["Rate Limiting & Security\n(Helmet, Express Rate Limit)"]
        ValidationMiddleware["Input Validation Layer\n(Zod Schemas)"]
        UploadMiddleware["Media Upload Handler\n(Multer & Streamifier)"]
    end

    subgraph Service_Layer ["Backend Domain Modules"]
        AuthModule["Auth Module (OTP, Email Verification, Passwords)"]
        UserModule["User & Profile Module (Audio Bios, Privacy)"]
        MessageModule["Ephemeral Messaging Module (Expiry Logic)"]
        StoryModule["Stories Module (24h Window, View Tracking)"]
        PostModule["Audio Posts Module (Likes, Comments, Bookmarks)"]
        StreakModule["Streak Engine (Daily Activity, Freeze Logic)"]
        NotificationModule["Push Notification Engine (FCM)"]
    end

    subgraph RealTime_Layer ["Real-Time Gateway"]
        SocketServer["Socket.io Server"]
        PresenceManager["Presence & Connection Tracker"]
        RoomManager["Direct Message & Channel Rooms"]
    end

    subgraph Background_Workers ["Background Job Engine"]
        CronCleanup["Node-Cron Expiry Service\n(Ephemeral Message & Story Purge)"]
    end

    subgraph Persistence_Layer ["Data & Cloud Storage Services"]
        PrismaORM["Prisma ORM Layer (Prisma Client v7)"]
        PostgresDB[("PostgreSQL Relational Database")]
        CloudMedia[("Cloudinary / Firebase Storage\n(Audio Files & Media)")]
        FCM["Firebase Cloud Messaging (FCM Push Service)"]
    end

    %% Client to Gateway connections
    UI --> AudioEngine
    UI --> ApiClient
    UI --> SocketClient
    ApiClient --> RateLimiter
    RateLimiter --> AuthMiddleware
    AuthMiddleware --> ValidationMiddleware
    ValidationMiddleware --> Router

    %% Client to Real-Time
    SocketClient <--> SocketServer
    SocketServer --> PresenceManager
    SocketServer --> RoomManager

    %% Gateway to Modules
    Router --> AuthModule
    Router --> UserModule
    Router --> MessageModule
    Router --> StoryModule
    Router --> PostModule
    Router --> StreakModule
    Router --> NotificationModule
    UploadMiddleware --> CloudMedia

    %% Module to Persistence
    AuthModule --> PrismaORM
    UserModule --> PrismaORM
    MessageModule --> PrismaORM
    StoryModule --> PrismaORM
    PostModule --> PrismaORM
    StreakModule --> PrismaORM
    NotificationModule --> FCM
    PrismaORM --> PostgresDB

    %% Cron Tasks
    CronCleanup --> PrismaORM
```

---

## UML Sequence Diagram

This sequence diagram depicts the end-to-end lifecycle of an ephemeral voice message: recording, applying voice modulation, multipart upload to the media storage, persistence via Prisma, real-time dispatch over WebSockets, recipient consumption, and automated ephemeral purging.

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Sender (Client A)
    participant AudioRec as Expo-AV Engine
    participant ClientAPI as Mobile App Controller
    participant Server as VoChat Express Server
    participant Cloudinary as Cloud Storage
    participant DB as PostgreSQL Database
    participant WSS as Socket.io Server
    actor Receiver as Receiver (Client B)
    participant Cron as Expiration Cron Job

    Sender->>AudioRec: Record Audio Note
    AudioRec-->>Sender: Return Local URI & Buffer
    Sender->>AudioRec: Select Filter (e.g., Deep, Chipmunk, Robot)
    AudioRec-->>Sender: Apply Rate / Pitch Modulation & Preview
    Sender->>ClientAPI: Confirm & Send Message
    ClientAPI->>Server: POST /api/messages (Multipart Form Data with Audio & Filter)
    Server->>Cloudinary: Stream Buffer via Streamifier
    Cloudinary-->>Server: Return Hosted Media URL & Duration
    Server->>DB: INSERT INTO Message (expiresAt = now + 24h, isPlayed = false)
    DB-->>Server: Return Created Message Record
    Server->>WSS: Emit 'newMessage' to Receiver Room
    WSS->>Receiver: Deliver Real-Time Audio Payload
    Receiver->>Server: POST /api/messages/:id/played
    Server->>DB: UPDATE Message SET isPlayed = true, playedAt = now()
    Note over DB, Cron: Scheduled cron job verifies expired messages
    Cron->>DB: DELETE FROM Message WHERE expiresAt < now()
    DB-->>Cron: Purged Record Confirmation
```

---

## Database Architecture and ER Model

The data layer is managed via PostgreSQL with Prisma ORM. Below is the complete Entity-Relationship diagram illustrating relational cardinalities and domain boundaries.

```mermaid
erDiagram
    User ||--o{ Friendship : "initiates / receives"
    User ||--o{ Follow : "follows / followed_by"
    User ||--o{ Message : "sends / receives"
    User ||--o{ Post : "authors"
    User ||--o{ Story : "publishes"
    User ||--o{ StoryView : "views"
    User ||--o{ Like : "reacts"
    User ||--o{ Comment : "writes"
    User ||--o{ Bookmark : "saves"
    User ||--o{ Streak : "participates_in"
    User ||--o{ Media : "owns"
    User ||--o{ DeviceToken : "registers"

    Post ||--o{ Like : "receives"
    Post ||--o{ Comment : "contains"
    Post ||--o{ Bookmark : "bookmarked_by"

    Story ||--o{ StoryView : "tracked_by"

    Message ||--o| Media : "attaches"

    User {
        string id PK
        string name
        string username UK
        string email UK
        string password
        string avatarUrl
        string audioBioUrl
        string textBio
        boolean isOnline
        datetime lastSeen
        boolean isVerified
        boolean isPrivate
        datetime createdAt
        datetime updatedAt
    }

    Friendship {
        string id PK
        string userId FK
        string friendId FK
        string status
        datetime createdAt
        datetime updatedAt
    }

    Follow {
        string id PK
        string followerId FK
        string followingId FK
        datetime createdAt
    }

    Message {
        string id PK
        string senderId FK
        string receiverId FK
        string audioUrl
        string mediaId FK
        int duration
        string caption
        string voiceFilter
        boolean isPlayed
        datetime playedAt
        datetime expiresAt
        datetime createdAt
    }

    Post {
        string id PK
        string userId FK
        string audioUrl
        int duration
        string caption
        string voiceFilter
        string audience
        datetime createdAt
        datetime updatedAt
    }

    Story {
        string id PK
        string userId FK
        string audioUrl
        int duration
        string caption
        string voiceFilter
        datetime createdAt
        datetime expiresAt
    }

    StoryView {
        string id PK
        string storyId FK
        string userId FK
        datetime createdAt
    }

    Streak {
        string id PK
        string user1Id FK
        string user2Id FK
        int streakCount
        boolean streakFreezeUsed
        boolean user1Interacted
        boolean user2Interacted
        datetime lastInteractionDate
        datetime updatedAt
    }

    Like {
        string id PK
        string userId FK
        string postId FK
        datetime createdAt
    }

    Comment {
        string id PK
        string userId FK
        string postId FK
        string text
        datetime createdAt
    }

    Bookmark {
        string id PK
        string userId FK
        string postId FK
        datetime createdAt
    }

    Media {
        string id PK
        string userId FK
        string filePath
        int fileSize
        int duration
        string mimeType
        datetime createdAt
    }

    DeviceToken {
        string id PK
        string userId FK
        string token UK
        string platform
        datetime updatedAt
    }
```

---

## Core Features

### 1. Ephemeral Voice Messaging
- Direct peer-to-peer audio messaging with enforced lifespans.
- Messages auto-expire after a configured duration (default: 24 hours) or immediately after playback based on channel configuration.
- Read and playback receipts with timestamp metadata.

### 2. Real-Time Voice Modulation & Audio Filters
- On-the-fly audio modification using hardware-accelerated playback rate and pitch shift algorithms (`Expo-AV`).
- Filters include Normal, Deep Voice, Chipmunk, Robot, Fast Echo, and Low Bass.
- Preview modulation locally before confirming transmission.

### 3. 24-Hour Voice Stories
- Ephemeral audio status updates visible to connections for 24 hours.
- Live progress waveform rendering during playback.
- Story view tracking with viewer lists and timestamp metrics.

### 4. Audio Social Feed
- Public and friend-exclusive voice posts.
- Interactive engagement: likes, voice and text comments, bookmarks, and shareable audio links.
- Audience visibility toggles (`ALL` for public feeds, `FRIENDS` for private networks).

### 5. Interaction Streaks & Freeze Logic
- Tracks daily consecutive voice interactions between friends.
- Automatic streak calculation and status updating.
- Streak Freeze recovery mechanism to prevent broken progress.

### 6. User Profiles & Audio Bio
- Audio-first profile customization allowing users to record an audio bio snippet alongside standard avatar and text metadata.
- Private account controls restricting direct messaging and story views to mutual friendships.

### 7. Real-Time Presence & Socket Gateway
- Instant online and offline status detection.
- Live typing and recording indicators.
- Instantaneous delivery of incoming audio notifications and messages.

---

## Voice Processing Engine

VoChat employs an audio processing pipeline implemented across the mobile client and backend storage layers:

| Filter Name | Playback Rate (`setRateAsync`) | Pitch Correction Parameter | Acoustic Characteristics |
| :--- | :--- | :--- | :--- |
| **Normal** | `1.0x` | `true` | Original voice tone and duration |
| **Deep** | `0.75x` | `false` | Lower fundamental frequency, authoritative resonance |
| **Chipmunk** | `1.4x` | `false` | Higher fundamental frequency, fast tempo |
| **Robot** | `0.9x` | `false` | Metallic tonal profile |
| **Fast Forward**| `1.5x` | `true` | Preserved pitch with accelerated playback duration |
| **Slow Motion** | `0.65x` | `true` | Preserved pitch with decelerated tempo |

---

## Technology Stack

### Mobile Application (`vochat-android`)
- **Core Framework**: React Native (0.81.5), Expo SDK 54
- **Routing Engine**: Expo Router (v6) with file-based navigation
- **Language**: TypeScript (v5.9)
- **Audio Management**: Expo-AV (`Audio.Recording`, `Audio.Sound`)
- **Animation Suite**: React Native Reanimated (v4), React Native Worklets
- **State & Storage**: React Hooks, AsyncStorage, Expo SecureStore
- **Real-Time Client**: Socket.io-client (v4.8)
- **Network Layer**: Axios with centralized request/response interceptors

### Backend API Server (`vochat-backend`)
- **Runtime & Framework**: Node.js, Express (v5.2)
- **Database Access**: Prisma ORM (v7.8) with PostgreSQL Driver Adapter
- **Database Engine**: PostgreSQL
- **Real-Time Gateway**: Socket.io (v4.8)
- **Authentication**: JSON Web Tokens (JWT), bcryptjs password hashing
- **Data Validation**: Zod schema validation
- **File & Media Handling**: Multer, Cloudinary SDK, Streamifier
- **Push Notifications**: Firebase Admin SDK (Cloud Messaging)
- **Scheduled Workers**: Node-Cron (v4.2)
- **Security & Logging**: Helmet, CORS, Express-Rate-Limit, Winston, Morgan

---

## Directory Structure

```text
vochat/
├── vochat-android/                  # React Native / Expo Mobile Application
│   ├── app/                         # Expo Router screens and routes
│   │   ├── (tabs)/                  # Bottom tab navigation screens
│   │   │   ├── index.tsx            # Main social audio feed
│   │   │   ├── audio.tsx            # Voice explorer & trending clips
│   │   │   ├── friends.tsx          # Connections & direct messages
│   │   │   └── profile.tsx          # User profile & audio bio
│   │   ├── chat/                    # Direct messaging conversation routes
│   │   ├── record.tsx               # Voice recording modal & waveform
│   │   ├── voice-preview.tsx        # Filter selection & preview player
│   │   ├── streaks.tsx              # Streak overview & metrics
│   │   ├── edit-profile.tsx         # Profile edit & audio bio recording
│   │   ├── login.tsx                # Authentication login screen
│   │   ├── register.tsx             # User registration screen
│   │   ├── api.ts                   # Centralized Axios client & interceptors
│   │   └── socket.ts                # Socket.io connection manager
│   ├── components/                  # Reusable UI component library
│   │   ├── StoriesBar.tsx           # Horizontal stories rail
│   │   ├── StoryViewerModal.tsx     # Fullscreen story player with badge
│   │   └── Toast.tsx                # Notification toast provider
│   ├── constants/                   # Design tokens, themes, color palettes
│   └── package.json                 # Mobile dependencies and scripts
│
├── vochat-backend/                  # Node.js / Express REST & Socket API
│   ├── prisma/                      # Database configuration
│   │   ├── schema.prisma            # Relational database schema
│   │   └── seed.js                  # Database seed fixtures
│   ├── src/
│   │   ├── app.js                   # Application entry point & server bootstrap
│   │   ├── config/                  # Environment, Prisma client, Cloudinary configs
│   │   ├── middleware/              # Auth guard, error handlers, rate limiters
│   │   ├── modules/                 # Modular domain services
│   │   │   ├── auth/                # Login, registration, token issuance
│   │   │   ├── user/                # User management & bio updates
│   │   │   ├── message/             # Ephemeral message management
│   │   │   ├── stories/             # 24h story creation & view logs
│   │   │   ├── posts/               # Audio posts, likes, comments, bookmarks
│   │   │   ├── friend/              # Friend requests & status updates
│   │   │   ├── streak/              # Streak calculation & freeze logic
│   │   │   ├── media/               # Audio upload & asset streaming
│   │   │   └── notification/        # Device token registry & FCM dispatcher
│   │   ├── socket/                  # WebSocket gateway handlers and rooms
│   │   └── utils/                   # Shared logging, formatters, validation
│   └── package.json                 # Backend dependencies and scripts
│
├── .gitignore                       # Global git ignore configuration
└── README.md                        # Master project documentation
```

---

## API Reference

### Authentication Endpoints
- `POST /api/auth/register` - Create a new user account.
- `POST /api/auth/login` - Authenticate credentials and receive a JWT.
- `POST /api/auth/verify-otp` - Verify email OTP token.
- `POST /api/auth/resend-otp` - Request a refreshed verification code.

### Ephemeral Messages
- `POST /api/messages` - Send a voice message with multipart audio attachment.
- `GET /api/messages/:userId` - Fetch active messages for a specific conversation.
- `POST /api/messages/:id/played` - Mark message as played to trigger ephemerality rules.
- `DELETE /api/messages/:id` - Revoke or delete a message.

### Stories
- `POST /api/stories/create` - Upload and publish a 24-hour audio story.
- `GET /api/stories/feed` - Retrieve active stories from followed users.
- `POST /api/stories/:id/view` - Register a story view for the authenticated user.
- `DELETE /api/stories/:id` - Delete an active story before the 24-hour expiration.

### Audio Posts & Social Feed
- `POST /api/posts` - Create a new audio feed post.
- `GET /api/posts/feed` - Fetch public and friends audio posts with pagination.
- `POST /api/posts/:id/like` - Toggle like status on an audio post.
- `POST /api/posts/:id/comment` - Add a comment to an audio post.
- `POST /api/posts/:id/bookmark` - Save an audio post to bookmarks.

### Streaks & Friends
- `GET /api/streaks` - Retrieve active streaks across all active connections.
- `POST /api/streaks/freeze` - Activate a streak freeze for an ongoing streak.
- `POST /api/friends/request` - Send a friendship invitation.
- `PUT /api/friends/respond` - Accept or decline an incoming friend request.

---

## WebSocket Event System

The real-time service runs over Socket.io and facilitates instant interaction dispatching:

### Inbound Events (Client to Server)
- `joinRoom` - Join a private one-to-one conversation room (`payload: { roomId }`).
- `leaveRoom` - Leave a conversation room (`payload: { roomId }`).
- `typingStart` - Broadcast recording or typing activity (`payload: { receiverId }`).
- `typingStop` - Clear recording or typing activity (`payload: { receiverId }`).

### Outbound Events (Server to Client)
- `newMessage` - Dispatched when a new audio message is processed.
- `messagePlayed` - Notifies the sender when their voice note has been listened to.
- `userStatusChange` - Broadcasts live online/offline presence changes.
- `streakUpdated` - Notifies users when a streak counter advances.

---

## Environment Variables

### Backend Configuration (`vochat-backend/.env`)

```ini
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/vochat?schema=public"

# Authentication Security
JWT_SECRET="your-256-bit-secret-key-here"
JWT_EXPIRES_IN="7d"

# Media Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk..."
FIREBASE_STORAGE_BUCKET="your-project.appspot.com"

# Network & Rate Limiting
CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Cleanup Timers
MESSAGE_EXPIRY_HOURS=24
CLEANUP_CRON_INTERVAL="*/5 * * * *"
```

---

## Installation and Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- PostgreSQL (v14.0 or higher)
- npm or yarn package manager
- Expo Go CLI or Android Studio (for Android emulator testing)

### 1. Clone the Repository
```bash
git clone https://github.com/AviralNITW/Vochat.git
cd Vochat
```

### 2. Backend Setup
```bash
cd vochat-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials, Cloudinary, and JWT secrets

# Run database migrations and generate Prisma Client
npx prisma generate
npx prisma db push

# Optional: Seed the database
npm run db:seed

# Start the development server
npm run dev
```
The backend service will be active at `http://localhost:5000`.

### 3. Mobile Client Setup
```bash
cd ../vochat-android

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```
Use the Expo Go application or launch an Android emulator (`a` key in terminal) to run the application.

---

## Security and Privacy

- **Encrypted Password Storage**: User credentials hashed using bcrypt with salt rounds.
- **Stateless Authentication**: Protected API endpoints guarded by JWT bearer tokens.
- **Privacy Partitioning**: Private profile flag isolates stories, posts, and messaging access strictly to approved friends.
- **Ephemeral Auto-Deletion**: Automated backend cron worker regularly purges expired audio files and database records to prevent unneeded data retention.
- **Input Sanitization**: Request bodies sanitized and validated strictly via Zod schemas before hitting business layers.

---

## License

This project is licensed under the ISC License. Refer to the LICENSE file for details.
