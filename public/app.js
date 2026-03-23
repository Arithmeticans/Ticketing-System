const API_BASE = "/api";

// Format date for display
const formatTime = (t) => new Date(t).toLocaleString();

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
                    <td><p>${formatTime(ticket.created_at)}</p></td>
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

                <h4>Edit Ticket</h4>
                <input type="text" id="assigned-${ticket.ticket_id}" placeholder="Assign to (name)" />
                
                <select id="status-${ticket.ticket_id}">
                    <option value="" selected disabled>-- Change status --</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                </select>

                <button onclick="updateTicket(${ticket.ticket_id})">Save Update</button>
                <button onclick='openEditTicket(${JSON.stringify(ticket).replace(/"/g,'&quot;')})'>
                    Edit Details
                </button>
                <button onclick="deleteTicket(${ticket.ticket_id})" style="background-color:#e74c3c; color:white;">
                    Delete Ticket
                </button>

                <h4>Updates / Work Notes</h4>
                <input type="text" id="comment-msg-${ticket.ticket_id}" placeholder="Write an update" />
                <input type="text" id="comment-next-${ticket.ticket_id}" placeholder="Next step" />
                <input type="text" id="comment-who-${ticket.ticket_id}" placeholder="Person in charge" />
                <input type="text" id="comment-status-${ticket.ticket_id}" placeholder="Business impact" />

                <button onclick="addComment(${ticket.ticket_id})">Add Log</button>

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
        div.slideDown(async () => await loadComments(ticketId));
    } else div.slideUp();
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
        commentsDiv.innerHTML = "<p>No updates yet.</p>";
        return;
    }

    const table = document.createElement("table");
    table.className = "comments-table";

    table.innerHTML = `
        <tr>
            <th>Time and Date</th>
            <th>Update / Notes</th>
            <th>Next Step</th>
            <th>Person in Charge</th>
            <th>Business Impact</th>
            <th>Edit</th>
        </tr>
    `;

    data.comments.slice().reverse().forEach(comment => {
        const row = document.createElement("tr");
        row.className = "comments-table-rows";
        row.innerHTML = `
            <td><p>${formatTime(comment.created_at)}</p></td>
            <td><p>${comment.message}</p></td>
            <td><p>${comment.next_step || ''}</p></td>
            <td><p>${comment.who || ''}</p></td>
            <td><p>${comment.current_status}</p></td>
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
// UPDATE TICKET
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
    const next_step = document.getElementById(`comment-next-${ticketId}`).value;
    const who = document.getElementById(`comment-who-${ticketId}`).value;

    if (!message || !current_status) {
        alert("Message and status are required");
        return;
    }

    await fetch(`${API_BASE}/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, current_status, next_step, who })
    });

    document.getElementById(`comment-msg-${ticketId}`).value = "";
    document.getElementById(`comment-next-${ticketId}`).value = "";
    document.getElementById(`comment-who-${ticketId}`).value = "";

    await loadComments(ticketId);
}

// =========================
// DELETE TICKET
// =========================
async function deleteTicket(ticketId) {
    const confirmDelete = confirm("Are you sure you want to delete this ticket and all its logs?");
    if (!confirmDelete) return;

    try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete ticket");

        alert("Ticket deleted successfully.");
        fetchTickets();
    } catch (err) {
        console.error(err);
        alert("Error deleting ticket.");
    }
}

// =========================
// MODAL HANDLING
// =========================
const modal = document.getElementById("editModal");
const closeModal = document.getElementById("closeModal");
const editForm = document.getElementById("editForm");
const editFields = document.getElementById("editFields");
let currentEdit = null;

closeModal.onclick = () => { modal.style.display = "none"; currentEdit = null; };
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// Open ticket modal
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
            <option value="Low">1 - Low</option>
            <option value="Medium">2 - Medium</option>
            <option value="High">3 - High</option>
            <option value="Critical">4 - Critical</option>
        </select>

        <label>Urgency</label>
        <select name="urgency">
            <option value="">-- Keep current --</option>
            <option value="Low">1 - Low</option>
            <option value="Medium">2 - Medium</option>
            <option value="High">3 - High</option>
            <option value="Critical">4 - Critical</option>
        </select>
    `;
    document.getElementById("modalTitle").innerText = `Edit Ticket #${ticket.ticket_id}`;
    modal.style.display = "block";
}

// Open comment modal
function openEditComment(ticketId, comment) {
    currentEdit = { type: "comment", ticketId, commentId: comment.comment_id };
    editFields.innerHTML = `
        <label>Update / Notes</label>
        <input type="text" name="message" value="${comment.message}" required />

        <label>Next Step</label>
        <input type="text" name="next_step" value="${comment.next_step || ''}" />

        <label>Person in Charge</label>
        <input type="text" name="who" value="${comment.who || ''}" />

        <label>Business Impact</label>
        <input type="text" name="current_status" value="${comment.current_status || ''}" />
    `;
    document.getElementById("modalTitle").innerText = `Edit Log #${comment.comment_id}`;
    modal.style.display = "block";
}

// Submit modal
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