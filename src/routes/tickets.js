import express from 'express';
import db from '../db.js';

const router = express.Router();

// =========================
// TIME NORMALIZER (FIX)
// =========================
function toISO(row) {
    if (!row) return row;

    const copy = { ...row };

    if (copy.created_at) {
        copy.created_at = new Date(copy.created_at + 'Z').toISOString();
    }

    if (copy.updated_at) {
        copy.updated_at = new Date(copy.updated_at + 'Z').toISOString();
    }

    if (copy.closed_at) {
        copy.closed_at = new Date(copy.closed_at + 'Z').toISOString();
    }

    return copy;
}

// =========================
// CREATE A TICKET
// =========================
router.post('/tickets', (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body must be JSON.' });
        }

        const { title, description, requested_by, priority, urgency } = req.body;

        if (!title || !requested_by) {
            return res.status(400).json({
                error: 'title and requested_by are required.'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO tickets (title, description, requested_by, priority, urgency)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            title,
            description ?? null,
            requested_by,
            priority ?? 'Medium',
            urgency ?? 'Medium'
        );

        return res.status(201).json({
            message: 'Ticket created successfully',
            ticket_id: result.lastInsertRowid
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to create ticket' });
    }
});

// =========================
// GET ALL TICKETS (FIXED)
// =========================
router.get('/tickets', (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT * FROM tickets
            ORDER BY created_at DESC
        `).all();

        const normalized = tickets.map(toISO);

        return res.json(normalized);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// =========================
// GET SINGLE TICKET + COMMENTS (FIXED)
// =========================
router.get('/tickets/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticketRaw = db.prepare(`
            SELECT * FROM tickets WHERE ticket_id = ?
        `).get(id);

        if (!ticketRaw) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const commentsRaw = db.prepare(`
            SELECT * FROM ticket_comments
            WHERE ticket_id = ?
            ORDER BY created_at ASC
        `).all(id);

        const ticket = toISO(ticketRaw);
        const comments = commentsRaw.map(toISO);

        return res.json({ ticket, comments });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// =========================
// UPDATE TICKET
// =========================
router.put('/tickets/:id', (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body must be JSON.' });
        }

        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const { title, description, status, assigned_to, priority, urgency } = req.body;

        const stmt = db.prepare(`
            UPDATE tickets
            SET 
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                assigned_to = COALESCE(?, assigned_to),
                priority = COALESCE(?, priority),
                urgency = COALESCE(?, urgency),
                updated_at = CURRENT_TIMESTAMP
            WHERE ticket_id = ?
        `);

        const result = stmt.run(
            title ?? null,
            description ?? null,
            status ?? null,
            assigned_to ?? null,
            priority ?? null,
            urgency ?? null,
            id
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        return res.json({ message: 'Ticket updated successfully' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// =========================
// ADD COMMENT
// =========================
router.post('/tickets/:id/comments', (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body must be JSON.' });
        }

        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const { message, current_status, next_step, who } = req.body;

        if (!message || !current_status) {
            return res.status(400).json({
                error: 'message and current_status are required.'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO ticket_comments (ticket_id, current_status, message, next_step, who)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            current_status,
            message,
            next_step ?? null,
            who ?? null
        );

        return res.status(201).json({ message: 'Comment added successfully' });

    } catch (err) {
        console.error("ADD COMMENT ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
});

// =========================
// DELETE TICKET
// =========================
router.delete('/tickets/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const result = db.prepare(`
            DELETE FROM tickets WHERE ticket_id = ?
        `).run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        return res.json({ message: 'Ticket deleted successfully' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

export default router;