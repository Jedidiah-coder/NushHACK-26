// Edit this list to change the checks officers complete.
const CHECKLIST = {
  name: "Fire safety walk",
  items: [
    "Fire exits clear",
    "Extinguishers in place",
    "Emergency lighting working",
    "Fire doors closed",
  ],
};
const RESULTS = ["Pass", "Fail", "N/A"];
const STATUS_CHECK_MS = 30000;
const MESSAGE_CHECK_MS = 5000;
const DEVICE_ID_KEY = "bits-device-id";
const SCROLL_END_MARGIN_PX = 60;

const tabs = [...document.querySelectorAll(".tab")];
const statusElement = document.getElementById("status");
const statusText = document.getElementById("status-text");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-text");
const messageError = document.getElementById("message-error");
const messageChat = document.getElementById("message-chat");
const messageList = document.getElementById("message-list");
const messagePanel = document.getElementById("panel-message");
const checklistForm = document.getElementById("checklist-form");
const checklistItems = document.getElementById("checklist-items");
const checklistError = document.getElementById("checklist-error");

// With no login yet, this anonymous ID is how a browser recognises its own messages.
function getDeviceId() {
  const createId = () =>
    crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = createId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return createId();
  }
}

const deviceId = getDeviceId();
let renderedMessages = "";

async function requestJson(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

function selectTab(tab) {
  for (const candidate of tabs) {
    const isSelected = candidate === tab;
    candidate.setAttribute("aria-selected", String(isSelected));
    candidate.tabIndex = isSelected ? 0 : -1;
    document.getElementById(candidate.getAttribute("aria-controls")).hidden = !isSelected;
  }
  if (!messagePanel.hidden) {
    scrollChatToEnd();
  }
}

function scrollChatToEnd() {
  messageChat.scrollTop = messageChat.scrollHeight;
}

function formatTime(isoTime) {
  return new Date(isoTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function createRecordItem(titleText, record, details = []) {
  const item = document.createElement("li");
  item.className = "record";

  const title = document.createElement("p");
  title.className = "record-title";
  title.textContent = titleText;
  item.append(title);

  for (const detail of details) {
    const line = document.createElement("p");
    line.className = "record-detail";
    line.textContent = detail;
    item.append(line);
  }

  const meta = document.createElement("p");
  meta.className = "record-meta";
  const syncLabel = record.synced ? "Synced" : "Pending upload";
  meta.textContent = `${formatTime(record.created_at)} · ${syncLabel}`;
  item.append(meta);
  return item;
}

function showList(listId, emptyId, items) {
  document.getElementById(listId).replaceChildren(...items);
  document.getElementById(emptyId).hidden = items.length > 0;
}

function formatDateLabel(date) {
  const startOfDay = (day) => new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (daysAgo === 0) {
    return "Today";
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { dateStyle: "medium" });
}

function createMessageBubble(record) {
  const isSent = record.data.sender === deviceId;
  const bubble = document.createElement("li");
  bubble.className = `message ${isSent ? "message-sent" : "message-received"}`;

  const text = document.createElement("p");
  text.textContent = record.data.text ?? record.data.note;

  const meta = document.createElement("p");
  meta.className = "message-meta";
  const time = new Date(record.created_at).toLocaleTimeString([], { timeStyle: "short" });
  if (!record.synced) {
    meta.textContent = `${time} · Pending upload`;
  } else if (isSent) {
    meta.textContent = `${time} `;
    const tick = document.createElement("span");
    tick.textContent = "✓";
    tick.title = "Synced";
    tick.setAttribute("role", "img");
    tick.setAttribute("aria-label", "Synced");
    meta.append(tick);
  } else {
    meta.textContent = time;
  }

  bubble.append(text, meta);
  return bubble;
}

function renderMessages(messages) {
  // Rebuilding only on a real change keeps any text the officer has selected.
  const snapshot = JSON.stringify([
    new Date().toDateString(),
    messages.map((record) => [record.id, record.synced]),
  ]);
  if (snapshot === renderedMessages) {
    return;
  }
  renderedMessages = snapshot;

  const distanceFromEnd =
    messageChat.scrollHeight - messageChat.scrollTop - messageChat.clientHeight;

  const items = [];
  let currentLabel = null;
  for (const record of messages) {
    const label = formatDateLabel(new Date(record.created_at));
    if (label !== currentLabel) {
      const separator = document.createElement("li");
      separator.className = "date-separator";
      separator.textContent = label;
      items.push(separator);
      currentLabel = label;
    }
    items.push(createMessageBubble(record));
  }
  messageList.replaceChildren(...items);
  document.getElementById("message-empty").hidden = messages.length > 0;

  // Stay put if the officer has scrolled up to read older messages.
  if (distanceFromEnd <= SCROLL_END_MARGIN_PX) {
    scrollChatToEnd();
  }
}

function describeInspection(record) {
  const results = record.data.results;
  const failures = results.filter((entry) => entry.result === "Fail");
  const details = failures.map((entry) => `Failed: ${entry.item}: ${entry.note}`);
  const summary = `${results.length - failures.length} of ${results.length} OK`;
  return createRecordItem(`${record.data.name}: ${summary}`, record, details);
}

async function refreshRecords() {
  const records = await requestJson("/api/records");
  records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // The "note" check keeps records saved by the first version of the page visible.
  const messages = records.filter((r) => r.data.type === "message" || r.data.note);
  const inspections = records.filter((r) => r.data.type === "checklist").reverse();

  renderMessages(messages);
  showList("inspection-list", "inspection-empty", inspections.map(describeInspection));
}

function showStatus(state, label, pending) {
  statusElement.dataset.state = state;
  statusText.textContent = pending > 0 ? `${label} · ${pending} pending` : label;
}

async function refreshStatus() {
  try {
    const { online, pending } = await requestJson("/api/status");
    showStatus(online ? "online" : "offline", online ? "Online" : "Offline", pending);
    if (online && pending > 0) {
      const result = await requestJson("/api/sync", { method: "POST" });
      showStatus("online", "Online", result.pending);
      await refreshRecords();
    }
  } catch (error) {
    console.warn(error);
    showStatus("offline", "Offline", 0);
  }
}

async function saveRecord(data) {
  await requestJson("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await Promise.all([refreshRecords(), refreshStatus()]);
}

function buildChecklist() {
  document.getElementById("checklist-title").textContent = CHECKLIST.name;

  checklistItems.replaceChildren(
    ...CHECKLIST.items.map((itemName, index) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "check-item";

      const legend = document.createElement("legend");
      legend.textContent = itemName;
      fieldset.append(legend);

      const options = document.createElement("div");
      options.className = "check-options";
      for (const result of RESULTS) {
        const label = document.createElement("label");
        label.className = "check-option";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `result-${index}`;
        radio.value = result;
        radio.required = true;
        const text = document.createElement("span");
        text.textContent = result;
        label.append(radio, text);
        options.append(label);
      }
      fieldset.append(options);

      const noteLabel = document.createElement("label");
      noteLabel.className = "check-note";
      noteLabel.hidden = true;
      noteLabel.textContent = "What's wrong?";
      const note = document.createElement("input");
      note.type = "text";
      note.name = `note-${index}`;
      note.maxLength = 500;
      note.autocomplete = "off";
      noteLabel.append(note);
      fieldset.append(noteLabel);

      options.addEventListener("change", (event) => {
        const isFail = event.target.value === "Fail";
        noteLabel.hidden = !isFail;
        note.required = isFail;
      });
      return fieldset;
    })
  );
}

function hideChecklistNotes() {
  for (const noteLabel of checklistItems.querySelectorAll(".check-note")) {
    noteLabel.hidden = true;
    noteLabel.querySelector("input").required = false;
  }
}

for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) {
      return;
    }
    const nextTab = tabs[(tabs.indexOf(tab) + step + tabs.length) % tabs.length];
    selectTab(nextTab);
    nextTab.focus();
  });
}

