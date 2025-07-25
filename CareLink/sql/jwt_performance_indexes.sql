-- JWT Performance Optimization Indexes
-- Run this SQL script to improve JWT token refresh performance

-- Index for JTI lookups on outstanding tokens
CREATE INDEX IF NOT EXISTS idx_outstanding_token_jti 
ON token_blacklist_outstandingtoken (jti);

-- Index for user-based token lookups
CREATE INDEX IF NOT EXISTS idx_outstanding_token_user 
ON token_blacklist_outstandingtoken (user_id);

-- Index for blacklisted token cleanup by date
CREATE INDEX IF NOT EXISTS idx_blacklisted_token_created 
ON token_blacklist_blacklistedtoken (blacklisted_at);

-- Composite index for user and creation date queries
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_created 
ON token_blacklist_outstandingtoken (user_id, created_at);

-- Show the indexes that were created
SHOW INDEX FROM token_blacklist_outstandingtoken;
SHOW INDEX FROM token_blacklist_blacklistedtoken;
