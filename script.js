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

    this.currentPlayer = "J1";
    this.currentTeam = "OUR";
    this.currentPointResult = "WON";
    this.currentOutcome = "UNFORCED_ERROR";
    this.currentRallyRange = "MENOS_3";

    this.currentStrokeCategory = "Saque";
    this.currentStrokeType = "saque t";

    this.score = {
      ourGames: 0,
      rivalGames: 0,
      ourPoints: 0,
      rivalPoints: 0
    };

    this.cronoSegundos = 0;
    this.cronoInterval = null;
    this.cronoRunning = false;

    this.categoryButtons = document.getElementById("category-buttons");
    this.strokeButtons = document.getElementById("stroke-buttons");

    this.initStrokeButtons();
    this.initEvents();
    this.initServiceToggles();
    this.updateUI();
    this.updateStrokeCount();
    this.renderScore();
    this.renderSelectedStroke();
    this.updateVisibleRegisterMode();
  }

  initStrokeButtons() {
    this.categoryButtons.innerHTML = "";

    Object.keys(STROKES).forEach(category => {
      const button = document.createElement("button");
      button.className = "category-btn";
      button.textContent = category;
      button.dataset.category = category;

      if (category === this.currentStrokeCategory) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => {
        this.currentStrokeCategory = category;
        this.currentStrokeType = STROKES[category][0];

        this.renderCategoryButtons();
        this.renderStrokeButtons();
        this.renderSelectedStroke();
        this.updateStrokeCount();
      });

      this.categoryButtons.appendChild(button);
    });

    this.renderStrokeButtons();
  }

  renderCategoryButtons() {
    document.querySelectorAll(".category-btn").forEach(button => {
      button.classList.toggle(
        "selected",
        button.dataset.category === this.currentStrokeCategory
      );
    });
  }

  renderStrokeButtons() {
    this.strokeButtons.innerHTML = "";

    STROKES[this.currentStrokeCategory].forEach(stroke => {
      const button = document.createElement("button");
      button.className = "stroke-btn";
      button.textContent = stroke;
      button.dataset.stroke = stroke;

      if (stroke === this.currentStrokeType) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => {
        this.currentStrokeType = stroke;

        this.renderStrokeButtons();
        this.renderSelectedStroke();
        this.updateStrokeCount();

        if (!this.shouldRegisterByZone()) {
          this.registerPoint("");
        }
      });

      this.strokeButtons.appendChild(button);
    });
  }

  renderSelectedStroke() {
    document.getElementById("selected-stroke").textContent =
      `${this.currentStrokeCategory} · ${this.currentStrokeType}`;
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
        this.updateStrokeCount();
        this.updateVisibleRegisterMode();
      });
    });

    document.querySelectorAll("[data-player]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentPlayer = button.dataset.player;
        this.currentTeam = button.dataset.team;
        this.setSelected("[data-player]", button);
        this.updateStrokeCount();
      });
    });

    document.querySelectorAll("[data-outcome]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentOutcome = button.dataset.outcome;
        this.setSelected("[data-outcome]", button);
        this.updateStrokeCount();
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
          this.registerPoint(zone.dataset.zone);
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
    const strokeArea = document.getElementById("stroke-area");
    const zoneArea = document.getElementById("zone-area");

    if (this.shouldRegisterByZone()) {
      strokeArea.classList.add("hidden");
      zoneArea.classList.remove("hidden");
    } else {
      strokeArea.classList.remove("hidden");
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

  updateStrokeCount() {
    const count = this.events.filter(event =>
      event.player_id === this.currentPlayer &&
      event.point_result === this.currentPointResult &&
      event.stroke_category === this.currentStrokeCategory &&
      event.stroke_type === this.currentStrokeType &&
      event.outcome === this.currentOutcome
    ).length;

    document.getElementById("stroke-count").textContent = count;
  }

  registerPoint(zone) {
    const winner = this.currentPointResult === "WON" ? "OUR" : "RIVAL";

    this.addScorePoint(winner);

    const event = {
      timestamp: new Date().toISOString(),
      point_id: this.pointId,
      point_result: this.currentPointResult,
      player_id: this.currentPlayer,
      player_team: this.currentTeam,
      stroke_category: this.shouldRegisterByZone() ? "" : this.currentStrokeCategory,
      stroke_type: this.shouldRegisterByZone() ? "" : this.currentStrokeType,
      outcome: this.currentOutcome,
      rally: this.currentRallyRange,
      server: this.getServiceValue("server-toggle"),
      serve_number: this.getServiceValue("serve-number-toggle"),
      serve_direction: "",
      court_zone: zone,
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
    this.updateStrokeCount();
    this.renderScore();
  }

  undoLastEvent() {
    if (this.events.length === 0) return;

    this.events.pop();
    this.pointId = Math.max(1, this.pointId - 1);

    this.recalculateScore();
    this.updateUI();
    this.updateStrokeCount();
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
      `P${lastEvent.point_id} · ${lastEvent.point_result} · ${lastEvent.player_id} · ${lastEvent.outcome} · ${lastEvent.stroke_type || lastEvent.court_zone} · ${lastEvent.our_games_after}-${lastEvent.rival_games_after}`;
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