"use strict";

const $ = (id) => document.getElementById(id);

const VENUES = [
  "1 Hotel",
  "AC By Marriott Melbourne Southbank",
  "CENTREPIECE",
  "Crown Melbourne",
  "Crowne Plaza",
  "Doubletree by Hilton",
  "Events Flemington",
  "Hilton Melbourne Little Queen St",
  "Hyatt Place Essendon Fields",
  "Hyde Melbourne Place",
  "Marriott Melbourne",
  "MCG",
  "Mel Base",
  "Melbourne Marriott Hotel Docklands",
  "Melbourne Showgrounds",
  "Mercure Doncaster",
  "Pan Pacific",
  "PARKROYAL Airport",
  "Park Hyatt",
  "Pullman Albert Park",
  "The Langham",
  "Vibe Docklands",
  "Warehouse",
  "Westin"
];

const STORAGE_KEY = "oncall.v051";

let db = {
  calls: [],
  active: null,
  employee: "Brendan T",
  week: ""
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  $("saved").textContent = "Saved on this device";
}

function load() {
  try {
    db = {
      ...db,
      ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    };
  } catch {
    db = {
      calls: [],
      active: null,
      employee: "Brendan T",
      week: ""
    };
  }

  if (!Array.isArray(db.calls)) {
    db.calls = [];
  }

  if (!db.week) {
    const date = new Date();
    date.setDate(date.getDate() + (date.getDay() ? 7 - date.getDay() : 0));
    db.week = dateISO(date);
  }
}

function dateISO(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function nowTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(11, 16);
}

function dateObject(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function displayDate(value) {
  return dateObject(value).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function timeMinutes(value) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function elapsedMinutes(start, end) {
  let duration = timeMinutes(end) - timeMinutes(start);

  if (duration < 0) {
    duration += 1440;
  }

  return duration;
}

function roundedMinutes(minutes) {
  return Math.max(15, Math.round(Math.max(0, minutes) / 15) * 15);
}

function timeText(value) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function durationText(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours) {
    return `${hours} h${remainder ? ` ${remainder} min` : ""}`;
  }

  return `${remainder} min`;
}

function isWeekend(date) {
  const day = dateObject(date).getDay();
  return day === 0 || day === 6;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function orderedCalls(calls) {
  return [...calls].sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);

    if (dateOrder !== 0) {
      return dateOrder;
    }

    return a.start.localeCompare(b.start);
  });
}

function firstAttendedCall(call) {
  const attendedCalls = orderedCalls(
    db.calls.filter((item) => item.attended && item.date === call.date)
  );

  return attendedCalls[0]?.id === call.id;
}

function paidMinutes(call) {
  if (!call.attended) {
    return roundedMinutes(elapsedMinutes(call.start, call.end));
  }

  const actualMinutes = roundedMinutes(
    call.onStart && call.onEnd
      ? elapsedMinutes(call.onStart, call.onEnd)
      : elapsedMinutes(call.start, call.end)
  );

  if (!firstAttendedCall(call)) {
    return actualMinutes;
  }

  return Math.max(actualMinutes, isWeekend(call.date) ? 240 : 60);
}

function showPage(name) {
  ["clock", "start", "finish", "entries", "stats"].forEach((page) => {
    $(`${page}Page`).classList.toggle("hidden", page !== name);
  });

  document.querySelectorAll("nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  if (name === "entries") {
    renderEntries();
  }

  if (name === "stats") {
    renderStats();
  }
}

function populateVenues(id) {
  $(id).innerHTML =
    '<option value="">Choose a venue</option>' +
    VENUES.map((venue) => `<option>${escapeHtml(venue)}</option>`).join("");
}

function updateClock() {
  const date = new Date();

  $("clock").textContent = date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit"
  });

  $("today").textContent = date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function renderHome() {
  const active = db.active;

  if (!active) {
    $("clockTitle").textContent = "Ready for a call";
    $("clockButton").textContent = "Clock in";
    $("clockButton").classList.remove("out");
    $("active").classList.add("hidden");
    return;
  }

  $("clockTitle").textContent = "Call in progress";
  $("clockButton").textContent = "Clock out";
  $("clockButton").classList.add("out");

  $("active").innerHTML = `
    <b>${escapeHtml(active.caller)} · ${escapeHtml(active.venue)}</b>
    <p>Started at ${timeText(active.start)}</p>
    <p>${escapeHtml(active.problem)}</p>
  `;

  $("active").classList.remove("hidden");
}

