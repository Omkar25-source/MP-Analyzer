-- users_schema.sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    -- Adding a unique constraint is best practice for emails
    CONSTRAINT unique_email UNIQUE (email)
);