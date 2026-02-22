const API_BASE = "/api";

// =========================
// Load tickets on page load
// =========================
document.addEventListener("DOMContentLoaded", () => {
    fetchTickets();
});

// =========================
// CREATE TICKET
// =========================
document.getElementById("ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        requested_by: document.getElementById("requested_by").value,
        priority: document.getElementById("priority").value,
        urgency: document.getElementById("urgency").value
    };

    await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    e.target.reset();
    fetchTickets();
});

// =========================
// FETCH ALL TICKETS
// =========================
async function fetchTickets() {
    const res = await fetch(`${API_BASE}/tickets`);
    const tickets = await res.json();

    const container = document.getElementById("ticketsContainer");
    container.innerHTML = "";

    tickets.forEach(ticket => {
        const ticketDiv = document.createElement("div");
        ticketDiv.className = "ticket-card";

        ticketDiv.innerHTML = `
            <table class ="ticket-card-table">
                <tr>
                    <td><strong>${ticket.ticket_id}</strong></td>
                    <td><p>${ticket.title}</p></td>
                    <td><p>${ticket.requested_by}</p></td>
                    <td><p>${ticket.assigned_to || "Unassigned"}</p></td>
                    <td class="priority ${ticket.priority?.toLowerCase()}"><p>${ticket.priority}</p></td>
                    <td class="urgency ${ticket.urgency?.toLowerCase()}"><p>${ticket.urgency}</p></td>
                    <td><strong>${ticket.status}</strong></td>
                    <td>
                        <button class="show-details-button" onclick="toggleDetails(${ticket.ticket_id})">
                            Show Details
                        </button>
                    </td>
                </tr>
            </table>

            <div id="details-${ticket.ticket_id}" class="details" style="display:none;">
                <p><strong>Description:</strong> ${ticket.description || "No description"}</p>

                <h4>Update Ticket</h4>
                <input type="text" id="assigned-${ticket.ticket_id}" placeholder="Assign to (name)" />
                
                <select id="status-${ticket.ticket_id}">
                    <option value="" selected disabled>-- Change status --</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>

                <button onclick="updateTicket(${ticket.ticket_id})">
                    Save Update
                </button>

                <button onclick='openEditTicket(${JSON.stringify(ticket).replace(/"/g,'&quot;')})'>
                    Edit Ticket
                </button>

                <h4>Logs / Comments</h4>
                <input type="text" id="comment-msg-${ticket.ticket_id}" placeholder="Write a log/update" />
                <select id="comment-status-${ticket.ticket_id}">
                    <option value="" selected disabled>-- Change status --</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>

                <button onclick="addComment(${ticket.ticket_id})">
                    Add Log
                </button>
                <button onclick="deleteTicket(${ticket.ticket_id})" style="background-color:#e74c3c; color:white;">
                    Delete Ticket
                </button>
                <div id="comments-${ticket.ticket_id}">Loading comments...</div>
            </div>
        `;

        container.appendChild(ticketDiv);
    });
}

// =========================
// TOGGLE DETAILS + LOAD COMMENTS
// =========================
async function toggleDetails(ticketId) {
    const div = $(`#details-${ticketId}`);

    if (div.is(":hidden")) {
        div.slideDown(async function() {
            await loadComments(ticketId);
        });
    } else {
        div.slideUp();
    }
}

