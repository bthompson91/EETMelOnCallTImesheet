"use strict";
(() => {
  async function checked(url, options = {}) {
    const response = await driveJsonRequest(url, options);
    if (!response.ok) {
      const text = await response.text();
      let detail = text;
      try {
        const error = JSON.parse(text).error;
        detail = [error?.message, ...(error?.errors || []).map(item => item.reason)].filter(Boolean).join(" | ") || text;
      } catch {}
      throw new Error(`Google Drive (${response.status}): ${detail.slice(0, 1200)}`);
    }
    return response;
  }

  findDriveFile = async function () {
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      q: `name = '${DRIVE_FILE_NAME}' and trashed = false`,
      fields: "files(id,name,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: "100"
    });
    const response = await checked(`https://www.googleapis.com/drive/v3/files?${params}`);
    return (await response.json()).files?.[0] || null;
  };

  const button = document.getElementById("syncDrive");
  button.removeEventListener("click", syncToDrive);
  syncToDrive = async function () {
    button.disabled = true;
    try {
      setDriveStatus("Connecting to Google Drive…");
      const existing = await findDriveFile();
      const snapshot = JSON.stringify(db);
      if (existing && !confirm("Replace the existing Google Drive backup with the records on this device? This does not merge devices.")) {
        setDriveStatus("Upload cancelled. Your local entries are unchanged.");
        return;
      }
      let url, options;
      if (existing) {
        url = `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(existing.id)}?uploadType=media`;
        options = { method: "PATCH", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: snapshot };
      } else {
        const boundary = "timesheet_" + crypto.randomUUID();
        const metadata = { name: DRIVE_FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" };
        const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${snapshot}\r\n--${boundary}--\r\n`;
        url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
        options = { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body };
      }
      await checked(url, options);
      setDriveStatus("Saved to Google Drive successfully.");
    } catch (error) {
      setDriveStatus(error.message);
      alert(error.message);
    } finally {
      button.disabled = false;
    }
  };
  button.addEventListener("click", syncToDrive);
})();

(() => {
  function cycleKey(call) {
    const [year, month, day] = call.date.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = (date.getUTCDay() + 6) % 7;
    const previousCycle = weekday === 0 && timeMinutes(call.start) < 540;
    date.setUTCDate(date.getUTCDate() - weekday - (previousCycle ? 7 : 0));
    return date.toISOString().slice(0, 10);
  }
  const originalRenderEntries = renderEntries;
  renderEntries = function () {
    originalRenderEntries();
    const cycles = new Map();
    for (const call of db.calls) {
      const key = cycleKey(call);
      cycles.set(key, (cycles.get(key) || 0) + paidMinutes(call));
    }
    let payable = 0;
    let deducted = 0;
    for (const gross of cycles.values()) {
      payable += Math.max(0, gross - WEEKLY_RETAINER_MINUTES);
      deducted += Math.min(gross, WEEKLY_RETAINER_MINUTES);
    }
    $("totalTime").textContent = durationText(payable);
    $("totalTime").title = "After a 2-hour retainer per Monday 9 am cycle; unused retainer does not carry between cycles.";
    let note = document.getElementById("cycleRetainerNote");
    if (!note) {
      note = document.createElement("p");
      note.id = "cycleRetainerNote";
      document.getElementById("entryList").before(note);
    }
    note.textContent = `Retainer deducted: ${durationText(deducted)} across ${cycles.size} cycle(s). Cycles run Monday 9:00 am to Monday 9:00 am Melbourne time, using recorded call start times.`;
  };
  const style = document.createElement("style");
  style.textContent = '.settings label.week { flex: 0 0 auto; width: 170px; max-width: 100%; align-self: flex-start; } #weekEnding { width: 100%; min-width: 0; max-width: 100%; }';
  document.head.append(style);
  renderEntries();
})();
