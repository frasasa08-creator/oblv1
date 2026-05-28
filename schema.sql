-- BossBot Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Welcome System Configuration
CREATE TABLE IF NOT EXISTS welcome_config (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) UNIQUE NOT NULL,
    welcome_channel VARCHAR(20),
    welcome_log_channel VARCHAR(20),
    quit_log_channel VARCHAR(20),
    welcome_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket System Configuration
CREATE TABLE IF NOT EXISTS ticket_config (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) UNIQUE NOT NULL,
    log_channel VARCHAR(20),
    title TEXT,
    description TEXT,
    options JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server Logs
CREATE TABLE IF NOT EXISTS server_logs (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    log_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    user_id VARCHAR(20),
    user_tag VARCHAR(100),
    moderator_id VARCHAR(20),
    moderator_tag VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_server_logs_guild_id ON server_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_server_logs_log_type ON server_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_server_logs_created_at ON server_logs(created_at DESC);

-- Bot Configuration
CREATE TABLE IF NOT EXISTS bot_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default bot configuration
INSERT INTO bot_config (key, value) VALUES
    ('bot_name', 'BossBot'),
    ('bot_status', 'Online'),
    ('bot_activity_type', 'PLAYING')
ON CONFLICT (key) DO NOTHING;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_welcome_config_updated_at BEFORE UPDATE ON welcome_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_config_updated_at BEFORE UPDATE ON ticket_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
