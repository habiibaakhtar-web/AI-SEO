ALTER TABLE audits ADD COLUMN active_website uuid;
UPDATE audits SET active_website=website_id WHERE status IN ('queued','running');
CREATE UNIQUE INDEX audits_active_website_idx ON audits(active_website);
