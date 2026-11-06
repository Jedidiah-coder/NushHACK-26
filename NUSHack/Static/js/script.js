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
const NOTICE_TAGS = { announcement: "Announcement", reminder: "Reminder", general: "General" };
const DEFAULT_NOTICE_TAG = "general";
const NOTIFICATION_DISMISSED_KEY = "bits-notification-prompt-dismissed";
const MAX_ACTIVITY_ITEMS = 20;
const MAX_REMEMBERED_READ_MESSAGES = 2000;
const ACTIVITY_PREVIEW_LENGTH = 80;
// "Are you OK?" appears after this long without activity, then again after the same gap.
const SAFETY_CHECK_MS = 5 * 60 * 1000;
const SAFETY_MISSED_CHECKS_FOR_SOS = 2;
const SAFETY_TICK_MS = 5000;
// Browsers slow background tabs to one tick a minute, so a longer gap means the device slept.
const SAFETY_SLEEP_GAP_MS = 3 * 60 * 1000;
const SAFETY_SOS_RETRY_MS = 30000;
const SAFETY_ACTIVITY_SAVE_MS = 5000;
const AUTOMATIC_SOS_REASON = "You didn't respond to 2 safety checks, so SecuriLock sent this for you. ";
const NOTIFICATIONS_BLOCKED_TEXT =
  "Notifications are blocked. To turn them on, allow them for this site in your browser's settings.";
const MAP_STATUSES = { unchecked: "Unchecked", safe: "Safe", na: "NA", dangerous: "Dangerous" };
// The grid and limits match the checks in app.py.
const MAP_COLUMNS = 24;
const MAP_ROWS = 16;
const MIN_MAP_ROOM_WIDTH = 3;
const MIN_MAP_ROOM_HEIGHT = 2;
const MAX_MAP_LEVELS = 20;
const MAX_MAP_ROOMS_PER_LEVEL = 60;
// Used until someone saves their own version with the Redesign map button.
const DEFAULT_MAP_LEVELS = [
  {
    id: "default-level-1",
    name: "Level 1",
    rooms: [
      { id: "default-lobby", name: "Lobby", x: 0, y: 0, w: 10, h: 8 },
      { id: "default-office-101", name: "Office 101", x: 10, y: 0, w: 7, h: 5 },
      { id: "default-office-102", name: "Office 102", x: 17, y: 0, w: 7, h: 5 },
      { id: "default-corridor-1", name: "Corridor", x: 10, y: 5, w: 14, h: 3 },
      { id: "default-storeroom", name: "Storeroom", x: 0, y: 8, w: 10, h: 8 },
      { id: "default-meeting-room", name: "Meeting room", x: 10, y: 8, w: 9, h: 8 },
      { id: "default-stairs-1", name: "Stairs", x: 19, y: 8, w: 5, h: 8 },
    ],
  },
  {
    id: "default-level-2",
    name: "Level 2",
    rooms: [
      { id: "default-office-201", name: "Office 201", x: 0, y: 0, w: 12, h: 6 },
      { id: "default-office-202", name: "Office 202", x: 12, y: 0, w: 12, h: 6 },
      { id: "default-corridor-2", name: "Corridor", x: 0, y: 6, w: 24, h: 3 },
      { id: "default-pantry", name: "Pantry", x: 0, y: 9, w: 12, h: 7 },
      { id: "default-stairs-2", name: "Stairs", x: 19, y: 9, w: 5, h: 7 },
    ],
  },
];

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
const people = document.getElementById("people");
// A server started before an update still sends the older page, without these.
const activityButton = document.getElementById("activity-button");
const activityPanel = document.getElementById("activity-panel");
const activityBadge = document.getElementById("activity-badge");
const activityList = document.getElementById("activity-list");
const activityEmpty = document.getElementById("activity-empty");
const safetyCheck = document.getElementById("safety-check");
const safetyCheckText = document.getElementById("safety-check-text");
const noticeForm = document.getElementById("notice-form");
const noticeInput = document.getElementById("notice-text");
const noticeError = document.getElementById("notice-error");
const noticeTagButtons = noticeForm.querySelectorAll("button[data-tag]");
const checklistForm = document.getElementById("checklist-form");
const checklistItems = document.getElementById("checklist-items");
const checklistError = document.getElementById("checklist-error");
const checklistEditButton = document.getElementById("checklist-edit");
const checklistEditor = document.getElementById("checklist-editor");
const editorName = document.getElementById("editor-name");
const editorTaskList = document.getElementById("editor-task-list");
const editorError = document.getElementById("editor-error");
// A server started before an update still sends the older page, without the map.
const mapFloor = document.getElementById("map-floor");
const mapLevelButtons = document.getElementById("map-levels");
const mapLegend = document.getElementById("map-legend");
const mapEmpty = document.getElementById("map-empty");
const mapError = document.getElementById("map-error");
const mapEditButton = document.getElementById("map-edit");
const mapRoomPanel = document.getElementById("map-room-panel");
const mapStatusButtons = document.getElementById("map-status-buttons");
const mapEditor = document.getElementById("map-editor");
const mapLevelName = document.getElementById("map-level-name");
const mapRoomFields = document.getElementById("map-room-fields");
const mapRoomName = document.getElementById("map-room-name");

