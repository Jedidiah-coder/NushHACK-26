const statusText = document.getElementById("status");
const recordForm = document.getElementById("record-form");
const noteInput = document.getElementById("note");
const syncButton = document.getElementById("sync-button");
const recordList = document.getElementById("records");

async function refreshStatus() {
  const response = await fetch("/api/status");
  const { online, pending } = await response.json();
  statusText.textContent = `${online ? "Online" : "Offline"} - ${pending} pending upload`;
}

async function refreshRecords() {
  const response = await fetch("/api/records");
  const records = await response.json();

  recordList.replaceChildren(
    ...records.map((record) => {
      const item = document.createElement("li");
      const label = record.synced ? "Synced" : "Pending upload";
      item.textContent = `${record.data.note} (${label})`;
      return item;
    })
  );
}

async function refreshPage() {
  await Promise.all([refreshStatus(), refreshRecords()]);
}

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note: noteInput.value }),
  });
  recordForm.reset();
  await refreshPage();
});

syncButton.addEventListener("click", async () => {
  await fetch("/api/sync", { method: "POST" });
  await refreshPage();
});

refreshPage();
