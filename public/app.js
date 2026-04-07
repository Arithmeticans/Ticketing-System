const API_BASE = "/api";

const formatTime = (t) => new Date(t).toLocaleString();

let activeTicketId = null;

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
    fetchTickets();
});

// =========================
// Clean label for urgency/priority (remove "1 - ")
// =========================
const cleanLabel = (value) => {
    if (!value) return "";
    return value.includes(" - ")
        ? value.split(" - ")[1]
        : value;
};

// =========================
// FETCH + RENDER TABLE
// =========================
async function fetchTickets() {
    const res = await fetch(`${API_BASE}/tickets`);
    const tickets = await res.json();

    const tbody = document.getElementById("tickets-body");
    tbody.innerHTML = "";

    tickets.forEach(t => {
        const priorityLabel = cleanLabel(t.priority);
        const urgencyLabel = cleanLabel(t.urgency);

        tbody.innerHTML += `
            <tr>
                <td>${t.ticket_id}</td>
                <td>${formatTime(t.created_at)}</td>
                <td>${t.title}</td>
                <td>${t.requested_by}</td>
                <td>${t.assigned_to || "Unassigned"}</td>
                <td class="${priorityLabel}">${priorityLabel}</td>
                <td class="${urgencyLabel}">${urgencyLabel}</td>
                <td>${t.status}</td>
                <td>
                    <button onclick="openModal(${t.ticket_id})">Details</button>
                </td>
            </tr>
        `;
    });
}

// =========================
// CREATE TICKET
// =========================
    document.addEventListener("DOMContentLoaded", () => {
        fetchTickets();

        const form = document.getElementById("create-form");

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const data = {  
                title: document.getElementById("ct-title").value,
                description: document.getElementById("ct-description").value,
                requested_by: document.getElementById("ct-caller").value,
                priority: document.getElementById("ct-priority").value,
                urgency: document.getElementById("ct-urgency").value
            };

            const res = await fetch(`${API_BASE}/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!res.ok) {
                alert("Failed to create ticket");
                return;
            }

            form.reset();
            fetchTickets();
        });
});


// =========================
// OPEN MODAL (API DRIVEN)
// =========================
async function openModal(ticketId) {
    activeTicketId = ticketId;

    const res = await fetch(`${API_BASE}/tickets/${ticketId}`);
    const data = await res.json();

    const t = data.ticket;
    const comments = data.comments.slice().reverse(); // show latest first

    // Header
    document.getElementById("modal-title").textContent =
        `Ticket #${t.ticket_id} — ${t.title}`;

    // Info
    document.getElementById("modal-info").innerHTML = `
        <div><b>Caller:</b> ${t.requested_by}</div>
        <div><b>Assigned:</b> ${t.assigned_to || "Unassigned"}</div>
        <div><b>Priority:</b> ${t.priority}</div>
        <div><b>Status:</b> ${t.status}</div>
        <div><b>Urgency:</b> ${t.urgency}</div>
        <div><b>Created At:</b> ${formatTime(t.created_at)}</div>
    `;

    // description
    document.getElementById("modal-desc").innerHTML = `
        <div><b>Description:</b> ${t.description || "-"}</div>
    `;

    // Prefill
    document.getElementById("modal-assign").value = t.assigned_to || "";
    document.getElementById("modal-status").value = "";

    renderLogs(comments);

    document.getElementById("modal-backdrop").classList.add("open");
}

// =========================
// CLOSE MODAL
// =========================
function closeModal() {
    document.getElementById("modal-backdrop").classList.remove("open");
    activeTicketId = null;
}

// =========================
// SAVE TICKET UPDATE (API)
// =========================
async function saveTicketUpdate() {
    const assigned_to = document.getElementById("modal-assign").value;
    const status = document.getElementById("modal-status").value;

    const body = {};
    if (assigned_to) body.assigned_to = assigned_to;
    if (status) body.status = status;

    await fetch(`${API_BASE}/tickets/${activeTicketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    await openModal(activeTicketId);
    fetchTickets();
}

// =========================
// DELETE TICKET (API)
// =========================
async function deleteTicket() {
    if (!confirm("Delete this ticket?")) return;

    await fetch(`${API_BASE}/tickets/${activeTicketId}`, {
        method: "DELETE"
    });

    closeModal();
    fetchTickets();
}

// =========================
// ADD LOG (API)
// =========================
async function addLog() {
    const message = document.getElementById("log-update").value;
    const current_status = document.getElementById("log-impact").value;
    const next_step = document.getElementById("log-nextstep").value;

    if (!message || !current_status) {
        alert("Message and status required");
        return;
    }

    await fetch(`${API_BASE}/tickets/${activeTicketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, current_status, next_step })
    });

    openModal(activeTicketId);
}

// =========================
// RENDER LOGS
// =========================
function renderLogs(comments) {
    const tbody = document.getElementById("modal-logs");

    if (!comments.length) {
        tbody.innerHTML = `<tr><td colspan="4">No logs</td></tr>`;
        return;
    }

    tbody.innerHTML = comments.map(c => `
        <tr>
            <td>${formatTime(c.created_at)}</td>
            <td>${c.message}</td>
            <td>${c.next_step || ""}</td>
            <td>${c.current_status}</td>
        </tr>
    `).join("");
}

// =========================
// BACKDROP CLICK
// =========================
function handleBackdropClick(e) {
    if (e.target.id === "modal-backdrop") closeModal();
}

// =========================
// ESC KEY
// =========================
document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
});