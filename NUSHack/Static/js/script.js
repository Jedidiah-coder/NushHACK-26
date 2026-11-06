// Used until someone saves their own version with the Edit checklist button.
const DEFAULT_CHECKLIST = {
  name: "Fire safety walk",
  items: [
    "Fire exits clear",
    "Extinguishers in place",
    "Emergency lighting working",
    "Fire doors closed",
  ],
};
const RESULTS = ["Pass", "Fail", "N/A"];
const MAX_CHECKLIST_TASKS = 50;
const STATUS_CHECK_MS = 30000;
const RECORD_CHECK_MS = 5000;
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
const messageEmpty = document.getElementById("message-empty");
const messageSend = document.getElementById("message-send");
const recipientSelect = document.getElementById("message-recipient");
const noticeForm = document.getElementById("notice-form");
const noticeInput = document.getElementById("notice-text");
const noticeError = document.getElementById("notice-error");
const checklistForm = document.getElementById("checklist-form");
const checklistItems = document.getElementById("checklist-items");
const checklistError = document.getElementById("checklist-error");
const checklistEditButton = document.getElementById("checklist-edit");
const checklistEditor = document.getElementById("checklist-editor");
const editorName = document.getElementById("editor-name");
const editorTaskList = document.getElementById("editor-task-list");
const editorError = document.getElementById("editor-error");

const currentUserId = document.body.dataset.userId;
let allMessages = [];
let renderedMessages = "";
let renderedUsers = "";
let currentChecklist = DEFAULT_CHECKLIST;
let renderedChecklist = "";
const renderedLists = {};

async function requestJson(path, options) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    window.location.assign("/login");
  }
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
  const author = record.data.sender_name ? `${record.data.sender_name} · ` : "";
  meta.textContent = `${author}${formatTime(record.created_at)} · ${syncLabel}`;
  item.append(meta);
  return item;
}

function showList(listId, emptyId, records, createItem) {
  // Rebuilding only on a real change keeps focus and any selected text in place.
  const snapshot = JSON.stringify(records.map((record) => [record.id, record.synced]));
  if (snapshot === renderedLists[listId]) {
    return;
  }
  renderedLists[listId] = snapshot;
  document.getElementById(listId).replaceChildren(...records.map(createItem));
  document.getElementById(emptyId).hidden = records.length > 0;
}

function createNoticeItem(record) {
  const item = createRecordItem(record.data.text, record);
  item.classList.add("notice");
  if (record.data.sender_id === currentUserId) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Take down";
    button.addEventListener("click", () => takeDownNotice(record.id));
    item.append(button);
  }
  return item;
}

