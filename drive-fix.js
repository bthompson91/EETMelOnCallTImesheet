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
