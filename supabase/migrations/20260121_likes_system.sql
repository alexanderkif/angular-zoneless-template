-- Likes System for Posts and Comments
-- Created: 2026-01-21
-- Description: Add likes/dislikes functionality

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Post likes/dislikes
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (1, -1)), -- 1 = like, -1 = dislike
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- Comment likes/dislikes
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (1, -1)), -- 1 = like, -1 = dislike
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(comment_id, user_id) -- One reaction per user per comment
);

-- =====================================================
-- 2. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON public.comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON public.comment_reactions(user_id);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_post_reactions_updated_at ON public.post_reactions;
CREATE TRIGGER update_post_reactions_updated_at
  BEFORE UPDATE ON public.post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comment_reactions_updated_at ON public.comment_reactions;
CREATE TRIGGER update_comment_reactions_updated_at
  BEFORE UPDATE ON public.comment_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Post reactions policies
CREATE POLICY "Anyone can read post reactions"
  ON public.post_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage their post reactions"
  ON public.post_reactions
  FOR ALL
  USING (true); -- Auth checked in API

-- Comment reactions policies
CREATE POLICY "Anyone can read comment reactions"
  ON public.comment_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage their comment reactions"
  ON public.comment_reactions
  FOR ALL
  USING (true); -- Auth checked in API

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.post_reactions IS 'Likes and dislikes for posts';
COMMENT ON TABLE public.comment_reactions IS 'Likes and dislikes for comments';
COMMENT ON COLUMN public.post_reactions.reaction IS 'Reaction type: 1 = like, -1 = dislike';
COMMENT ON COLUMN public.comment_reactions.reaction IS 'Reaction type: 1 = like, -1 = dislike';
