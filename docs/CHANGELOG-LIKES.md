# Changelog: Likes System & UI Improvements

**Date:** January 21, 2026

## ✅ Completed Features

### 1. Reactions System (Likes/Dislikes)

#### Database

- ✅ Created migration `20260121_likes_system.sql`
  - `post_reactions` table with UNIQUE(post_id, user_id)
  - `comment_reactions` table with UNIQUE(comment_id, user_id)
  - Reaction values: `1` = like, `-1` = dislike
  - Applied to Supabase successfully

#### Backend API

- ✅ Created `/api/reactions` endpoint for toggling reactions
  - Supports both posts and comments
  - Returns updated like/dislike counts
  - Handles create/update/delete operations

- ✅ Updated `/api/posts` (GET) to include:
  - `likes`: number of likes per post
  - `dislikes`: number of dislikes per post
  - `userReaction`: current user's reaction (1, -1, or null)

- ✅ Updated `/api/posts/[id]` (GET) to include:
  - Reactions for the post
  - Reactions for all comments
  - User's current reaction for each item

#### Frontend

- ✅ Extended `Post` and `Comment` interfaces with reaction fields
- ✅ Added `toggleReaction()` method to PostQueryService
- ✅ Updated PostComponent with:
  - Like/dislike buttons with thumbs up/down icons
  - Real-time count display
  - Active state highlighting for user's reaction
  - Optimistic updates via TanStack Query mutations
  - Click handler that stops event propagation

### 2. Post Creation Form

- ✅ Created `PostFormComponent` with:
  - Reactive forms with validation
  - Title field (max 200 characters)
  - Content textarea (max 50000 characters)
  - Character counters
  - Error messages
  - Modal overlay with backdrop
  - Create/Edit modes support

### 3. FAB (Floating Action Button)

- ✅ Added FAB to PostsListComponent:
  - Fixed position (bottom-right)
  - Material Design style
  - Plus icon
  - Opens post creation form
  - Smooth hover animations
  - Proper z-index layering

### 4. UI Translations

- ✅ Translated all new UI elements to English:
  - Post form labels and buttons
  - FAB aria-labels
  - Comment button text
  - Error messages
  - Modal titles

## 📐 Technical Details

### Optimistic Updates

The like/dislike system uses optimistic updates for instant UI feedback:

1. User clicks like/dislike
2. UI updates immediately (local state)
3. API request sent in background
4. Real counts updated on response

### Database Schema

```sql
-- Post Reactions
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Comment Reactions
CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);
```

### API Endpoints

| Endpoint          | Method | Description                        |
| ----------------- | ------ | ---------------------------------- |
| `/api/reactions`  | POST   | Toggle reaction on post/comment    |
| `/api/posts`      | GET    | List posts with reaction counts    |
| `/api/posts/[id]` | GET    | Get post + comments with reactions |

## 🧪 Testing Instructions

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:4200
3. Log in with your account
4. Go to `/posts` page
5. Click the blue FAB button (bottom-right) to create a post
6. Fill form and submit
7. Try clicking like/dislike buttons on posts
8. Click a post to view details
9. Like/dislike comments

## 📝 Notes

- Reactions are mutually exclusive (can only like OR dislike, not both)
- Clicking the same reaction again removes it
- All text is now in English to match the rest of the application
- The system uses Vercel-friendly architecture (minimal endpoints)
- Optimistic updates provide instant feedback before server confirmation
