ALTER TABLE audits ADD COLUMN lease_expires_at timestamptz;
ALTER TABLE audits ADD COLUMN lease_owner uuid;
