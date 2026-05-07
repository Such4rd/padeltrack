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
    this.currentOutcome = "UNFORCED_ERROR";

    this.cronoSegundos = 0;
    this.cronoInterval = null;

    this.categorySelect = document.getElementById("stroke-category");
    this.subtypeSelect = document.getElementById("stroke-subtype");

    this.initStrokeSelectors();
    this.initEvents();
    this.updateUI();
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
    document.querySelectorAll("[data-player]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentPlayer = button.dataset.player;
        this.currentTeam = button.dataset.team;
        this.setSelected("[data-player]", button);
      });
    });

    document.querySelectorAll("[data-outcome]").forEach(button => {
      button.addEventListener("click", () => {
        this.currentOutcome = button.dataset.outcome;
        this.setSelected("[data-outcome]", button);
      });
    });

    document.querySelectorAll(".court-zone").forEach(zone => {
      zone.addEventListener("click", () => {
        this.registerPoint(zone.dataset.zone);
      });
    });

    document.getElementById("start-crono").addEventListener("click", () => this.startCrono());
    document.getElementById("stop-crono").addEventListener("click", () => this.stopCrono());
    document.getElementById("minus-crono").addEventListener("click", () => this.modifyCrono(-1));
    document.getElementById("plus-crono").addEventListener("click", () => this.modifyCrono(1));
    document.getElementById("reset-crono").addEventListener("click", () => this.resetCrono());

    document.getElementById("undo-btn").addEventListener("click", () => this.undoLastEvent());
    document.getElementById("export-btn").addEventListener("click", () => this.exportCSV());
  }

  setSelected(selector, selectedButton) {
    document.querySelectorAll(selector).forEach(button => {
      button.classList.remove("selected");
    });

    selectedButton.classList.add("selected");
  }

  startCrono() {
    if (this.cronoInterval) return;

    this.cronoInterval = setInterval(() => {
      this.cronoSegundos++;
      this.renderCrono();
    }, 1000);
  }

  stopCrono() {
    clearInterval(this.cronoInterval);
    this.cronoInterval = null;
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

  registerPoint(zone) {
    const event = {
      timestamp: new Date().toISOString(),
      point_id: this.pointId,
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
      point_duration_seconds: this.cronoSegundos
    };

    this.events.push(event);
    this.pointId++;

    document.getElementById("rally-input").value = Number(event.rally || 0) + 1;

    this.updateUI();
  }

  undoLastEvent() {
    if (this.events.length === 0) return;

    this.events.pop();
    this.pointId = Math.max(1, this.pointId - 1);

    this.updateUI();
  }

  updateUI() {
    document.getElementById("event-count").textContent = this.events.length;
    document.getElementById("undo-btn").disabled = this.events.length === 0;
    document.getElementById("export-btn").disabled = this.events.length === 0;

    const lastEvent = this.events[this.events.length - 1];
    const lastEventBox = document.getElementById("last-event");

    if (!lastEvent) {
      lastEventBox.textContent = "Sin eventos registrados";
      return;
    }

    lastEventBox.textContent =
      `P${lastEvent.point_id} · ${lastEvent.player_id} · ${lastEvent.stroke_type} · ${lastEvent.outcome} · ${lastEvent.court_zone} · ${lastEvent.point_duration_seconds}s`;
  }

  exportCSV() {
    const headers = [
      "timestamp",
      "point_id",
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
      "point_duration_seconds"
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