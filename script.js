const STROKES = {
  "Saque": ["saque t", "saque cristal", "resto"],

  "Volea derecha": [
    "alta paralela",
    "alta cruzada",
    "baja paralela",
    "baja cruzada"
  ],

  "Volea revés": [
    "alta paralela",
    "alta cruzada",
    "baja paralela",
    "baja cruzada"
  ],

  "Derecha": [
    "cruzada",
    "paralela",
    "centro",
    "globo sin cristal"
  ],

  "Revés": [
    "alta paralela",
    "alta cruzada",
    "baja paralela",
    "baja cruzada"
  ],

  "Esp. fondo": [
    "bajada derecha",
    "bajada revés",
    "chiquita cruzada",
    "chiquita paralela",
    "contrarremate",
    "globo con cristal"
  ],

  "Esp. red": [
    "bandeja paralela",
    "bandeja cruzada",
    "x3",
    "remate",
    "rulo",
    "dejada",
    "batalla ataque",
    "batalla defensa"
  ]
};

class PadelEventTracker {
  constructor() {
    this.events = [];
    this.pointId = 1;

    this.currentPointResult = "WON";
    this.currentOutcome = "UNFORCED_ERROR";
    this.currentRallyRange = "MENOS_3";

    this.playerState = {
      J1: {
        category: "Saque",
        stroke: "saque t"
      },
      J2: {
        category: "Saque",
        stroke: "saque t"
      }
    };

    this.score = {
      ourGames: 0,
      rivalGames: 0,
      ourPoints: 0,
      rivalPoints: 0
    };

    this.cronoSegundos = 0;
    this.cronoInterval = null;
    this.cronoRunning = false;

    this.initStrokePanels();
    this.initEvents();
    this.initServiceToggles();
    this.updateUI();
    this.renderScore();
    this.updateVisibleRegisterMode();
  }

  initStrokePanels() {
    this.renderPlayerPanel("J1");
    this.renderPlayerPanel("J2");
  }

  renderPlayerPanel(playerId) {
    this.renderCategoryButtons(playerId);
    this.renderStrokeButtons(playerId);
  }

