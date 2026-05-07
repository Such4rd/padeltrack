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
        this.currentPlayer = 'J1';
        this.currentTeam = 'OUR';
        this.currentOutcome = 'WINNER';

        this.cronoSegundos = 0;
        this.cronoInterval = null;

        this.initializeStrokeSelectors();
        this.initializeEventListeners();
        this.updateUI();
        this.updateEventsTable();
    }

    initializeStrokeSelectors() {
        this.categorySelect = document.getElementById('stroke-category');
        this.subtypeSelect = document.getElementById('stroke-subtype');

        Object.keys(STROKES).forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.categorySelect.appendChild(option);
        });

        this.updateSubtypeOptions();

        this.categorySelect.addEventListener('change', () => {
            this.updateSubtypeOptions();
        });
    }

    updateSubtypeOptions() {
        const category = this.categorySelect.value;
        this.subtypeSelect.innerHTML = '';

        STROKES[category].forEach(stroke => {
            const option = document.createElement('option');
            option.value = stroke;
            option.textContent = stroke;
            this.subtypeSelect.appendChild(option);
        });
    }

    initializeEventListeners() {
        document.querySelectorAll('[data-player]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectPlayer(e.target.dataset.player, e.target.dataset.team);
                this.updateButtonSelection('.player-buttons .btn', btn);
            });
        });

        document.querySelectorAll('[data-outcome]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentOutcome = e.target.dataset.outcome;
                this.updateButtonSelection('.outcome-buttons .btn', btn);
            });
        });

        const court = document.getElementById('padel-court');
        court.addEventListener('click', (e) => this.handleCourtTap(e));

        document.getElementById('undo-btn').addEventListener('click', () => this.undoLastEvent());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCSV());

        document.getElementById('start-crono').addEventListener('click', () => this.startCrono());
        document.getElementById('stop-crono').addEventListener('click', () => this.stopCrono());
        document.getElementById('plus-crono').addEventListener('click', () => this.modifyCrono(1));
        document.getElementById('minus-crono').addEventListener('click', () => this.modifyCrono(-1));
        document.getElementById('reset-crono').addEventListener('click', () => this.resetCrono());
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
        const min = String(Math.floor(this.cronoSegundos / 60)).padStart(2, '0');
        const sec = String(this.cronoSegundos % 60).padStart(2, '0');

        document.getElementById('crono-display').textContent = `${min}:${sec}`;
    }

    selectPlayer(playerId, team) {
        this.currentPlayer = playerId;
        this.currentTeam = team;
    }

    updateButtonSelection(selector, selectedBtn) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.classList.remove('selected');
        });

        selectedBtn.classList.add('selected');
    }

    handleCourtTap(event) {
        const court = document.getElementById('padel-court');
        const rect = court.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        this.createEvent(x, y);
    }

    createEvent(xCoord, yCoord) {
        const event = {
            timestamp: new Date().toISOString(),
            point_id: this.pointId,
            player_id: this.currentPlayer,
            player_team: this.currentTeam,
            stroke_category: this.categorySelect.value,
            stroke_type: this.subtypeSelect.value,
            outcome: this.currentOutcome,
            x_coord: xCoord.toFixed(3),
            y_coord: yCoord.toFixed(3),
            rally: document.getElementById('rally-input').value,
            server: document.getElementById('server-select').value,
            serve_number: document.getElementById('serve-number').value,
            serve_direction: document.getElementById('serve-direction').value,
            point_duration_seconds: this.cronoSegundos
        };

        this.events.push(event);
        this.pointId++;

        this.updateUI();
        this.updateEventsTable();
    }

    undoLastEvent() {
        if (this.events.length > 0) {
            this.events.pop();
            this.pointId--;
            this.updateUI();
            this.updateEventsTable();
        }
    }

    exportCSV() {
        const headers = [
            'point_id',
            'player_id',
            'player_team',
            'stroke_category',
            'stroke_type',
            'outcome',
            'rally',
            'server',
            'serve_number',
            'serve_direction',
            'point_duration_seconds',
            'x_coord',
            'y_coord'
        ];

        const csvContent = [
            headers.join(','),
            ...this.events.map(event =>
                headers.map(header => event[header]).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'padel-events.csv');

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    updateUI() {
        document.getElementById('event-count').textContent = this.events.length;
        document.getElementById('undo-btn').disabled = this.events.length === 0;
        document.getElementById('export-btn').disabled = this.events.length === 0;
    }

    updateEventsTable() {
        const tableBody = document.getElementById('events-table-body');

        if (this.events.length === 0) {
            tableBody.innerHTML = '<tr class="no-events"><td colspan="5">No hay eventos registrados</td></tr>';
            return;
        }

        const recentEvents = this.events.slice(-10).reverse();

        tableBody.innerHTML = recentEvents.map(event => {
            return `
                <tr>
                    <td>${event.point_id}</td>
                    <td>${event.player_id}</td>
                    <td>${event.stroke_type}</td>
                    <td>${event.rally}</td>
                    <td>${event.point_duration_seconds}s</td>
                </tr>
            `;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PadelEventTracker();
});
