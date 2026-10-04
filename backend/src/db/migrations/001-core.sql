CREATE TABLE users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE websites (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);
CREATE TABLE audits (
  id uuid PRIMARY KEY,
  website_id uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  status varchar(255) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  overall_score smallint CHECK (overall_score BETWEEN 0 AND 100),
  technical_score smallint CHECK (technical_score BETWEEN 0 AND 100),
  on_page_score smallint CHECK (on_page_score BETWEEN 0 AND 100),
  content_score smallint CHECK (content_score BETWEEN 0 AND 100),
  scoring_version varchar(255),
  coverage jsonb NOT NULL DEFAULT '{}',
  error_code varchar(255),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audits_website_created_idx ON audits(website_id, created_at DESC);
CREATE UNIQUE INDEX audits_one_active_per_website_idx ON audits(website_id) WHERE status IN ('queued', 'running');
CREATE TABLE crawled_pages (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  url text NOT NULL,
  http_status smallint CHECK (http_status BETWEEN 100 AND 599),
  evidence jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, url)
);
CREATE TABLE seo_issues (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  title text NOT NULL,
  category varchar(255) NOT NULL CHECK (category IN ('technical', 'on_page', 'content')),
  severity varchar(255) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  description text NOT NULL,
  why_it_matters text NOT NULL,
  recommendation text NOT NULL,
  page_url text NOT NULL,
  check_id text NOT NULL,
  status varchar(255) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'ignored')),
  evidence jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, audit_id)
);
CREATE INDEX seo_issues_audit_status_idx ON seo_issues(audit_id, status);
CREATE TABLE recommendations (
  id uuid PRIMARY KEY,
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL,
  recommendation text NOT NULL,
  reason text NOT NULL,
  priority varchar(255) NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  suggested_text text,
  source varchar(255) NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'rule')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (issue_id, audit_id) REFERENCES seo_issues(id, audit_id) ON DELETE CASCADE
);
CREATE INDEX recommendations_audit_idx ON recommendations(audit_id);