async function takeDownNotice(noticeId) {
  if (!window.confirm("Take down this notice?")) {
    return;
  }
  noticeError.textContent = "";
  try {
    await requestJson(`/api/notices/${encodeURIComponent(noticeId)}`, { method: "DELETE" });
    await Promise.all([refreshRecords(), refreshStatus()]);
  } catch (error) {
    console.warn(error);
    noticeError.textContent = "Couldn't take down the notice. Please try again.";
  }
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
  const isSent = record.data.sender_id === currentUserId;
  const bubble = document.createElement("li");
  bubble.className = `message ${isSent ? "message-sent" : "message-received"}`;

  const text = document.createElement("p");
  text.textContent = record.data.text;

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

function renderMessages() {
  const personId = recipientSelect.value;
  const messages = allMessages.filter(
    (record) => record.data.sender_id === personId || record.data.recipient_id === personId
  );

  // Rebuilding only on a real change keeps any text the officer has selected.
  const snapshot = JSON.stringify([
    new Date().toDateString(),
    personId,
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
  messageEmpty.hidden = messages.length > 0;
  messageEmpty.textContent = personId
    ? "No messages yet. Say hello."
    : "Select a person to start messaging.";

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

  allMessages = records.filter((r) => r.data.type === "message");
  const notices = records.filter((r) => r.data.type === "notice").reverse();
  const inspections = records.filter((r) => r.data.type === "checklist").reverse();
  const checklistVersions = records.filter((r) => r.data.type === "checklist_template");

  // Records are sorted oldest first, so the last version is the current one.
  showChecklist(checklistVersions.at(-1)?.data ?? DEFAULT_CHECKLIST);
  renderMessages();
  showList("notice-list", "notice-empty", notices, createNoticeItem);
  showList("inspection-list", "inspection-empty", inspections, describeInspection);
}

function updateConversation() {
  const hasPerson = Boolean(recipientSelect.value);
  messageInput.disabled = !hasPerson;
  messageSend.disabled = !hasPerson;
  renderMessages();
  scrollChatToEnd();
}

async function refreshUsers() {
  const users = await requestJson("/api/users");
  const snapshot = JSON.stringify(users);
  // Rebuilding only on a real change stops an open dropdown from closing.
  if (snapshot === renderedUsers) {
    return;
  }
  renderedUsers = snapshot;

  const selected = recipientSelect.value;
  const placeholder = new Option(users.length ? "Select a person" : "No other users yet", "");
  recipientSelect.replaceChildren(
    placeholder,
    ...users.map((user) => new Option(user.name, user.id))
  );
  recipientSelect.value = users.some((user) => user.id === selected) ? selected : "";
  updateConversation();
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

function readChecklistAnswers() {
  const formData = new FormData(checklistForm);
  return currentChecklist.items.flatMap((item, index) => {
    const result = formData.get(`result-${index}`);
    return result ? [{ item, result, note: formData.get(`note-${index}`) ?? "" }] : [];
  });
}

// Someone else can edit the checklist while an officer is filling it in.
function restoreChecklistAnswers(answers) {
  for (const answer of answers) {
    const index = currentChecklist.items.indexOf(answer.item);
    if (index === -1) {
      continue;
    }
    const radio = checklistForm.querySelector(
      `input[name="result-${index}"][value="${answer.result}"]`
    );
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    checklistForm.elements[`note-${index}`].value = answer.note;
  }
}

function showChecklist(checklist) {
  const snapshot = JSON.stringify([checklist.name, checklist.items]);
  if (snapshot === renderedChecklist) {
    return;
  }
  renderedChecklist = snapshot;

  const answers = readChecklistAnswers();
  currentChecklist = checklist;
  buildChecklist();
  restoreChecklistAnswers(answers);
}

function addEditorTask(value = "") {
  const row = document.createElement("li");
  row.className = "editor-task";

  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.textContent = "Task";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 200;
  input.autocomplete = "off";
  input.value = value;
  input.id = `editor-task-${crypto.getRandomValues(new Uint32Array(1))[0]}`;
  label.htmlFor = input.id;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => {
    const neighbour = row.nextElementSibling ?? row.previousElementSibling;
    row.remove();
    (neighbour?.querySelector("input") ?? document.getElementById("editor-add-task")).focus();
  });

  row.append(label, input, remove);
  editorTaskList.append(row);
  return input;
}

function openChecklistEditor() {
  editorName.value = currentChecklist.name;
  editorTaskList.replaceChildren();
  currentChecklist.items.forEach((item) => addEditorTask(item));
  editorError.textContent = "";
  checklistForm.hidden = true;
  checklistEditButton.hidden = true;
  checklistEditor.hidden = false;
  editorName.focus();
}

function closeChecklistEditor() {
  checklistEditor.hidden = true;
  checklistForm.hidden = false;
  checklistEditButton.hidden = false;
  checklistEditButton.focus();
}

function buildChecklist() {
  document.getElementById("checklist-title").textContent = currentChecklist.name;

  checklistItems.replaceChildren(
    ...currentChecklist.items.map((itemName, index) => {
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

recipientSelect.addEventListener("change", () => {
  updateConversation();
  if (recipientSelect.value) {
    messageInput.focus();
  }
});

noticeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = noticeInput.value.trim();
  if (!text) {
    return;
  }
  noticeError.textContent = "";
  try {
    await saveRecord({ type: "notice", text });
    noticeForm.reset();
  } catch (error) {
    console.warn(error);
    noticeError.textContent = "Couldn't save your notice. Please try again.";
  }
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !recipientSelect.value) {
    return;
  }
  messageError.textContent = "";
  try {
    await saveRecord({ type: "message", text, recipient_id: recipientSelect.value });
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
  const results = currentChecklist.items.map((item, index) => ({
    item,
    result: formData.get(`result-${index}`),
    note: (formData.get(`note-${index}`) ?? "").trim(),
  }));
  checklistError.textContent = "";
  try {
    await saveRecord({ type: "checklist", name: currentChecklist.name, results });
    checklistForm.reset();
    hideChecklistNotes();
  } catch (error) {
    console.warn(error);
    checklistError.textContent = "Couldn't save your checklist. Please try again.";
  }
});

checklistEditButton.addEventListener("click", openChecklistEditor);
document.getElementById("editor-cancel").addEventListener("click", closeChecklistEditor);
document.getElementById("editor-add-task").addEventListener("click", () => {
  addEditorTask().focus();
});

checklistEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = editorName.value.trim();
  const items = [...editorTaskList.querySelectorAll("input")]
    .map((input) => input.value.trim())
    .filter(Boolean);

  if (!name) {
    editorError.textContent = "Enter a checklist name.";
    return;
  }
  if (items.length === 0 || items.length > MAX_CHECKLIST_TASKS) {
    editorError.textContent = `Add between 1 and ${MAX_CHECKLIST_TASKS} tasks.`;
    return;
  }
  if (new Set(items).size !== items.length) {
    editorError.textContent = "Each task must be different.";
    return;
  }

  editorError.textContent = "";
  try {
    await saveRecord({ type: "checklist_template", name, items });
    closeChecklistEditor();
  } catch (error) {
    console.warn(error);
    editorError.textContent = "Couldn't save the checklist. Please try again.";
  }
});

window.addEventListener("online", refreshStatus);
window.addEventListener("offline", refreshStatus);
setInterval(() => {
  refreshStatus();
  refreshUsers().catch(console.warn);
}, STATUS_CHECK_MS);
setInterval(() => {
  if (!document.hidden) {
    refreshRecords().catch(console.warn);
  }
}, RECORD_CHECK_MS);

showChecklist(DEFAULT_CHECKLIST);
refreshStatus();
refreshUsers().catch(console.warn);
refreshRecords().catch(console.warn);