const currentUserId = document.body.dataset.userId;
const currentUserIsAdmin = document.body.dataset.isAdmin === "true";
let allMessages = [];
let renderedMessages = "";
let renderedUsers = "";
let currentChecklist = DEFAULT_CHECKLIST;
let renderedChecklist = "";
let seenRecordIds = null;
let messagesLoaded = false;
let readMessageIds = null;
let renderedActivity = "";
let safetyLastActive = Date.now();
let safetyLastTick = Date.now();
let safetyShownLevel = 0;
let safetyNotification = null;
let safetySosSending = false;
let safetySosRetryAt = 0;
let activeSos = [];
let renderedSos = "";
let sosPanelView = null;
let mapLevels = DEFAULT_MAP_LEVELS;
let mapLayoutId = null;
let mapStatuses = new Map();
let mapLevelId = null;
let mapSelectedRoomId = null;
// A private copy while redesigning, so nobody sees the map until it's saved.
let mapDraft = null;
let mapDraftBaseId = null;
let renderedMap = "";
const defaultSosPhone = document.body.dataset.sosPhone;
let sosPhone = defaultSosPhone;
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
  updateActivity();
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

  // Notices posted before tags existed count as General.
  const tag = record.data.tag || DEFAULT_NOTICE_TAG;
  item.dataset.tag = tag;
  const tagLabel = document.createElement("span");
  tagLabel.className = "notice-tag";
  tagLabel.textContent = NOTICE_TAGS[tag];
  item.prepend(tagLabel);

  if (record.data.sender_id === currentUserId || currentUserIsAdmin) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Take down";
    button.addEventListener("click", () => takeDownNotice(record.id));
    item.append(button);
  }
  return item;
}

function selectNoticeTag(tag) {
  for (const button of noticeTagButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.tag === tag));
  }
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
  if (isSent || currentUserIsAdmin) {
    const button = document.createElement("button");
    button.className = "message-delete";
    button.type = "button";
    button.textContent = "Delete";
    button.addEventListener("click", () => deleteMessage(record.id));
    bubble.append(button);
  }
  return bubble;
}

