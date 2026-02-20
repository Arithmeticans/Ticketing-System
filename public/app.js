const API_BASE = '/api';

let selectedTicketId = null;

// =========================
// FETCH ALL TICKETS
// =========================
async function fetchTickets() {
    try {
        const res = await fetch(`${API_BASE}/tickets`);
        const tickets = await res.json();

        const ticketList = document.getElementById('tickets');
        ticketList.innerHTML = '';

        tickets.forEach(ticket => {
            const li = document.createElement('li');
            li.className = 'ticket-item';
            li.textContent = `#${ticket.ticket_id} - ${ticket.title} [${ticket.status}]`;

            li.addEventListener('click', () => {
                loadTicketDetails(ticket.ticket_id);
            });

            ticketList.appendChild(li);
        });

    } catch (err) {
        console.error('Error fetching tickets:', err);
    }
}

// =========================
// LOAD SINGLE TICKET + COMMENTS
// =========================
async function loadTicketDetails(ticketId) {
    try {
        selectedTicketId = ticketId;

        const res = await fetch(`${API_BASE}/tickets/${ticketId}`);
        const data = await res.json();

        renderTicketInfo(data.ticket);
        renderComments(data.comments);

    } catch (err) {
        console.error('Error loading ticket:', err);
    }
}

// =========================
// RENDER TICKET INFO
// =========================
function renderTicketInfo(ticket) {
    const container = document.getElementById('ticketInfo');

    container.innerHTML = `
        <p><strong>ID:</strong> ${ticket.ticket_id}</p>
        <p><strong>Title:</strong> ${ticket.title}</p>
        <p><strong>Description:</strong> ${ticket.description || 'N/A'}</p>
        <p><strong>Requested By:</strong> ${ticket.requested_by}</p>
        <p><strong>Status:</strong> ${ticket.status}</p>
        <p><strong>Priority:</strong> ${ticket.priority}</p>
        <p><strong>Urgency:</strong> ${ticket.urgency}</p>
        <p><strong>Assigned To:</strong> ${ticket.assigned_to || 'Unassigned'}</p>
        <p><strong>Created At:</strong> ${ticket.created_at}</p>
    `;
}

// =========================
// RENDER COMMENTS / LOGS
// =========================
function renderComments(comments) {
    const container = document.getElementById('comments');
    container.innerHTML = '';

    if (comments.length === 0) {
        container.innerHTML = '<p>No logs yet.</p>';
        return;
    }

    comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'comment-card';

        div.innerHTML = `
            <p><strong>Status:</strong> ${comment.current_status}</p>
            <p>${comment.message}</p>
            <small>${comment.created_at}</small>
            <hr/>
        `;

        container.appendChild(div);
    });
}

// =========================
// POST NEW COMMENT / LOG
// =========================
async function postComment(event) {
    event.preventDefault();

    if (!selectedTicketId) {
        alert('Please select a ticket first.');
        return;
    }

    const message = document.getElementById('message').value;
    const current_status = document.getElementById('current_status').value;

    try {
        const res = await fetch(`${API_BASE}/tickets/${selectedTicketId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                current_status
            })
        });

        if (!res.ok) {
            throw new Error('Failed to post comment');
        }

        document.getElementById('message').value = '';
        await loadTicketDetails(selectedTicketId);

    } catch (err) {
        console.error('Error posting comment:', err);
    }
}

// =========================
// EVENT LISTENERS
// =========================
document.getElementById('refreshBtn').addEventListener('click', fetchTickets);
document.getElementById('commentForm').addEventListener('submit', postComment);

// Initial load
fetchTickets();