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
const MAX_SEPARATE_NOTIFICATIONS = 3;
const NOTICE_PREVIEW_LENGTH = 120;
const NOTIFICATION_DISMISSED_KEY = "bits-notification-prompt-dismissed";
const NOTIFICATIONS_BLOCKED_TEXT =
  "Notifications are blocked. To turn them on, allow them for this site in your browser's settings.";

const tabs = [...document.querySelectorAll(".tab")];
const statusElement = document.getElementById("status");
const statusText = document.getElementById("status-text");
const dataReset = document.getElementById("data-reset");
const resetResult = document.getElementById("reset-result");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-text");
const messageError = document.getElementById("message-error");
const messageChat = document.getElementById("message-chat");
const messageList = document.getElementById("message-list");
const messagePanel = document.getElementById("panel-message");
const homePanel = document.getElementById("panel-home");
// Only an admin's page has the Accounts tab, so these are null for everyone else.
const accountsPanel = document.getElementById("panel-accounts");
const accountList = document.getElementById("account-list");
const accountListError = document.getElementById("account-list-error");
const accountListResult = document.getElementById("account-list-result");
const sosButton = document.getElementById("sos-button");
const sosPanel = document.getElementById("sos-panel");
const sosPanelTitle = document.getElementById("sos-panel-title");
const sosPanelText = document.getElementById("sos-panel-text");
const sosConfirmActions = document.getElementById("sos-confirm-actions");
const sosSend = document.getElementById("sos-send");
const sosContacts = document.getElementById("sos-contacts");
const sosClose = document.getElementById("sos-close");
const sosAlerts = document.getElementById("sos-alerts");
const notificationPrompt = document.getElementById("notification-prompt");
const notificationText = document.getElementById("notification-text");
const notificationEnable = document.getElementById("notification-enable");
const notificationDismiss = document.getElementById("notification-dismiss");
const settingsButton = document.getElementById("settings-button");
const settingsPanel = document.getElementById("settings-panel");
const settingsNotificationText = document.getElementById("settings-notification-text");
const settingsNotificationEnable = document.getElementById("settings-notification-enable");
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
let seenRecordIds = null;
let activeSos = [];
let renderedSos = "";
let sosPanelView = null;
const sosPhone = document.body.dataset.sosPhone;
const currentUserName = document.body.dataset.userName;
const notificationsSupported = "Notification" in window && window.isSecureContext;
const renderedLists = {};

