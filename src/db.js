import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname (ES Module fix)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path: project_root/db/tickets.db
const dbPath = path.join(__dirname, '../db/tickets.db');

const db = new Database(dbPath);

// Enable foreign key constraints (CRITICAL for ON DELETE CASCADE)
db.pragma('foreign_keys = ON');

// Initialize schema
const init = () => {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            requested_by TEXT NOT NULL,
            
            status TEXT NOT NULL DEFAULT 'Open',
            priority TEXT NOT NULL DEFAULT 'Medium',
            urgency TEXT NOT NULL DEFAULT 'Medium',
            
            assigned_to TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            closed_at DATETIME
        );
    `).run();

    db.prepare(`
        CREATE TABLE IF NOT EXISTS ticket_comments (
            comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            current_status TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id)
                REFERENCES tickets(ticket_id)
                ON DELETE CASCADE
        );
    `).run();

    console.log('Database initialized.');
};

init();

export default db;