async function deleteMessage(messageId) {
  if (!window.confirm("Delete this message for both people?")) {
    return;
  }
  messageError.textContent = "";
  try {
    await requestJson(`/api/messages/${encodeURIComponent(messageId)}`, { method: "DELETE" });
    await Promise.all([refreshRecords(), refreshStatus()]);
  } catch (error) {
    console.warn(error);
    messageError.textContent = "Couldn't delete the message. Please try again.";
  }
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
  // Only admins have this box. Don't overwrite it while one is typing.
  const phoneInput = document.getElementById("settings-sos-phone");
  if (phoneInput && document.activeElement !== phoneInput) {
    phoneInput.value = sosPhone;
  }

  const contactText = document.getElementById("sos-contact-text");
  const contactActions = document.getElementById("sos-contact-actions");
  contactActions.hidden = !sosPhone;
  if (!sosPhone) {
    contactText.textContent =
      "No emergency number is set up in SecuriLock. Call your control room or emergency services directly.";
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
      "Everyone with SecuriLock open will be alerted straight away.",
      { confirming: true }
    );
    return;
  }
  if (sosPanelView.name === "failed") {
    showSosPanelContent(
      "SOS NOT sent",
      "SecuriLock can't be reached and your alert was not saved. Call or text now, then press SOS to try again."
    );
    return;
  }

  const record = activeSos.find((candidate) => candidate.id === sosPanelView.id);
  if (!record) {
    sosPanelView = null;
    sosPanel.hidden = true;
  } else if (record.synced) {
    showSosPanelContent(
      record.data.automatic ? "Automatic SOS sent" : "SOS sent",
      `${record.data.automatic ? AUTOMATIC_SOS_REASON : ""}Anyone with SecuriLock open will see your alert, but this doesn't confirm someone has read it. If you're safe, press Mark resolved. If you're in immediate danger, call or text as well.`
    );
  } else {
    showSosPanelContent(
      "SOS NOT sent yet: no data connection",
      `${record.data.automatic ? AUTOMATIC_SOS_REASON : ""}Your alert is saved on this device and SecuriLock will keep trying to send it. Call or text now, as these may work without internet.`
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
    const kind = record.data.automatic ? "Your automatic SOS" : "Your SOS";
    text.textContent = `${kind} · ${time} · ${state}`;
  } else {
    const reason = record.data.automatic ? " · Automatic: no response to safety checks" : "";
    text.textContent = `SOS from ${record.data.sender_name ?? "Unknown"} · ${time}${reason}`;
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

async function sendSos({ automatic = false } = {}) {
  sosSend.disabled = true;
  try {
    const record = await requestJson("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(automatic ? { type: "sos", automatic: true } : { type: "sos" }),
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

function readLastActive() {
  try {
    // Shared with this person's other tabs, so activity in one counts for all of them.
    const saved = Number(localStorage.getItem(`bits-last-active-${currentUserId}`));
    return Math.max(safetyLastActive, saved || 0);
  } catch {
    return safetyLastActive;
  }
}

function saveLastActive(now) {
  safetyLastActive = now;
  try {
    localStorage.setItem(`bits-last-active-${currentUserId}`, String(now));
  } catch (error) {
    console.warn(error);
  }
}

function missedSafetyLevel(now) {
  return Math.floor((now - readLastActive()) / SAFETY_CHECK_MS);
}

function noteActivity() {
  const now = Date.now();
  // Once a check is showing, only I'm OK answers it, so a bumped mouse can't cancel an alarm.
  if (now - safetyLastActive < SAFETY_ACTIVITY_SAVE_MS || missedSafetyLevel(now) >= 1) {
    return;
  }
  saveLastActive(now);
}

function showSafetyCheck(level) {
  if (level === safetyShownLevel) {
    return;
  }
  safetyShownLevel = level;
  safetyCheck.hidden = level === 0;
  if (level === 0) {
    safetyNotification?.close();
    safetyNotification = null;
    return;
  }

  safetyCheckText.textContent =
    level < SAFETY_MISSED_CHECKS_FOR_SOS
      ? "You've been inactive for a while. Press I'm OK, or SecuriLock will check again in 5 minutes and then send an SOS."
      : "Last check. If you don't press I'm OK within 5 minutes, SecuriLock will send an SOS to everyone.";
  safetyCheck.scrollIntoView({ block: "nearest" });
  if (notificationsSupported && Notification.permission === "granted") {
    safetyNotification = showNotification(
      "Are you OK?",
      "Open SecuriLock and press I'm OK.",
      "bits-safety-check",
      () => {},
      true
    );
  }
}

async function sendAutomaticSos(now) {
  if (safetySosSending || now < safetySosRetryAt) {
    return;
  }
  safetySosSending = true;
  safetySosRetryAt = now + SAFETY_SOS_RETRY_MS;
  try {
    // Another tab or device may have sent it already.
    await refreshRecords().catch(console.warn);
    if (!activeSos.some((record) => record.data.sender_id === currentUserId)) {
      await sendSos({ automatic: true });
    }
  } finally {
    safetySosSending = false;
  }
}

function checkSafety() {
  if (!safetyCheck) {
    return;
  }
  const now = Date.now();
  const sinceLastTick = now - safetyLastTick;
  safetyLastTick = now;

  const hasOwnSos = activeSos.some((record) => record.data.sender_id === currentUserId);
  // A device that was asleep can't tell whether its owner was active, so the wait starts again.
  // During an SOS the wait also restarts, so resolving it doesn't set off another straight away.
  if (sinceLastTick > SAFETY_SLEEP_GAP_MS || hasOwnSos) {
    saveLastActive(now);
  }

  const level = missedSafetyLevel(now);
  if (level > SAFETY_MISSED_CHECKS_FOR_SOS) {
    showSafetyCheck(0);
    sendAutomaticSos(now);
    return;
  }
  showSafetyCheck(level);
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
  if (open && activityPanel) {
    setActivityOpen(false);
  }
  settingsPanel.hidden = !open;
  settingsButton.setAttribute("aria-expanded", String(open));
  if (open) {
    // The permission can be changed in the browser while SecuriLock is open.
    updateNotificationSettings();
  }
}

function showNotification(title, body, tag, openRecord, stayOpen = false) {
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: "/static/favicon.png",
      requireInteraction: stayOpen,
    });
    notification.onclick = () => {
      window.focus();
      openRecord();
      notification.close();
    };
    return notification;
  } catch (error) {
    // Some mobile browsers don't allow notifications to be created this way.
    console.warn(error);
    return null;
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
    const body = record.data.automatic
      ? "Automatic: no response to safety checks. Open SecuriLock now."
      : "Open SecuriLock now.";
    showNotification(`SOS from ${sender}`, body, record.id, () => {}, true);
    return;
  }
  if (record.data.type === "message") {
    // Message text stays out of the alert, so it can't show on a locked or shared screen.
    showNotification(`New message from ${sender}`, "Open SecuriLock to read it.", record.id, () =>
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
    showNotification(`${toAnnounce.length} new updates`, "Open SecuriLock to see them.", "bits-summary", () => {});
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
  updateMap(records);
  const latestSosPhone = records.filter((r) => r.data.type === "sos_phone").at(-1);
  const currentSosPhone = latestSosPhone ? latestSosPhone.data.phone : defaultSosPhone;
  if (currentSosPhone !== sosPhone) {
    sosPhone = currentSosPhone;
    setUpSosContacts();
  }
  renderMessages();
  messagesLoaded = true;
  updateActivity();
  showList("notice-list", "notice-empty", notices, createNoticeItem);
  showList("inspection-list", "inspection-empty", inspections, describeInspection);
}

function updateConversation() {
  const hasPerson = Boolean(recipientSelect.value);
  messageInput.disabled = !hasPerson;
  messageSend.disabled = !hasPerson;
  // A server started before an update still sends the older page, without this list.
  for (const button of people?.querySelectorAll("button") ?? []) {
    button.setAttribute("aria-pressed", String(button.dataset.userId === recipientSelect.value));
  }
  renderMessages();
  scrollChatToEnd();
  updateActivity();
}

function loadReadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(`bits-read-messages-${currentUserId}`));
    return Array.isArray(saved) ? new Set(saved) : null;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function saveReadMessages() {
  try {
    localStorage.setItem(
      `bits-read-messages-${currentUserId}`,
      JSON.stringify([...readMessageIds].slice(-MAX_REMEMBERED_READ_MESSAGES))
    );
  } catch (error) {
    console.warn(error);
  }
}

function setActivityOpen(open) {
  activityPanel.hidden = !open;
  activityButton.setAttribute("aria-expanded", String(open));
  if (open) {
    setSettingsOpen(false);
  }
}

function createActivityItem(record, isUnread) {
  const data = record.data;
  const isSent = data.sender_id === currentUserId;
  const direction = isSent
    ? `To ${data.recipient_name ?? "someone"}`
    : `From ${data.sender_name ?? "someone"}`;

  const heading = document.createElement("span");
  heading.className = "activity-heading";
  heading.textContent = isUnread ? `New · ${direction}` : direction;
  const preview = document.createElement("span");
  const text = data.text ?? "";
  preview.textContent =
    text.length > ACTIVITY_PREVIEW_LENGTH ? `${text.slice(0, ACTIVITY_PREVIEW_LENGTH)}...` : text;
  const meta = document.createElement("span");
  meta.className = "record-meta";
  meta.textContent = `${formatTime(record.created_at)} · ${record.synced ? "Synced" : "Pending upload"}`;

  const button = document.createElement("button");
  button.className = "activity-item";
  button.type = "button";
  button.dataset.unread = String(isUnread);
  button.append(heading, preview, meta);
  button.addEventListener("click", () => {
    setActivityOpen(false);
    openConversation(isSent ? data.recipient_id : data.sender_id);
    messageInput.focus();
  });

  const item = document.createElement("li");
  item.className = "record";
  item.append(button);
  return item;
}

function updateActivity() {
  if (!activityButton || !messagesLoaded) {
    return;
  }
  if (readMessageIds === null) {
    readMessageIds = loadReadMessages();
    if (readMessageIds === null) {
      // The first time on this device, older messages don't count as new.
      readMessageIds = new Set(allMessages.map((record) => record.id));
      saveReadMessages();
    }
  }

  const received = allMessages.filter((record) => record.data.recipient_id === currentUserId);
  const justRead = received.filter(
    (record) => !readMessageIds.has(record.id) && isRecordOnScreen(record)
  );
  if (justRead.length > 0) {
    justRead.forEach((record) => readMessageIds.add(record.id));
    saveReadMessages();
  }

  const unreadCount = received.filter((record) => !readMessageIds.has(record.id)).length;
  activityBadge.hidden = unreadCount === 0;
  activityBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  const label = unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity";
  activityButton.setAttribute("aria-label", label);
  activityButton.title = label;

  const recent = allMessages.slice(-MAX_ACTIVITY_ITEMS).reverse();
  const isUnread = (record) =>
    record.data.recipient_id === currentUserId && !readMessageIds.has(record.id);
  // Rebuilding only on a real change keeps the list's scroll position and focus.
  const snapshot = JSON.stringify(recent.map((r) => [r.id, r.synced, isUnread(r)]));
  if (snapshot !== renderedActivity) {
    renderedActivity = snapshot;
    activityList.replaceChildren(...recent.map((r) => createActivityItem(r, isUnread(r))));
    activityEmpty.hidden = recent.length > 0;
  }
}

function createPeopleGroup(heading, users, emptyText) {
  const title = document.createElement("h3");
  title.textContent = heading;
  if (users.length === 0) {
    const empty = document.createElement("p");
    empty.className = "field-hint";
    empty.textContent = emptyText;
    return [title, empty];
  }

  const list = document.createElement("ul");
  for (const user of users) {
    const button = document.createElement("button");
    button.className = "person";
    button.type = "button";
    button.dataset.userId = user.id;
    button.dataset.status = user.status;
    const dot = document.createElement("span");
    dot.className = "person-dot";
    button.append(dot, user.name);
    button.addEventListener("click", () => {
      recipientSelect.value = user.id;
      recipientSelect.dispatchEvent(new Event("change"));
    });
    const item = document.createElement("li");
    item.append(button);
    list.append(item);
  }
  return [title, list];
}

function renderPeople(users) {
  if (!people) {
    return;
  }
  people.hidden = users.length === 0;
  if (users.some((user) => user.status === "unknown")) {
    people.replaceChildren(
      ...createPeopleGroup("People", users, ""),
      Object.assign(document.createElement("p"), {
        className: "field-hint",
        textContent: "You're offline, so SecuriLock can't check who else is online.",
      })
    );
    return;
  }
  const online = users.filter((user) => user.status === "online");
  const offline = users.filter((user) => user.status === "offline");
  people.replaceChildren(
    ...createPeopleGroup(`Online (${online.length})`, online, "No one else is online right now."),
    ...createPeopleGroup(`Offline (${offline.length})`, offline, "Everyone else is online.")
  );
}

async function refreshUsers() {
  const users = await requestJson("/api/users");
  const snapshot = JSON.stringify(users);
  // Rebuilding only on a real change stops an open dropdown from closing.
  if (snapshot === renderedUsers) {
    return;
  }
  renderedUsers = snapshot;
  renderPeople(users);

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

for (const button of noticeTagButtons) {
  button.addEventListener("click", () => selectNoticeTag(button.dataset.tag));
}

noticeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = noticeInput.value.trim();
  if (!text) {
    return;
  }
  const tag = noticeForm.querySelector('button[data-tag][aria-pressed="true"]').dataset.tag;
  noticeError.textContent = "";
  try {
    await saveRecord({ type: "notice", text, tag });
    noticeForm.reset();
    selectNoticeTag(DEFAULT_NOTICE_TAG);
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
    `Factory reset your data?\n\nThis erases the saved data file on this computer. ${lossWarning}\n\nRecords already in Supabase are not deleted and will download again when SecuriLock is online.`
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
    `Make ${account.name} an admin?\n\nThey'll be able to grant accounts, make other admins, see members' login emails and change members' passwords. This can't be undone in SecuriLock.`
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
document.getElementById("settings-sos-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phoneInput = document.getElementById("settings-sos-phone");
  const sosError = document.getElementById("settings-sos-error");
  const sosResult = document.getElementById("settings-sos-result");
  const phone = phoneInput.value.trim();
  sosError.textContent = "";
  sosResult.textContent = "";
  try {
    await saveRecord({ type: "sos_phone", phone });
    phoneInput.value = phone;
    sosResult.textContent = phone
      ? `Saved. Other devices will show ${phone} once this one has synced.`
      : "Number removed. Other devices will update once this one has synced.";
  } catch (error) {
    console.warn(error);
    sosError.textContent = error.userMessage ?? "Couldn't save the number. Please try again.";
  }
});

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
sosSend.addEventListener("click", () => sendSos());
document.getElementById("sos-cancel").addEventListener("click", () => {
  sosPanelView = null;
  renderSosPanel();
});
sosClose.addEventListener("click", () => {
  sosPanelView = null;
  renderSosPanel();
});

function showNotificationMessage(text) {
  notificationText.textContent = text;
  settingsNotificationText.textContent = text;
}

async function requestNotifications() {
  // Browsers may only show a small icon by the address bar, so say where to look.
  showNotificationMessage(
    "Look for a notification request at the top of your browser, near the address bar, and choose Allow."
  );
  let permission = "default";
  try {
    permission = await Notification.requestPermission();
  } catch (error) {
    console.warn(error);
  }

  if (permission === "denied") {
    notificationText.textContent = NOTIFICATIONS_BLOCKED_TEXT;
    notificationEnable.hidden = true;
    notificationDismiss.textContent = "OK";
    updateNotificationSettings();
    return;
  }
  if (permission === "default") {
    // Browsers stop asking after a request has been closed a few times.
    showNotificationMessage(
      "Notifications are still off. Click the icon to the left of the address bar, allow notifications for this site, then reload the page."
    );
    return;
  }
  updateNotificationPrompt();
  showNotification("Notifications are on", "SecuriLock will alert you here.", "bits-notifications-on", () => {});
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

// Opening the page counts as activity, and every open page keeps checking.
saveLastActive(Date.now());
for (const eventName of ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"]) {
  window.addEventListener(eventName, noteActivity, { capture: true, passive: true });
}
document.getElementById("safety-ok")?.addEventListener("click", () => {
  saveLastActive(Date.now());
  checkSafety();
});
document.addEventListener("visibilitychange", checkSafety);
setInterval(checkSafety, SAFETY_TICK_MS);

activityButton?.addEventListener("click", () => setActivityOpen(activityPanel.hidden));
document.getElementById("activity-close")?.addEventListener("click", () => {
  setActivityOpen(false);
  activityButton.focus();
});
// A conversation left open counts as read once someone comes back to it.
window.addEventListener("focus", updateActivity);
document.addEventListener("visibilitychange", updateActivity);

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

function updateMap(records) {
  if (!mapFloor) {
    return;
  }
  // Records are sorted oldest first, so the last layout and each room's last status are current.
  const layout = records.filter((r) => r.data.type === "map_layout").at(-1);
  mapLevels = layout?.data.levels ?? DEFAULT_MAP_LEVELS;
  mapLayoutId = layout?.id ?? null;
  mapStatuses = new Map(
    records.filter((r) => r.data.type === "map_status").map((r) => [r.data.room_id, r])
  );
  // Waits while redesigning, because rebuilding the rooms would interrupt a drag.
  if (!mapDraft) {
    renderMap();
  }
}

function getMapRoomStatus(roomId) {
  return mapStatuses.get(roomId)?.data.status ?? "unchecked";
}

function getMapLevel() {
  const levels = mapDraft ?? mapLevels;
  return levels.find((level) => level.id === mapLevelId) ?? levels[0];
}

function countDangerousRooms(level) {
  return level.rooms.filter((room) => getMapRoomStatus(room.id) === "dangerous").length;
}

function placeMapRoom(element, room) {
  element.style.left = `${(room.x / MAP_COLUMNS) * 100}%`;
  element.style.top = `${(room.y / MAP_ROWS) * 100}%`;
  element.style.width = `${(room.w / MAP_COLUMNS) * 100}%`;
  element.style.height = `${(room.h / MAP_ROWS) * 100}%`;
}

function fitsOnMap(shape, roomId, rooms) {
  return (
    shape.x >= 0 &&
    shape.y >= 0 &&
    shape.w >= MIN_MAP_ROOM_WIDTH &&
    shape.h >= MIN_MAP_ROOM_HEIGHT &&
    shape.x + shape.w <= MAP_COLUMNS &&
    shape.y + shape.h <= MAP_ROWS &&
    rooms.every(
      (other) =>
        other.id === roomId ||
        shape.x + shape.w <= other.x ||
        other.x + other.w <= shape.x ||
        shape.y + shape.h <= other.y ||
        other.y + other.h <= shape.y
    )
  );
}

// Rooms stop at the last spot that fits, so they can't overlap or leave the map.
function reshapeMapRoom(element, room, shape) {
  if (fitsOnMap(shape, room.id, getMapLevel().rooms)) {
    Object.assign(room, shape);
    placeMapRoom(element, room);
  }
}

function startMapRoomDrag(event, element, room, resizeHandle) {
  if (event.button !== 0) {
    return;
  }
  selectDraftRoom(room.id);
  const handleBox = resizeHandle.getBoundingClientRect();
  const isResizing = event.clientX >= handleBox.left && event.clientY >= handleBox.top;
  const startX = event.clientX;
  const startY = event.clientY;
  const start = { x: room.x, y: room.y, w: room.w, h: room.h };
  element.setPointerCapture(event.pointerId);

  const onMove = (moveEvent) => {
    const floor = mapFloor.getBoundingClientRect();
    const columns = Math.round((moveEvent.clientX - startX) / (floor.width / MAP_COLUMNS));
    const rows = Math.round((moveEvent.clientY - startY) / (floor.height / MAP_ROWS));
    // A fast drag can jump past the edge, so it stops at the edge instead of not moving at all.
    const limit = (value, lowest, highest) => Math.min(Math.max(value, lowest), highest);
    reshapeMapRoom(
      element,
      room,
      isResizing
        ? {
            ...start,
            w: limit(start.w + columns, MIN_MAP_ROOM_WIDTH, MAP_COLUMNS - start.x),
            h: limit(start.h + rows, MIN_MAP_ROOM_HEIGHT, MAP_ROWS - start.y),
          }
        : {
            ...start,
            x: limit(start.x + columns, 0, MAP_COLUMNS - start.w),
            y: limit(start.y + rows, 0, MAP_ROWS - start.h),
          }
    );
  };
  const onEnd = () => {
    element.removeEventListener("pointermove", onMove);
    element.removeEventListener("pointerup", onEnd);
    element.removeEventListener("pointercancel", onEnd);
  };
  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerup", onEnd);
  element.addEventListener("pointercancel", onEnd);
}

function handleMapRoomKey(event, element, room) {
  const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const step = steps[event.key];
  if (!step) {
    return;
  }
  event.preventDefault();
  const shape = { x: room.x, y: room.y, w: room.w, h: room.h };
  if (event.shiftKey) {
    shape.w += step[0];
    shape.h += step[1];
  } else {
    shape.x += step[0];
    shape.y += step[1];
  }
  reshapeMapRoom(element, room, shape);
}

function createMapRoom(room) {
  const status = getMapRoomStatus(room.id);
  const element = document.createElement("button");
  element.type = "button";
  element.className = "map-room";
  element.dataset.roomStatus = status;
  element.dataset.roomId = room.id;
  element.dataset.mapFocus = `room-${room.id}`;
  element.title = room.name;
  element.setAttribute("aria-label", `${room.name}: ${MAP_STATUSES[status]}`);
  element.setAttribute("aria-pressed", String(room.id === mapSelectedRoomId));
  placeMapRoom(element, room);

  const name = document.createElement("span");
  name.className = "map-room-name";
  name.textContent = room.name;
  const label = document.createElement("span");
  label.className = "map-room-status";
  label.textContent = MAP_STATUSES[status];
  element.append(name, label);

  if (mapDraft) {
    const resizeHandle = document.createElement("span");
    resizeHandle.className = "map-room-resize";
    element.append(resizeHandle);
    element.addEventListener("pointerdown", (event) =>
      startMapRoomDrag(event, element, room, resizeHandle)
    );
    element.addEventListener("focus", () => selectDraftRoom(room.id));
    element.addEventListener("keydown", (event) => handleMapRoomKey(event, element, room));
  } else {
    element.addEventListener("click", () => {
      mapSelectedRoomId = room.id;
      renderMap();
      mapRoomPanel.scrollIntoView({ block: "nearest" });
    });
  }
  return element;
}

function createMapLevelButton(level) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.mapFocus = `level-${level.id}`;
  button.setAttribute("aria-pressed", String(level.id === mapLevelId));
  // A danger on another level must be visible without opening that level.
  const dangerous = mapDraft ? 0 : countDangerousRooms(level);
  button.dataset.dangerous = String(dangerous > 0);
  button.textContent = dangerous > 0 ? `${level.name} · ${dangerous} dangerous` : level.name;
  button.addEventListener("click", () => {
    mapLevelId = level.id;
    mapSelectedRoomId = null;
    mapError.textContent = "";
    renderMap();
  });
  return button;
}

function renderMapLegend(level) {
  const counts = Object.fromEntries(Object.keys(MAP_STATUSES).map((status) => [status, 0]));
  for (const room of level.rooms) {
    counts[getMapRoomStatus(room.id)] += 1;
  }
  mapLegend.replaceChildren(
    ...Object.entries(MAP_STATUSES).map(([status, label]) => {
      const swatch = document.createElement("span");
      swatch.className = "map-swatch";
      const item = document.createElement("li");
      item.dataset.roomStatus = status;
      item.append(swatch, `${label}: ${counts[status]}`);
      return item;
    })
  );
}

function renderMapRoomPanel(room) {
  mapRoomPanel.hidden = !room;
  if (!room) {
    return;
  }
  document.getElementById("map-room-title").textContent = room.name;
  const current = getMapRoomStatus(room.id);
  mapStatusButtons.replaceChildren(
    ...Object.entries(MAP_STATUSES).map(([status, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.roomStatus = status;
      button.dataset.mapFocus = `status-${status}`;
      button.setAttribute("aria-pressed", String(status === current));
      button.addEventListener("click", () => setMapRoomStatus(room.id, status));
      return button;
    })
  );
  const record = mapStatuses.get(room.id);
  document.getElementById("map-room-meta").textContent = record
    ? `Marked ${MAP_STATUSES[current]} by ${record.data.sender_name} · ${formatTime(record.created_at)} · ${record.synced ? "Synced" : "Pending upload"}`
    : "Nobody has checked this room yet.";
}

function setInputValue(input, value) {
  // Don't fight someone who is typing in this box.
  if (input.value !== value) {
    input.value = value;
  }
}

function renderMapEditor(level, room) {
  setInputValue(mapLevelName, level.name);
  const index = mapDraft.indexOf(level);
  document.getElementById("map-level-earlier").disabled = index === 0;
  document.getElementById("map-level-later").disabled = index === mapDraft.length - 1;
  document.getElementById("map-delete-level").disabled = mapDraft.length === 1;
  mapRoomFields.hidden = !room;
  if (room) {
    setInputValue(mapRoomName, room.name);
  }
}

function renderMap() {
  if (!mapFloor) {
    return;
  }
  const editing = mapDraft !== null;
  const levels = mapDraft ?? mapLevels;
  const level = getMapLevel();
  mapLevelId = level.id;
  const room = level.rooms.find((candidate) => candidate.id === mapSelectedRoomId) ?? null;
  mapSelectedRoomId = room?.id ?? null;

  // Rebuilding only on a real change keeps focus and any selected text in place.
  const snapshot = JSON.stringify([
    editing,
    levels,
    mapLevelId,
    mapSelectedRoomId,
    [...mapStatuses.values()].map((record) => [record.id, record.synced]),
  ]);
  if (snapshot === renderedMap) {
    return;
  }
  renderedMap = snapshot;

  const focused = document.activeElement?.dataset?.mapFocus;
  mapLevelButtons.replaceChildren(...levels.map(createMapLevelButton));
  mapFloor.replaceChildren(...level.rooms.map(createMapRoom));
  mapFloor.dataset.editing = String(editing);
  mapEmpty.hidden = level.rooms.length > 0;
  mapEditButton.hidden = editing;
  mapLegend.hidden = editing;
  mapEditor.hidden = !editing;
  renderMapLegend(level);
  renderMapRoomPanel(editing ? null : room);
  if (editing) {
    renderMapEditor(level, room);
  }
  if (focused) {
    document.querySelector(`[data-map-focus="${focused}"]`)?.focus();
  }
}

async function setMapRoomStatus(roomId, status) {
  if (getMapRoomStatus(roomId) === status) {
    return;
  }
  mapError.textContent = "";
  try {
    await saveRecord({ type: "map_status", room_id: roomId, status });
  } catch (error) {
    console.warn(error);
    mapError.textContent = error.userMessage ?? "Couldn't save the room's status. Please try again.";
  }
}

// Doesn't rebuild the rooms, because that would interrupt a drag that's just starting.
function selectDraftRoom(roomId) {
  mapSelectedRoomId = roomId;
  for (const element of mapFloor.querySelectorAll(".map-room")) {
    element.setAttribute("aria-pressed", String(element.dataset.roomId === roomId));
  }
  const level = getMapLevel();
  renderMapEditor(level, level.rooms.find((room) => room.id === roomId));
}

function createMapId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function findFreeMapSpot(rooms) {
  for (const [w, h] of [[5, 3], [MIN_MAP_ROOM_WIDTH, MIN_MAP_ROOM_HEIGHT]]) {
    for (let y = 0; y + h <= MAP_ROWS; y += 1) {
      for (let x = 0; x + w <= MAP_COLUMNS; x += 1) {
        if (fitsOnMap({ x, y, w, h }, null, rooms)) {
          return { x, y, w, h };
        }
      }
    }
  }
  return null;
}

function moveDraftLevel(offset) {
  const index = mapDraft.indexOf(getMapLevel());
  const [level] = mapDraft.splice(index, 1);
  mapDraft.splice(index + offset, 0, level);
  renderMap();
}

// Returns true if every level and room has a name, otherwise shows the first one without.
function checkDraftNames() {
  for (const level of mapDraft) {
    level.name = level.name.trim();
    if (!level.name) {
      mapLevelId = level.id;
      mapSelectedRoomId = null;
      mapError.textContent = "Give this level a name.";
      renderMap();
      mapLevelName.focus();
      return false;
    }
    for (const room of level.rooms) {
      room.name = room.name.trim();
      if (!room.name) {
        mapLevelId = level.id;
        mapSelectedRoomId = room.id;
        mapError.textContent = "Give this room a name.";
        renderMap();
        mapRoomName.focus();
        return false;
      }
    }
  }
  return true;
}

function closeMapEditor() {
  mapDraft = null;
  mapSelectedRoomId = null;
  mapError.textContent = "";
  renderMap();
}

if (mapFloor) {
  // Text selected elsewhere on the page can still start the browser's own drag from a room.
  mapFloor.addEventListener("dragstart", (event) => event.preventDefault());
  mapEditButton.addEventListener("click", () => {
    mapDraft = structuredClone(mapLevels);
    mapDraftBaseId = mapLayoutId;
    mapSelectedRoomId = null;
    mapError.textContent = "";
    renderMap();
    mapLevelName.focus();
  });
  document.getElementById("map-room-close").addEventListener("click", () => {
    mapSelectedRoomId = null;
    renderMap();
  });
  document.getElementById("map-editor-cancel").addEventListener("click", closeMapEditor);

  mapLevelName.addEventListener("input", () => {
    getMapLevel().name = mapLevelName.value;
    renderMap();
  });
  mapRoomName.addEventListener("input", () => {
    getMapLevel().rooms.find((room) => room.id === mapSelectedRoomId).name = mapRoomName.value;
    renderMap();
  });
  // Enter in a name box shouldn't save the whole map by accident.
  mapEditor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("input")) {
      event.preventDefault();
    }
  });

  document.getElementById("map-add-level").addEventListener("click", () => {
    if (mapDraft.length >= MAX_MAP_LEVELS) {
      mapError.textContent = `Maps can have up to ${MAX_MAP_LEVELS} levels.`;
      return;
    }
    mapError.textContent = "";
    const level = { id: createMapId("level"), name: `Level ${mapDraft.length + 1}`, rooms: [] };
    mapDraft.push(level);
    mapLevelId = level.id;
    mapSelectedRoomId = null;
    renderMap();
    mapLevelName.select();
  });
  document.getElementById("map-level-earlier").addEventListener("click", () => moveDraftLevel(-1));
  document.getElementById("map-level-later").addEventListener("click", () => moveDraftLevel(1));
  document.getElementById("map-delete-level").addEventListener("click", () => {
    const level = getMapLevel();
    if (!window.confirm(`Delete ${level.name} and any rooms on it?`)) {
      return;
    }
    mapDraft.splice(mapDraft.indexOf(level), 1);
    mapSelectedRoomId = null;
    renderMap();
  });

  document.getElementById("map-add-room").addEventListener("click", () => {
    const level = getMapLevel();
    const spot = level.rooms.length < MAX_MAP_ROOMS_PER_LEVEL ? findFreeMapSpot(level.rooms) : null;
    if (!spot) {
      mapError.textContent = "There's no space for another room. Move, shrink or delete one first.";
      return;
    }
    mapError.textContent = "";
    const room = { id: createMapId("room"), name: `Room ${level.rooms.length + 1}`, ...spot };
    level.rooms.push(room);
    mapSelectedRoomId = room.id;
    renderMap();
    mapRoomName.select();
  });
  document.getElementById("map-delete-room").addEventListener("click", () => {
    const level = getMapLevel();
    level.rooms = level.rooms.filter((room) => room.id !== mapSelectedRoomId);
    mapSelectedRoomId = null;
    renderMap();
  });

  mapEditor.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkDraftNames()) {
      return;
    }
    if (
      mapLayoutId !== mapDraftBaseId &&
      !window.confirm("Someone else changed the map while you were editing. Replace their version with yours?")
    ) {
      return;
    }
    mapError.textContent = "";
    try {
      await saveRecord({ type: "map_layout", levels: mapDraft });
      closeMapEditor();
    } catch (error) {
      console.warn(error);
      mapError.textContent = error.userMessage ?? "Couldn't save the map. Please try again.";
    }
  });

  renderMap();
}

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
