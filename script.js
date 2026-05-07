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

  "Golpes especiales fondo": [
    "bajada derecha",
    "bajada revés",
    "chiquita cruzada",
    "chiquita paralela",
    "contrarremate",
    "globo con cristal"
  ],

  "Golpes especiales red": [
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

    this.score = {
      ourGames: 0,
      rivalGames: 0,
      ourPoints: 0,
      rivalPoints: 0
    };

    this.cronoSegundos = 0;
    this.cronoInterval = null;
    this.cronoRunning = false;

    this.categorySelect = document.getElementById("stroke-category");
    this.subtypeSelect = document.getElementById("stroke-subtype");

    this.initStrokeSelectors();
    this.initEvents();
    this.updateUI();
    this.updateStrokeCount();
    this.renderScore();
  }

  initStrokeSelectors() {
    Object.keys(STROKES).forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      this.categorySelect.appendChild(option);
    });

    this.updateSubtypeOptions();

    this.categorySelect.addEventListener("change", () => {
      this.updateSubtypeOptions();
      this.updateStrokeCount();
    });

    this.subtypeSelect.addEventListener("change", () => {
      this.updateStrokeCount();
    });
  }

  updateSubtypeOptions() {
    const category = this.categorySelect.value;
    this.subtypeSelect.innerHTML = "";

    STROKES[category].forEach(stroke => {
      const option = document.createElement("option");
      option.value = stroke;
      option.textContent = stroke;
      this.subtypeSelect.appendChild(option);
    });
  }

  initEvents() {
    document.querySelectorAll("[data-point-result]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentPointResult = button.dataset.pointResult;
        this.setSelected("[data-point-result]", button);
        this.updateStrokeCount();
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
      });
    });

    document.querySelectorAll(".court-zone").forEach(zone => {
      zone.addEventListener("click", () => {
        this.registerPoint(zone.dataset.zone);
      });
    });

    document.getElementById("toggle-crono").addEventListener("click", () => this.toggleCrono());
    document.getElementById("minus-crono").addEventListener("click", () => this.modifyCrono(-5));
    document.getElementById("plus-crono").addEventListener("click", () => this.modifyCrono(5));
    document.getElementById("reset-crono").addEventListener("click", () => this.resetCrono());

    document.getElementById("minus-rally").addEventListener("click", () => this.modifyRally(-1));
    document.getElementById("plus-rally").addEventListener("click", () => this.modifyRally(1));

    document.getElementById("undo-btn").addEventListener("click", () => this.undoLastEvent());
    document.getElementById("export-btn").addEventListener("click", () => this.exportCSV());

    document.getElementById("deuce-mode").addEventListener("change", () => {
      this.recalculateScore();
      this.renderScore();
    });
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

  modifyRally(value) {
    const input = document.getElementById("rally-input");
    const current = Number(input.value || 1);
    input.value = Math.max(1, current + value);
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
      if (our >= 4 && rival >= 3) {
        this.winGame("OUR");
      } else if (rival >= 4 && our >= 3) {
        this.winGame("RIVAL");
      } else if (our >= 4) {
        this.winGame("OUR");
      } else if (rival >= 4) {
        this.winGame("RIVAL");
      }

      return;
    }

    if (our >= 4 && our - rival >= 2) {
      this.winGame("OUR");
    }

    if (rival >= 4 && rival - our >= 2) {
      this.winGame("RIVAL");
    }
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

    if (own <= 3 && other <= 3) {
      return labels[own];
    }

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
    const selectedStroke = this.subtypeSelect.value;
    const selectedCategory = this.categorySelect.value;

    const count = this.events.filter(event =>
      event.player_id === this.currentPlayer &&
      event.point_result === this.currentPointResult &&
      event.stroke_category === selectedCategory &&
      event.stroke_type === selectedStroke &&
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
      stroke_category: this.categorySelect.value,
      stroke_type: this.subtypeSelect.value,
      outcome: this.currentOutcome,
      rally: document.getElementById("rally-input").value,
      server: document.getElementById("server-select").value,
      serve_number: document.getElementById("serve-number").value,
      serve_direction: document.getElementById("serve-direction").value,
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

    this.modifyRally(1);
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
      `P${lastEvent.point_id} · ${lastEvent.point_result} · ${lastEvent.player_id} · ${lastEvent.stroke_type} · ${lastEvent.outcome} · ${lastEvent.court_zone} · ${lastEvent.our_games_after}-${lastEvent.rival_games_after}`;
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