// =========================
// LOAD COMMENTS
// =========================
async function loadComments(ticketId) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}`);
    const data = await res.json();

    const commentsDiv = document.getElementById(`comments-${ticketId}`);
    commentsDiv.innerHTML = "";

    if (data.comments.length === 0) {
        commentsDiv.innerHTML = "<p>No logs yet.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "comments-table";

    table.innerHTML = `
        <tr>
            <th><strong>Status</strong></th>
            <th><strong>Message</strong></th>
            <th><strong>Time and Date</strong></th>
            <th><strong>Edit</strong></th>
        </tr>
    `;

    data.comments.slice().reverse().forEach(comment => {
        const row = document.createElement("tr");
        row.className = "comments-table-rows";
        row.innerHTML = `
            <td><p>${comment.current_status}</p></td>
            <td><p>${comment.message}</p></td>
            <td><p>${comment.created_at}</p></td>
            <td>
                <button onclick='openEditComment(${ticketId}, ${JSON.stringify(comment).replace(/"/g,'&quot;')})'>
                    Edit
                </button>
            </td>
        `;
        table.appendChild(row);
    });

    commentsDiv.appendChild(table);
}

// =========================
// UPDATE TICKET (STATUS + ASSIGNED PERSON)
// =========================
async function updateTicket(ticketId) {
    const assigned_to = document.getElementById(`assigned-${ticketId}`).value;
    const status = document.getElementById(`status-${ticketId}`).value;

    const body = {};
    if (assigned_to) body.assigned_to = assigned_to;
    if (status) body.status = status;

    await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    fetchTickets();
}

// =========================
// ADD COMMENT / LOG
// =========================
async function addComment(ticketId) {
    const message = document.getElementById(`comment-msg-${ticketId}`).value;
    const current_status = document.getElementById(`comment-status-${ticketId}`).value;

    if (!message) {
        alert("Message is required");
        return;
    }

    await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, current_status })
    });

    document.getElementById(`comment-msg-${ticketId}`).value = "";
    await loadComments(ticketId);
}

// =========================
// DELETE TICKET
// =========================
async function deleteTicket(ticketId) {
    const confirmDelete = confirm("Are you sure you want to delete this ticket and all its logs?");
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            throw new Error("Failed to delete ticket");
        }

        alert("Ticket deleted successfully.");
        fetchTickets();
    } catch (err) {
        console.error(err);
        alert("Error deleting ticket.");
    }
}

// =========================
// MODAL POPUP FOR EDITING TICKETS & COMMENTS
// =========================
const modal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");
const editFields = document.getElementById("editFields");
let currentEdit = null;

closeModal.onclick = () => {
    modal.style.display = "none";
    currentEdit = null;
};
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
};

// =========================
// OPEN EDIT TICKET MODAL
// =========================
function openEditTicket(ticket) {
    currentEdit = { type: "ticket", ticketId: ticket.ticket_id };

    editFields.innerHTML = `
        <label>Title</label>
        <input type="text" name="title" value="${ticket.title}" required />

        <label>Description</label>
        <input type="text" name="description" value="${ticket.description || ""}" />

        <label>Assigned To</label>
        <input type="text" name="assigned_to" value="${ticket.assigned_to || ""}" />

        <label>Status</label>
        <select name="status">
            <option value="">-- Keep current --</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
        </select>

        <label>Priority</label>
        <select name="priority">
            <option value="">-- Keep current --</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
        </select>

        <label>Urgency</label>
        <select name="urgency">
            <option value="">-- Keep current --</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
        </select>
    `;

    document.getElementById("modalTitle").innerText = `Edit Ticket #${ticket.ticket_id}`;
    modal.style.display = "block";
}

// =========================
// OPEN EDIT COMMENT MODAL
// =========================
function openEditComment(ticketId, comment) {
    currentEdit = { type: "comment", ticketId, commentId: comment.comment_id };

    editFields.innerHTML = `
        <label>Message</label>
        <input type="text" name="message" value="${comment.message}" required />

        <label>Status</label>
        <select name="current_status">
            <option value="Open" ${comment.current_status==='Open'?'selected':''}>Open</option>
            <option value="In Progress" ${comment.current_status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Resolved" ${comment.current_status==='Resolved'?'selected':''}>Resolved</option>
            <option value="Closed" ${comment.current_status==='Closed'?'selected':''}>Closed</option>
        </select>
    `;

    document.getElementById("modalTitle").innerText = `Edit Log #${comment.comment_id}`;
    modal.style.display = "block";
}

// =========================
// SUBMIT MODAL FORM
// =========================
editForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!currentEdit) return;

    const formData = new FormData(editForm);
    const body = {};
    formData.forEach((v,k)=>{ if(v) body[k] = v });

    if (currentEdit.type === "ticket") {
        await fetch(`${API_BASE}/tickets/${currentEdit.ticketId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        fetchTickets();
    } else if (currentEdit.type === "comment") {
        await fetch(`${API_BASE}/tickets/${currentEdit.ticketId}/comments/${currentEdit.commentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        await loadComments(currentEdit.ticketId);
    }

    modal.style.display = "none";
    currentEdit = null;
};