function renderEntries() {
  const calls = orderedCalls(db.calls);

  const remoteTotal = calls
    .filter((call) => !call.attended)
    .reduce((total, call) => total + paidMinutes(call), 0);

  const attendedTotal = calls
    .filter((call) => call.attended)
    .reduce((total, call) => total + paidMinutes(call), 0);

  $("callCount").textContent = calls.length;
  $("remoteTime").textContent = durationText(remoteTotal);
  $("attendedTime").textContent = durationText(attendedTotal);
  $("totalTime").textContent = durationText(remoteTotal + attendedTotal);

  if (!calls.length) {
    $("entryList").innerHTML = "<p>No entries yet.</p>";
    return;
  }

  const byDate = calls.reduce((groups, call) => {
    if (!groups[call.date]) {
      groups[call.date] = [];
    }

    groups[call.date].push(call);
    return groups;
  }, {});

  $("entryList").innerHTML = Object.entries(byDate)
    .map(([date, entries]) => {
      const rows = entries
        .map((call) => {
          return `
            <article class="entry ${call.attended ? "attended" : ""}">
              <div class="cell">
                <div class="top">${timeText(call.start)}</div>
                <div class="bottom">${timeText(call.end)}</div>
              </div>

              <div class="cell">
                <div class="top">${escapeHtml(call.caller)}</div>
                <div class="bottom">${escapeHtml(call.venue)}</div>
              </div>

              <div class="cell">
                <div class="top">${escapeHtml(call.problem)}</div>
                <div class="bottom">${escapeHtml(call.resolution)}</div>
              </div>

              <div class="cell total">
                ${durationText(paidMinutes(call))}
              </div>

              <div class="actions">
                <button type="button" onclick="editCall('${call.id}')">EDIT</button>
                <button type="button" onclick="deleteCall('${call.id}')">DELETE</button>
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="date-group">
          <div class="date-heading">${displayDate(date)}</div>

          <div class="entry-head">
            <div>TIME</div>
            <div>NAME</div>
            <div>PROBLEM / RESOLUTION</div>
            <div>TOTAL</div>
            <div>ACTIONS</div>
          </div>

          ${rows}
        </section>
      `;
    })
    .join("");
}

function renderChart(id, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    $(id).innerHTML = "<p>No calls recorded yet.</p>";
    return;
  }

  const radius = 53;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = data
    .map((item) => {
      const length = (circumference * item.value) / total;

      const output = `
        <circle
          cx="78"
          cy="78"
          r="${radius}"
          fill="none"
          stroke="${item.color}"
          stroke-width="30"
          stroke-dasharray="${length} ${circumference - length}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 78 78)"
        />
      `;

      offset += length;
      return output;
    })
    .join("");

  const legend = data
    .map((item) => {
      const percentage = Math.round((item.value / total) * 100);

      return `
        <div>
          <span>
            <i class="dot" style="background:${item.color}"></i>
            ${escapeHtml(item.name)}
          </span>
          <b>${item.value} (${percentage}%)</b>
        </div>
      `;
    })
    .join("");

  $(id).innerHTML = `
    <div class="chart">
      <svg class="donut" viewBox="0 0 156 156">
        <circle
          cx="78"
          cy="78"
          r="53"
          fill="none"
          stroke="#293957"
          stroke-width="30"
        />

        ${segments}

        <text x="78" y="73" text-anchor="middle" fill="white" font-size="25">
          ${total}
        </text>

        <text x="78" y="94" text-anchor="middle" fill="#aebbd3" font-size="12">
          calls
        </text>
      </svg>

      <div class="legend">
        ${legend}
      </div>
    </div>
  `;
}

function renderStats() {
  const timeBands = [
    { name: "00:00–06:00", value: 0, color: "#6cc8ff" },
    { name: "06:00–09:00", value: 0, color: "#61dda0" },
    { name: "17:00–24:00", value: 0, color: "#ffd36e" },
    { name: "Other times", value: 0, color: "#aa8cff" }
  ];

  const venues = {};

  db.calls.forEach((call) => {
    const time = timeMinutes(call.start);

    if (time < 360) {
      timeBands[0].value++;
    } else if (time < 540) {
      timeBands[1].value++;
    } else if (time >= 1020) {
      timeBands[2].value++;
    } else {
      timeBands[3].value++;
    }

    venues[call.venue] = (venues[call.venue] || 0) + 1;
  });

  $("statsText").textContent = db.calls.length
    ? `${db.calls.length} completed calls analysed.`
    : "No completed calls recorded yet.";

  renderChart("timeChart", timeBands);

  const colours = [
    "#61dda0",
    "#56a9ff",
    "#ffd36e",
    "#aa8cff",
    "#ff8c7a",
    "#70d6c0"
  ];

  const venueData = Object.entries(venues).map(([name, value], index) => ({
    name,
    value,
    color: colours[index % colours.length]
  }));

  renderChart("venueChart", venueData);
}

function beginStart() {
  if (db.active) {
    beginFinish();
    return;
  }

  $("startForm").reset();
  populateVenues("venue");
  showPage("start");
}

function saveStart(event) {
  event.preventDefault();

  const caller = $("caller").value.trim();
  const venue = $("venue").value;
  const problem = $("problem").value.trim();

  if (!caller || !venue || !problem) {
    return;
  }

  db.active = {
    id: crypto.randomUUID(),
    date: dateISO(),
    start: nowTime(),
    caller,
    venue,
    problem
  };

  save();
  renderHome();
  showPage("clock");
}

function beginFinish() {
  if (!db.active) {
    return;
  }

  $("finishForm").reset();
  updateFinishScreen();
  showPage("finish");
}

function updateFinishScreen() {
  const active = db.active;

  $("finishInfo").textContent =
    `Started at ${timeText(active.start)}. If you finish now, this records as ` +
    `${durationText(roundedMinutes(elapsedMinutes(active.start, nowTime())))}.`;

  const isAttended = $("attended").checked;

  $("onsite").classList.toggle("hidden", !isAttended);
  $("minimum").classList.toggle("hidden", !isAttended);

  if (isAttended) {
    const firstToday = !db.calls.some(
      (call) => call.attended && call.date === active.date
    );

    $("minimum").textContent = firstToday
      ? `First attended call today: ${isWeekend(active.date) ? 4 : 1} hour minimum applies.`
      : "Additional attended call uses rounded onsite time.";
  }
}

function saveFinish(event) {
  event.preventDefault();

  const resolution = $("resolution").value.trim();
  const onsiteStart = $("onsiteStart").value;
  const onsiteEnd = $("onsiteEnd").value;

  if (!resolution) {
    return;
  }

  if ((onsiteStart && !onsiteEnd) || (!onsiteStart && onsiteEnd)) {
    alert("Enter both onsite times, or leave both blank.");
    return;
  }

  db.calls.push({
    ...db.active,
    end: nowTime(),
    resolution,
    attended: $("attended").checked,
    onStart: onsiteStart,
    onEnd: onsiteEnd
  });

  db.active = null;

  save();
  renderHome();
  renderEntries();
  renderStats();
  showPage("clock");
}

window.deleteCall = function deleteCall(id) {
  if (!confirm("Delete this call?")) {
    return;
  }

  db.calls = db.calls.filter((call) => call.id !== id);

  save();
  renderEntries();
  renderStats();
};

window.editCall = function editCall() {
  alert("Edit will be restored after the new Entries layout is confirmed.");
};

function backup() {
  const blob = new Blob([JSON.stringify(db, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "On_Call_Backup.json";
  link.click();

  URL.revokeObjectURL(url);
}

async function restore(file) {
  if (!file) {
    return;
  }

  try {
    const restored = JSON.parse(await file.text());

    if (!Array.isArray(restored.calls)) {
      throw new Error("Invalid saved copy.");
    }

    db = restored;

    $("employee").value = db.employee || "Brendan T";
    $("weekEnding").value = db.week || "";

    save();
    renderHome();
    renderEntries();
    renderStats();
  } catch (error) {
    alert(error.message);
  }
}

function initialise() {
  load();

  $("employee").value = db.employee;
  $("weekEnding").value = db.week;

  updateClock();
  setInterval(updateClock, 1000);

  renderHome();
  renderEntries();
  renderStats();

  document.querySelectorAll("nav button").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  $("refresh").addEventListener("click", () => location.reload());

  $("clockButton").addEventListener("click", beginStart);
  $("startForm").addEventListener("submit", saveStart);
  $("finishForm").addEventListener("submit", saveFinish);
  $("attended").addEventListener("change", updateFinishScreen);

  document.querySelectorAll(".back").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  $("employee").addEventListener("change", () => {
    db.employee = $("employee").value;
    save();
  });

  $("weekEnding").addEventListener("change", () => {
    db.week = $("weekEnding").value;
    save();
  });

  ["saveCopy", "saveCopy2"].forEach((id) => {
    $(id).addEventListener("click", backup);
  });

  ["restoreCopy", "restoreCopy2"].forEach((id) => {
    $(id).addEventListener("click", () => $("restoreFile").click());
  });

  $("restoreFile").addEventListener("change", (event) => {
    restore(event.target.files[0]);
  });

  $("deleteAll").addEventListener("click", () => {
    if (!confirm("Delete all entries?")) {
      return;
    }

    db.calls = [];
    save();
    renderEntries();
    renderStats();
  });
}

try {
  initialise();
} catch (error) {
  $("error").textContent = error.message;
  $("error").classList.remove("hidden");
}