async function requestJson(path, options) {
  const response = await fetch(path, options);
  if (response.status === 401) {
    window.location.assign("/login");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(`Request to ${path} failed with status ${response.status}`);
    error.userMessage = body.error;
    throw error;
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
  if (accountsPanel && !accountsPanel.hidden) {
    refreshAccounts();
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

function setUpSosContacts() {
  const contactText = document.getElementById("sos-contact-text");
  if (!sosPhone) {
    contactText.textContent =
      "No emergency number is set up in BITS. Call your control room or emergency services directly.";
    document.getElementById("sos-contact-actions").hidden = true;
    return;
  }
  contactText.textContent = `Emergency number: ${sosPhone}. Calling and texting need a phone.`;
  const dialNumber = sosPhone.replace(/[ ()-]/g, "");
  const smsBody = encodeURIComponent(`SOS from ${currentUserName}. I need help.`);
  document.getElementById("sos-call").href = `tel:${dialNumber}`;
  document.getElementById("sos-sms").href = `sms:${dialNumber}?body=${smsBody}`;
}

function showSosPanelContent(title, text, { confirming = false } = {}) {
  sosPanelTitle.textContent = title;
  sosPanelText.textContent = text;
  sosConfirmActions.hidden = !confirming;
  sosContacts.hidden = confirming;
  sosClose.hidden = confirming;
  sosPanel.hidden = false;
}

function renderSosPanel() {
  if (sosPanelView === null) {
    sosPanel.hidden = true;
    return;
  }
  if (sosPanelView.name === "confirm") {
    showSosPanelContent(
      "Send an SOS alert?",
      "Everyone with BITS open will be alerted straight away.",
      { confirming: true }
    );
    return;
  }
  if (sosPanelView.name === "failed") {
    showSosPanelContent(
      "SOS NOT sent",
      "BITS can't be reached and your alert was not saved. Call or text now, then press SOS to try again."
    );
    return;
  }

  const record = activeSos.find((candidate) => candidate.id === sosPanelView.id);
  if (!record) {
    sosPanelView = null;
    sosPanel.hidden = true;
  } else if (record.synced) {
    showSosPanelContent(
      "SOS sent",
      "Anyone with BITS open will see your alert, but this doesn't confirm someone has read it. If you're in immediate danger, call or text as well."
    );
  } else {
    showSosPanelContent(
      "SOS NOT sent yet: no data connection",
      "Your alert is saved on this device and BITS will keep trying to send it. Call or text now, as these may work without internet."
    );
  }
}

function createSosAlert(record) {
  const item = document.createElement("li");
  item.className = "sos-alert";
  const isOwn = record.data.sender_id === currentUserId;
  const time = new Date(record.created_at).toLocaleTimeString([], { timeStyle: "short" });

  const text = document.createElement("p");
  if (isOwn) {
    const state = record.synced ? "Sent" : "Not sent yet";
    text.textContent = `Your SOS · ${time} · ${state}`;
  } else {
    text.textContent = `SOS from ${record.data.sender_name ?? "Unknown"} · ${time}`;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Mark resolved";
  button.addEventListener("click", () => resolveSos(record.id));
  item.append(text, button);
  return item;
}

function renderSos(records) {
  activeSos = records.filter((record) => record.data.type === "sos").reverse();
  const snapshot = JSON.stringify(activeSos.map((record) => [record.id, record.synced]));
  if (snapshot !== renderedSos) {
    renderedSos = snapshot;
    sosAlerts.replaceChildren(...activeSos.map(createSosAlert));
    renderSosPanel();
  }
}

async function resolveSos(sosId) {
  if (!window.confirm("Mark this SOS as resolved for everyone?")) {
    return;
  }
  try {
    await requestJson(`/api/sos/${encodeURIComponent(sosId)}/resolve`, { method: "POST" });
    await Promise.all([refreshRecords(), refreshStatus()]);
  } catch (error) {
    console.warn(error);
    window.alert("Couldn't mark the SOS as resolved. Please try again.");
  }
}

async function sendSos() {
  sosSend.disabled = true;
  try {
    const record = await requestJson("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "sos" }),
    });
    activeSos = [record, ...activeSos];
    sosPanelView = { name: "result", id: record.id };
    renderSosPanel();
  } catch (error) {
    console.warn(error);
    sosPanelView = { name: "failed" };
    renderSosPanel();
  } finally {
    sosSend.disabled = false;
  }
  refreshRecords().catch(console.warn);
  refreshStatus();
}

function wasNotificationPromptDismissed() {
  try {
    return sessionStorage.getItem(NOTIFICATION_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberNotificationPromptDismissed() {
  try {
    sessionStorage.setItem(NOTIFICATION_DISMISSED_KEY, "true");
  } catch {
    // Without storage, the prompt simply returns on the next page load.
  }
}

function updateNotificationPrompt() {
  notificationPrompt.hidden =
    !notificationsSupported ||
    Notification.permission !== "default" ||
    wasNotificationPromptDismissed();
  updateNotificationSettings();
}

function updateNotificationSettings() {
  const permission = notificationsSupported ? Notification.permission : "unsupported";
  settingsNotificationText.textContent = {
    granted: "Notifications are on. To turn them off, change this site's permission in your browser's settings.",
    denied: NOTIFICATIONS_BLOCKED_TEXT,
    default: "Notifications are off.",
    unsupported: "Notifications aren't available in this browser.",
  }[permission];
  settingsNotificationEnable.hidden = permission !== "default";
}

function setSettingsOpen(open) {
  settingsPanel.hidden = !open;
  settingsButton.setAttribute("aria-expanded", String(open));
  if (open) {
    // The permission can be changed in the browser while BITS is open.
    updateNotificationSettings();
  }
}

function showNotification(title, body, tag, openRecord, stayOpen = false) {
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: "/static/favicon.svg",
      requireInteraction: stayOpen,
    });
    notification.onclick = () => {
      window.focus();
      openRecord();
      notification.close();
    };
  } catch (error) {
    // Some mobile browsers don't allow notifications to be created this way.
    console.warn(error);
  }
}

function openConversation(senderId) {
  recipientSelect.value = senderId;
  selectTab(document.getElementById("tab-message"));
  updateConversation();
}

function announceRecord(record) {
  const sender = record.data.sender_name ?? "Someone";
  if (record.data.type === "sos") {
    showNotification(`SOS from ${sender}`, "Open BITS now.", record.id, () => {}, true);
    return;
  }
  if (record.data.type === "message") {
    // Message text stays out of the alert, so it can't show on a locked or shared screen.
    showNotification(`New message from ${sender}`, "Open BITS to read it.", record.id, () =>
      openConversation(record.data.sender_id)
    );
    return;
  }
  const text = record.data.text;
  const preview =
    text.length > NOTICE_PREVIEW_LENGTH ? `${text.slice(0, NOTICE_PREVIEW_LENGTH)}...` : text;
  showNotification(`New notice from ${sender}`, preview, record.id, () =>
    selectTab(document.getElementById("tab-home"))
  );
}

function isRecordOnScreen(record) {
  if (document.hidden || !document.hasFocus()) {
    return false;
  }
  return record.data.type === "notice"
    ? !homePanel.hidden
    : !messagePanel.hidden && recipientSelect.value === record.data.sender_id;
}

function notifyAboutNewRecords(records) {
  const incoming = records.filter(
    (record) =>
      record.data.sender_id !== currentUserId &&
      (record.data.type === "notice" ||
        record.data.type === "sos" ||
        (record.data.type === "message" && record.data.recipient_id === currentUserId))
  );

  // The first load only records what already exists, so old items never trigger alerts.
  const isFirstLoad = seenRecordIds === null;
  const unseen = isFirstLoad ? [] : incoming.filter((record) => !seenRecordIds.has(record.id));
  seenRecordIds = new Set([...(seenRecordIds ?? []), ...incoming.map((record) => record.id)]);

  if (!notificationsSupported || Notification.permission !== "granted") {
    return;
  }
  // SOS alerts always show on their own, and are never folded into a summary.
  unseen.filter((record) => record.data.type === "sos").forEach(announceRecord);
  const toAnnounce = unseen.filter(
    (record) => record.data.type !== "sos" && !isRecordOnScreen(record)
  );
  if (toAnnounce.length > MAX_SEPARATE_NOTIFICATIONS) {
    showNotification(`${toAnnounce.length} new updates`, "Open BITS to see them.", "bits-summary", () => {});
    return;
  }
  toAnnounce.forEach(announceRecord);
}

async function refreshRecords() {
  const records = await requestJson("/api/records");
  records.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  notifyAboutNewRecords(records);
  renderSos(records);

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
  // Factory reset is only offered offline.
  dataReset.hidden = state !== "offline";
  if (dataReset.hidden) {
    resetResult.textContent = "";
  }
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

document.getElementById("reset-data").addEventListener("click", async () => {
  resetResult.textContent = "";

  let lossWarning = "Anything not yet uploaded will be permanently lost.";
  try {
    const { pending } = await requestJson("/api/status");
    lossWarning =
      pending > 0
        ? `${pending} record(s) not yet uploaded will be permanently lost.`
        : "No records are waiting to upload.";
  } catch (error) {
    console.warn(error);
  }

  const confirmed = window.confirm(
    `Factory reset your data?\n\nThis erases the saved data file on this computer. ${lossWarning}\n\nRecords already in Supabase are not deleted and will download again when BITS is online.`
  );
  if (!confirmed) {
    return;
  }

  try {
    await requestJson("/api/reset-data", { method: "POST" });
    resetResult.textContent =
      "Local data reset. Records already in Supabase will download again when BITS is online.";
    await Promise.all([refreshRecords(), refreshStatus(), refreshUsers()]);
  } catch (error) {
    console.warn(error);
    resetResult.textContent = "Couldn't reset your data. Please try again.";
  }
});

function showAccountListMessage(result, error = "") {
  accountListResult.textContent = result;
  accountListError.textContent = error;
}

function createPasswordForm(account) {
  const form = document.createElement("form");
  form.className = "account-password";
  form.hidden = true;

  const label = document.createElement("label");
  label.textContent = `New password for ${account.name}`;
  const input = document.createElement("input");
  input.type = "password";
  input.minLength = 8;
  input.maxLength = 72;
  input.autocomplete = "new-password";
  input.required = true;
  label.append(input);

  const actions = document.createElement("div");
  actions.className = "account-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Save password";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    form.reset();
    form.hidden = true;
  });
  actions.append(save, cancel);
  form.append(label, actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAccountListMessage("");
    try {
      await requestJson(`/api/accounts/${account.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: input.value }),
      });
      form.reset();
      form.hidden = true;
      showAccountListMessage(`Password changed for ${account.name}. Give them the new one yourself.`);
    } catch (error) {
      console.warn(error);
      showAccountListMessage("", error.userMessage ?? "Couldn't change the password. Please try again.");
    }
  });
  return form;
}

async function makeAccountAdmin(account) {
  const confirmed = window.confirm(
    `Make ${account.name} an admin?\n\nThey'll be able to grant accounts, make other admins, see members' login emails and change members' passwords. This can't be undone in BITS.`
  );
  if (!confirmed) {
    return;
  }
  showAccountListMessage("");
  try {
    await requestJson(`/api/accounts/${account.id}/admin`, { method: "POST" });
    await refreshAccounts();
    showAccountListMessage(
      `${account.name} is now an admin. They need to log out and back in to see the Accounts tab.`
    );
  } catch (error) {
    console.warn(error);
    showAccountListMessage("", error.userMessage ?? "Couldn't make this account an admin. Please try again.");
  }
}

function createAccountItem(account) {
  const isAdmin = account.rank === "admin";
  const item = document.createElement("li");
  item.className = "record";

  const title = document.createElement("p");
  title.className = "record-title";
  title.textContent = account.name;
  const meta = document.createElement("p");
  meta.className = "record-meta";
  meta.textContent = isAdmin ? "Admin" : `Member · ${account.email}`;
  item.append(title, meta);

  if (!isAdmin) {
    const passwordForm = createPasswordForm(account);
    const actions = document.createElement("div");
    actions.className = "account-actions";
    const setPassword = document.createElement("button");
    setPassword.type = "button";
    setPassword.textContent = "Set new password";
    setPassword.addEventListener("click", () => {
      passwordForm.hidden = false;
      passwordForm.querySelector("input").focus();
    });
    const promote = document.createElement("button");
    promote.type = "button";
    promote.textContent = "Make admin";
    promote.addEventListener("click", () => makeAccountAdmin(account));
    actions.append(setPassword, promote);
    item.append(actions, passwordForm);
  }
  return item;
}

async function refreshAccounts() {
  try {
    const accounts = await requestJson("/api/accounts");
    accountList.replaceChildren(...accounts.map(createAccountItem));
    accountListError.textContent = "";
  } catch (error) {
    console.warn(error);
    accountListError.textContent = error.userMessage ?? "Couldn't load the accounts. Please try again.";
  }
}

// Only an admin's page has this form.
document.getElementById("account-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const accountError = document.getElementById("account-error");
  const accountResult = document.getElementById("account-result");
  accountError.textContent = "";
  accountResult.textContent = "";
  try {
    const { name, email } = await requestJson("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    form.reset();
    accountResult.textContent = `Account granted to ${name} (${email}).`;
    refreshUsers().catch(console.warn);
    refreshAccounts();
  } catch (error) {
    console.warn(error);
    accountError.textContent = error.userMessage ?? "Couldn't grant the account. Please try again.";
  }
});

sosButton.addEventListener("click", () => {
  const ownSos = activeSos.find((record) => record.data.sender_id === currentUserId);
  // A second press shows the existing alert instead of sending a duplicate.
  sosPanelView = ownSos ? { name: "result", id: ownSos.id } : { name: "confirm" };
  renderSosPanel();
});
sosSend.addEventListener("click", sendSos);
document.getElementById("sos-cancel").addEventListener("click", () => {
  sosPanelView = null;
  renderSosPanel();
});
sosClose.addEventListener("click", () => {
  sosPanelView = null;
  renderSosPanel();
});

async function requestNotifications() {
  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    notificationText.textContent = NOTIFICATIONS_BLOCKED_TEXT;
    notificationEnable.hidden = true;
    notificationDismiss.textContent = "OK";
    updateNotificationSettings();
    return;
  }
  updateNotificationPrompt();
}

notificationEnable.addEventListener("click", requestNotifications);
settingsNotificationEnable.addEventListener("click", requestNotifications);

for (const name of ["tone", "size"]) {
  const select = document.getElementById(`settings-${name}`);
  const saved = document.documentElement.dataset[name];
  if ([...select.options].some((option) => option.value === saved)) {
    select.value = saved;
  }
  select.addEventListener("change", () => {
    document.documentElement.dataset[name] = select.value;
    try {
      localStorage.setItem(`bits-${name}`, select.value);
    } catch (error) {
      console.warn(error);
    }
  });
}

settingsButton.addEventListener("click", () => setSettingsOpen(settingsPanel.hidden));
document.getElementById("settings-close").addEventListener("click", () => {
  setSettingsOpen(false);
  settingsButton.focus();
});

notificationDismiss.addEventListener("click", () => {
  rememberNotificationPromptDismissed();
  notificationPrompt.hidden = true;
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
  // With notifications on, keep checking from a background tab so alerts can arrive.
  const wantsAlerts = notificationsSupported && Notification.permission === "granted";
  if (!document.hidden || wantsAlerts) {
    refreshRecords().catch(console.warn);
  }
  // Keep retrying an unsent SOS quickly, rather than waiting for the slower status check.
  if (activeSos.some((r) => r.data.sender_id === currentUserId && !r.synced)) {
    refreshStatus();
  }
}, RECORD_CHECK_MS);

setUpSosContacts();
updateNotificationPrompt();
showChecklist(DEFAULT_CHECKLIST);
refreshStatus();
refreshUsers().catch(console.warn);
refreshRecords().catch(console.warn);
