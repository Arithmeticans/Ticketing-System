import express from 'express';
import db from '../db.js';

const router = express.Router();

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
// GET ALL TICKETS
// =========================
router.get('/tickets', (req, res) => {
    try {
        const tickets = db.prepare(`
            SELECT * FROM tickets
            ORDER BY created_at DESC
        `).all();

        return res.json(tickets);

    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// =========================
// GET SINGLE TICKET + COMMENTS
// =========================
router.get('/tickets/:id', (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = db.prepare(`
            SELECT * FROM tickets WHERE ticket_id = ?
        `).get(id);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const comments = db.prepare(`
            SELECT * FROM ticket_comments
            WHERE ticket_id = ?
            ORDER BY created_at ASC
        `).all(id);

        return res.json({ ticket, comments });

    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

// =========================
// UPDATE TICKET STATUS / ASSIGNMENT
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
        return res.status(500).json({ error: 'Failed to update ticket' });
    }
});

// =========================
// UPDATE COMMENT / LOG
// =========================
router.put('/tickets/:ticketId/comments/:commentId', (req, res) => {
    try {
        if (!req.body) return res.status(400).json({ error: 'Request body must be JSON.' });

        const ticketId = Number(req.params.ticketId);
        const commentId = Number(req.params.commentId);

        if (Number.isNaN(ticketId) || Number.isNaN(commentId)) {
            return res.status(400).json({ error: 'Invalid ID' });
        }

        const { message, current_status } = req.body;

        if (!message && !current_status) {
            return res.status(400).json({ error: 'At least message or current_status required.' });
        }

        const stmt = db.prepare(`
            UPDATE ticket_comments
            SET 
                message = COALESCE(?, message),
                current_status = COALESCE(?, current_status)
            WHERE comment_id = ? AND ticket_id = ?
        `);

        const result = stmt.run(
            message ?? null,
            current_status ?? null,
            commentId,
            ticketId
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        return res.json({ message: 'Comment updated successfully' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update comment' });
    }
});

// =========================
// ADD COMMENT TO TICKET
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

        const { message, current_status } = req.body;

        if (!message || !current_status) {
            return res.status(400).json({
                error: 'message and current_status are required.'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO ticket_comments (ticket_id, current_status, message)
            VALUES (?, ?, ?)
        `);

        stmt.run(id, current_status, message);

        return res.status(201).json({ message: 'Comment added successfully' });

    } catch (err) {
        return res.status(500).json({ error: 'Failed to add comment' });
    }
});


// =========================
// DELETE TICKET (CASCADE COMMENTS)
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
        return res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

export default router;