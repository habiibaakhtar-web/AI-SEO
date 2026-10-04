CREATE TABLE sessions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE keywords (
  id uuid PRIMARY KEY, website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  keyword text NOT NULL, category text NOT NULL DEFAULT '', intent text NOT NULL DEFAULT 'informational'
    CHECK(intent IN ('informational','navigational','commercial','transactional')),
  priority text NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  target_page text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'planned',
  notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_items (
  id uuid PRIMARY KEY, website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('ideas','brief','meta','assistant')),
  input jsonb NOT NULL, output jsonb NOT NULL, source text NOT NULL CHECK(source IN ('ai','rule')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_items_website_idx ON content_items(website_id, created_at DESC);
ALTER TABLE audits ADD COLUMN recommendation_status text NOT NULL DEFAULT 'pending';
ALTER TABLE audits ADD COLUMN progress text NOT NULL DEFAULT 'Waiting to start';

