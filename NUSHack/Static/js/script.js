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

const tabs = [...document.querySelectorAll(".tab")];
const statusElement = document.getElementById("status");
const statusText = document.getElementById("status-text");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-text");
const messageError = document.getElementById("message-error");
const checklistForm = document.getElementById("checklist-form");
const checklistItems = document.getElementById("checklist-items");
const checklistError = document.getElementById("checklist-error");

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

function describeInspection(record) {
  const results = record.data.results;
  const failures = results.filter((entry) => entry.result === "Fail");
  const details = failures.map((entry) => `Failed: ${entry.item}: ${entry.note}`);
  const summary = `${results.length - failures.length} of ${results.length} OK`;
  return createRecordItem(`${record.data.name}: ${summary}`, record, details);
}

async function refreshRecords() {
  const records = await requestJson("/api/records");
  records.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // The "note" check keeps records saved by the first version of the page visible.
  const messages = records.filter((r) => r.data.type === "message" || r.data.note);
  const inspections = records.filter((r) => r.data.type === "checklist");

  showList(
    "message-list",
    "message-empty",
    messages.map((record) => createRecordItem(record.data.text ?? record.data.note, record))
  );
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
    await saveRecord({ type: "message", text });
    messageForm.reset();
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

buildChecklist();
refreshStatus();
refreshRecords().catch(console.warn);
