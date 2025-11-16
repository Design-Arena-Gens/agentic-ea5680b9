/* Fixed demo routes and schedules.
   Each route runs every intervalMinutes between startTime and endTime (local time).
*/
const ROUTES = [
  {
    name: "Blue Line",
    stops: ["Central Station", "North Park", "Airport"],
    startTime: "05:00",
    endTime: "23:00",
    intervalMinutes: 30,
  },
  {
    name: "Red Line",
    stops: ["Central Station", "East Side", "West End"],
    startTime: "06:00",
    endTime: "22:00",
    intervalMinutes: 20,
  },
  {
    name: "Green Loop",
    stops: ["West End", "Central Station", "East Side"],
    startTime: "07:00",
    endTime: "21:00",
    intervalMinutes: 15,
  },
];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":" ).map(Number);
  return h * 60 + m;
}

function minutesToHHMM(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function uniqueStops(routes) {
  const set = new Set();
  routes.forEach(r => r.stops.forEach(s => set.add(s)));
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

function generateDeparturesForToday(route) {
  const start = toMinutes(route.startTime);
  const end = toMinutes(route.endTime);
  const times = [];
  for (let t = start; t <= end; t += route.intervalMinutes) {
    times.push(t);
  }
  return times;
}

function findCandidateTrips(origin, destination) {
  // Consider routes where origin and destination are on the same line and order is forward
  const candidates = [];
  for (const route of ROUTES) {
    const oi = route.stops.indexOf(origin);
    const di = route.stops.indexOf(destination);
    if (oi !== -1 && di !== -1 && oi < di) {
      candidates.push(route);
    }
  }
  return candidates;
}

function findNextDeparture(origin, destination, now = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const candidateRoutes = findCandidateTrips(origin, destination);

  if (candidateRoutes.length === 0) {
    return { status: "no_route" };
  }

  let best = null; // { route, timeMinutes, dayOffset }

  for (const route of candidateRoutes) {
    const departuresToday = generateDeparturesForToday(route);
    // Next today
    const nextToday = departuresToday.find(t => t >= nowMinutes);
    if (typeof nextToday === "number") {
      const record = { route, timeMinutes: nextToday, dayOffset: 0 };
      if (!best || record.timeMinutes < best.timeMinutes || best.dayOffset === 1) {
        best = record;
      }
    } else {
      // First tomorrow
      const firstTomorrow = departuresToday[0];
      const record = { route, timeMinutes: firstTomorrow, dayOffset: 1 };
      if (!best || best.dayOffset === 1 && record.timeMinutes < best.timeMinutes) {
        best = record;
      }
    }
  }

  if (!best) {
    return { status: "no_service" };
  }

  return {
    status: "ok",
    routeName: best.route.name,
    timeText: minutesToHHMM(best.timeMinutes),
    dayText: best.dayOffset === 0 ? "today" : "tomorrow",
  };
}

function setNowClock() {
  const el = document.getElementById("now");
  if (!el) return;
  const update = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    el.textContent = `${hh}:${mm}:${ss}`;
  };
  update();
  setInterval(update, 1000);
}

function populateStops() {
  const stops = uniqueStops(ROUTES);
  const originSel = document.getElementById("origin");
  const destSel = document.getElementById("destination");
  originSel.innerHTML = `<option value="" disabled selected>Select origin</option>` +
    stops.map(s => `<option value="${s}">${s}</option>`).join("");
  destSel.innerHTML = `<option value="" disabled selected>Select destination</option>` +
    stops.map(s => `<option value="${s}">${s}</option>`).join("");
}

function attachHandlers() {
  const form = document.getElementById("route-form");
  const result = document.getElementById("result");
  const originSel = document.getElementById("origin");
  const destSel = document.getElementById("destination");
  const swapBtn = document.getElementById("swap");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const origin = originSel.value;
    const destination = destSel.value;

    if (!origin || !destination) {
      result.innerHTML = `<span class="warn">Please select both origin and destination.</span>`;
      return;
    }
    if (origin === destination) {
      result.innerHTML = `<span class="warn">Origin and destination must be different.</span>`;
      return;
    }

    const next = findNextDeparture(origin, destination, new Date());
    if (next.status === "no_route") {
      result.innerHTML = `<span class="warn">No direct route found between <strong>${origin}</strong> and <strong>${destination}</strong>.</span> <span class="dim">Try another pair.</span>`;
      return;
    }
    if (next.status !== "ok") {
      result.innerHTML = `<span class="warn">No upcoming departures.</span>`;
      return;
    }

    result.innerHTML = `
      <div class="ok">Next bus: ${next.timeText} ${next.dayText}</div>
      <div class="dim">Route: ${next.routeName}</div>
    `;
  });

  swapBtn.addEventListener("click", () => {
    const o = originSel.value;
    const d = destSel.value;
    if (o && d) {
      originSel.value = d;
      destSel.value = o;
      result.textContent = "";
    }
  });
}

// Initialize
window.addEventListener("DOMContentLoaded", () => {
  setNowClock();
  populateStops();
  attachHandlers();
});