document.getElementById("get-started").addEventListener("click", () => {
  selectTab(document.getElementById("tab-checklist"));
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }
  messageError.textContent = "";
  try {
    await saveRecord({ type: "message", text, sender: deviceId });
    messageForm.reset();
    messageInput.focus();
    scrollChatToEnd();
  } catch (error) {
    console.warn(error);
    messageError.textContent = "Couldn't save your message. Please try again.";
  }
});

checklistForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(checklistForm);
  const results = CHECKLIST.items.map((item, index) => ({
    item,
    result: formData.get(`result-${index}`),
    note: (formData.get(`note-${index}`) ?? "").trim(),
  }));
  checklistError.textContent = "";
  try {
    await saveRecord({ type: "checklist", name: CHECKLIST.name, results });
    checklistForm.reset();
    hideChecklistNotes();
  } catch (error) {
    console.warn(error);
    checklistError.textContent = "Couldn't save your checklist. Please try again.";
  }
});

window.addEventListener("online", refreshStatus);
window.addEventListener("offline", refreshStatus);
setInterval(refreshStatus, STATUS_CHECK_MS);
setInterval(() => {
  if (!messagePanel.hidden && !document.hidden) {
    refreshRecords().catch(console.warn);
  }
}, MESSAGE_CHECK_MS);

buildChecklist();
refreshStatus();
refreshRecords().catch(console.warn);