  renderCategoryButtons(playerId) {
    const container = document.getElementById(`category-buttons-${playerId.toLowerCase()}`);
    container.innerHTML = "";

    Object.keys(STROKES).forEach(category => {
      const button = document.createElement("button");
      button.className = "category-btn";
      button.textContent = category;
      button.dataset.category = category;

      if (category === this.playerState[playerId].category) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => {
        this.playerState[playerId].category = category;
        this.playerState[playerId].stroke = STROKES[category][0];

        this.renderPlayerPanel(playerId);
      });

      container.appendChild(button);
    });
  }

  renderStrokeButtons(playerId) {
    const container = document.getElementById(`stroke-buttons-${playerId.toLowerCase()}`);
    container.innerHTML = "";

    const category = this.playerState[playerId].category;

    STROKES[category].forEach(stroke => {
      const button = document.createElement("button");
      button.className = "stroke-btn";
      button.textContent = stroke;
      button.dataset.stroke = stroke;

      if (stroke === this.playerState[playerId].stroke) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => {
        this.playerState[playerId].stroke = stroke;
        this.renderStrokeButtons(playerId);

        if (!this.shouldRegisterByZone()) {
          this.registerPoint({
            zone: "",
            playerId: playerId,
            category: category,
            stroke: stroke
          });
        }
      });

      container.appendChild(button);
    });
  }

  initServiceToggles() {
    const serverValues = ["J1", "J2", "R1", "R2"];
    const serveNumberValues = ["1", "2"];

    this.setupToggleButton(
      "server-toggle",
      serverValues,
      value => `Saca ${value}`
    );

    this.setupToggleButton(
      "serve-number-toggle",
      serveNumberValues,
      value => `${value}º`
    );
  }

  setupToggleButton(buttonId, values, labelFormatter) {
    const button = document.getElementById(buttonId);

    button.addEventListener("click", () => {
      const currentValue = button.dataset.value;
      const currentIndex = values.indexOf(currentValue);
      const nextIndex = (currentIndex + 1) % values.length;
      const nextValue = values[nextIndex];

      button.dataset.value = nextValue;
      button.textContent = labelFormatter(nextValue);
      button.classList.add("active");
    });
  }

  getServiceValue(buttonId) {
    return document.getElementById(buttonId).dataset.value;
  }

  initEvents() {
    document.querySelectorAll("[data-point-result]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentPointResult = button.dataset.pointResult;
        this.setSelected("[data-point-result]", button);
        this.updateVisibleRegisterMode();
      });
    });

    document.querySelectorAll("[data-outcome]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentOutcome = button.dataset.outcome;
        this.setSelected("[data-outcome]", button);
        this.updateVisibleRegisterMode();
      });
    });

    document.querySelectorAll("[data-rally]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentRallyRange = button.dataset.rally;
        this.setSelected("[data-rally]", button);
      });
    });

    document.querySelectorAll(".court-zone").forEach(zone => {
      zone.addEventListener("click", () => {
        if (this.shouldRegisterByZone()) {
          this.registerPoint({
            zone: zone.dataset.zone,
            playerId: "",
            category: "",
            stroke: ""
          });
        }
      });
    });

    document.getElementById("toggle-crono").addEventListener("click", () => this.toggleCrono());
    document.getElementById("minus-crono").addEventListener("click", () => this.modifyCrono(-5));
    document.getElementById("plus-crono").addEventListener("click", () => this.modifyCrono(5));
    document.getElementById("reset-crono").addEventListener("click", () => this.resetCrono());

    document.getElementById("undo-btn").addEventListener("click", () => this.undoLastEvent());
    document.getElementById("export-btn").addEventListener("click", () => this.exportCSV());

    document.getElementById("deuce-mode").addEventListener("change", () => {
      this.recalculateScore();
      this.renderScore();
    });
  }

  shouldRegisterByZone() {
    return this.currentPointResult === "WON" &&
      this.currentOutcome === "UNFORCED_ERROR";
  }

  updateVisibleRegisterMode() {
    const playersStrokeArea = document.getElementById("players-stroke-area");
    const zoneArea = document.getElementById("zone-area");

    if (this.shouldRegisterByZone()) {
      playersStrokeArea.classList.add("hidden");
      zoneArea.classList.remove("hidden");
    } else {
      playersStrokeArea.classList.remove("hidden");
      zoneArea.classList.add("hidden");
    }
  }

  setSelected(selector, selectedButton) {
    document.querySelectorAll(selector).forEach(button => {
      button.classList.remove("selected");
    });

    selectedButton.classList.add("selected");
  }

  toggleCrono() {
    if (this.cronoRunning) {
      this.stopCrono();
    } else {
      this.startCrono();
    }
  }

  startCrono() {
    if (this.cronoInterval) return;

    this.cronoRunning = true;
    document.getElementById("toggle-crono").textContent = "⏸";

    this.cronoInterval = setInterval(() => {
      this.cronoSegundos++;
      this.renderCrono();
    }, 1000);
  }

  stopCrono() {
    clearInterval(this.cronoInterval);
    this.cronoInterval = null;
    this.cronoRunning = false;
    document.getElementById("toggle-crono").textContent = "▶";
  }

  resetCrono() {
    this.cronoSegundos = 0;
    this.renderCrono();
  }

  modifyCrono(value) {
    this.cronoSegundos = Math.max(0, this.cronoSegundos + value);
    this.renderCrono();
  }

  renderCrono() {
    const minutes = String(Math.floor(this.cronoSegundos / 60)).padStart(2, "0");
    const seconds = String(this.cronoSegundos % 60).padStart(2, "0");

    document.getElementById("crono-display").textContent = `${minutes}:${seconds}`;
  }

  getDeuceMode() {
    return document.getElementById("deuce-mode").value;
  }

  addScorePoint(winner) {
    if (winner === "OUR") {
      this.score.ourPoints++;
    } else {
      this.score.rivalPoints++;
    }

    this.normalizeGameScore();
  }

  normalizeGameScore() {
    const our = this.score.ourPoints;
    const rival = this.score.rivalPoints;
    const mode = this.getDeuceMode();

    if (mode === "GOLDEN_POINT") {
      if (our >= 4 && rival >= 3) this.winGame("OUR");
      else if (rival >= 4 && our >= 3) this.winGame("RIVAL");
      else if (our >= 4) this.winGame("OUR");
      else if (rival >= 4) this.winGame("RIVAL");
      return;
    }

    if (our >= 4 && our - rival >= 2) this.winGame("OUR");
    if (rival >= 4 && rival - our >= 2) this.winGame("RIVAL");
  }

  winGame(team) {
    if (team === "OUR") {
      this.score.ourGames++;
    } else {
      this.score.rivalGames++;
    }

    this.score.ourPoints = 0;
    this.score.rivalPoints = 0;
  }

  getPointLabel(ourPoints, rivalPoints, team) {
    const labels = ["0", "15", "30", "40"];
    const own = team === "OUR" ? ourPoints : rivalPoints;
    const other = team === "OUR" ? rivalPoints : ourPoints;

    if (own <= 3 && other <= 3) return labels[own];

    if (own >= 3 && other >= 3) {
      if (own === other) return "40";
      if (this.getDeuceMode() === "ADVANTAGE") {
        return own > other ? "AD" : "40";
      }
      return "40";
    }

    return labels[Math.min(own, 3)];
  }

  renderScore() {
    document.getElementById("our-games").textContent = this.score.ourGames;
    document.getElementById("rival-games").textContent = this.score.rivalGames;

    document.getElementById("our-points").textContent =
      this.getPointLabel(this.score.ourPoints, this.score.rivalPoints, "OUR");

    document.getElementById("rival-points").textContent =
      this.getPointLabel(this.score.ourPoints, this.score.rivalPoints, "RIVAL");
  }

  recalculateScore() {
    this.score = {
      ourGames: 0,
      rivalGames: 0,
      ourPoints: 0,
      rivalPoints: 0
    };

    this.events.forEach(event => {
      const winner = event.point_result === "WON" ? "OUR" : "RIVAL";
      this.addScorePoint(winner);
    });
  }

  registerPoint(data) {
    const winner = this.currentPointResult === "WON" ? "OUR" : "RIVAL";

    this.addScorePoint(winner);

    const event = {
      timestamp: new Date().toISOString(),
      point_id: this.pointId,
      point_result: this.currentPointResult,
      player_id: data.playerId,
      player_team: data.playerId ? "OUR" : "",
      stroke_category: data.category,
      stroke_type: data.stroke,
      outcome: this.currentOutcome,
      rally: this.currentRallyRange,
      server: this.getServiceValue("server-toggle"),
      serve_number: this.getServiceValue("serve-number-toggle"),
      serve_direction: "",
      court_zone: data.zone,
      point_duration_seconds: this.cronoSegundos,
      deuce_mode: this.getDeuceMode(),
      our_games_after: this.score.ourGames,
      rival_games_after: this.score.rivalGames,
      our_points_after: this.getPointLabel(this.score.ourPoints, this.score.rivalPoints, "OUR"),
      rival_points_after: this.getPointLabel(this.score.ourPoints, this.score.rivalPoints, "RIVAL")
    };

    this.events.push(event);
    this.pointId++;

    this.updateUI();
    this.renderScore();
  }

  undoLastEvent() {
    if (this.events.length === 0) return;

    this.events.pop();
    this.pointId = Math.max(1, this.pointId - 1);

    this.recalculateScore();
    this.updateUI();
    this.renderScore();
  }

  updateUI() {
    document.getElementById("event-count").textContent = this.events.length;
    document.getElementById("undo-btn").disabled = this.events.length === 0;
    document.getElementById("export-btn").disabled = this.events.length === 0;

    const lastEvent = this.events[this.events.length - 1];
    const lastEventBox = document.getElementById("last-event");

    if (!lastEvent) {
      lastEventBox.textContent = "Sin eventos";
      return;
    }

    lastEventBox.textContent =
      `P${lastEvent.point_id} · ${lastEvent.point_result} · ${lastEvent.player_id || "ZONA"} · ${lastEvent.outcome} · ${lastEvent.stroke_type || lastEvent.court_zone} · ${lastEvent.our_games_after}-${lastEvent.rival_games_after}`;
  }

  exportCSV() {
    const headers = [
      "timestamp",
      "point_id",
      "point_result",
      "player_id",
      "player_team",
      "stroke_category",
      "stroke_type",
      "outcome",
      "rally",
      "server",
      "serve_number",
      "serve_direction",
      "court_zone",
      "point_duration_seconds",
      "deuce_mode",
      "our_games_after",
      "rival_games_after",
      "our_points_after",
      "rival_points_after"
    ];

    const rows = this.events.map(event => {
      return headers.map(header => {
        const value = event[header] ?? "";
        return `"${String(value).replaceAll('"', '""')}"`;
      }).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = "padel-events.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PadelEventTracker();
});