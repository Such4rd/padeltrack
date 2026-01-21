class PadelEventTracker {
    constructor() {
        this.events = [];
        this.pointId = 1;
        this.currentPlayer = 'J1';
        this.currentTeam = 'OUR';
        this.currentStroke = 'DERECHA';
        this.currentOutcome = 'WINNER';
        
        this.initializeEventListeners();
        this.updateUI();
        this.updateEventsTable();
    }

    initializeEventListeners() {
        // Player selection
        document.querySelectorAll('[data-player]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectPlayer(e.target.dataset.player, e.target.dataset.team);
                this.updateButtonSelection('.player-buttons .btn', btn);
            });
        });

        // Stroke selection
        document.querySelectorAll('[data-stroke]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentStroke = e.target.dataset.stroke;
                this.updateButtonSelection('.stroke-buttons .btn', btn);
            });
        });

        // Outcome selection
        document.querySelectorAll('[data-outcome]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentOutcome = e.target.dataset.outcome;
                this.updateButtonSelection('.outcome-buttons .btn', btn);
            });
        });

        // Court tap/click
        const court = document.getElementById('padel-court');
        court.addEventListener('click', (e) => this.handleCourtTap(e));
        court.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleCourtTap(e.changedTouches[0]);
        });

        // Action buttons
        document.getElementById('undo-btn').addEventListener('click', () => this.undoLastEvent());
        document.getElementById('export-btn').addEventListener('click', () => this.exportCSV());
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
        
        // Calculate normalized coordinates (0-1)
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        
        // Clamp coordinates to valid range
        const xCoord = Math.max(0, Math.min(1, x));
        const yCoord = Math.max(0, Math.min(1, y));
        
        this.createEvent(xCoord, yCoord);
        this.showTouchFeedback(event.clientX - rect.left, event.clientY - rect.top);
    }

    showTouchFeedback(x, y) {
        const court = document.getElementById('padel-court');
        const feedback = document.createElement('div');
        feedback.className = 'touch-feedback';
        feedback.style.left = x + 'px';
        feedback.style.top = y + 'px';
        
        court.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 600);
    }

    createEvent(xCoord, yCoord) {
        const event = {
            timestamp: new Date().toISOString(),
            point_id: this.pointId,
            player_id: this.currentPlayer,
            player_team: this.currentTeam,
            stroke_type: this.currentStroke,
            outcome: this.currentOutcome,
            x_coord: xCoord.toFixed(3),
            y_coord: yCoord.toFixed(3)
        };

        this.events.push(event);
        this.pointId++;
        this.updateUI();
        this.updateEventsTable();
        this.showStatusMessage(`Evento registrado: ${this.currentPlayer} - ${this.currentStroke}`, 'success');
    }

    undoLastEvent() {
        if (this.events.length > 0) {
            const removedEvent = this.events.pop();
            this.pointId--;
            this.updateUI();
            this.updateEventsTable();
            this.showStatusMessage(`Evento eliminado: ${removedEvent.player_id} - ${removedEvent.stroke_type}`, 'success');
        }
    }

    exportCSV() {
        if (this.events.length === 0) {
            this.showStatusMessage('No hay eventos para exportar', 'error');
            return;
        }

        const headers = ['point_id', 'player_id', 'player_team', 'stroke_type', 'outcome', 'x_coord', 'y_coord'];
        const csvContent = [
            headers.join(','),
            ...this.events.map(event => 
                headers.map(header => event[header]).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `padel-events-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showStatusMessage(`CSV exportado con ${this.events.length} eventos`, 'success');
    }

    updateUI() {
        document.getElementById('event-count').textContent = this.events.length;
        document.getElementById('undo-btn').disabled = this.events.length === 0;
        document.getElementById('export-btn').disabled = this.events.length === 0;
    }

    showStatusMessage(message, type) {
        const statusDiv = document.getElementById('status-message');
        statusDiv.textContent = message;
        statusDiv.className = `status-message status-${type}`;
        
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    }

    updateEventsTable() {
        const tableBody = document.getElementById('events-table-body');
        
        if (this.events.length === 0) {
            tableBody.innerHTML = '<tr class="no-events"><td colspan="5">No hay eventos registrados</td></tr>';
            return;
        }
        
        // Mostrar los últimos 10 eventos (los más recientes primero)
        const recentEvents = this.events.slice(-10).reverse();
        
        tableBody.innerHTML = recentEvents.map((event, index) => {
            const playerClass = event.player_team === 'OUR' ? 'player-our' : 'player-rival';
            const outcomeClass = event.outcome === 'WINNER' ? 'outcome-winner' : 'outcome-error';
            const position = `${(parseFloat(event.x_coord) * 100).toFixed(0)},${(parseFloat(event.y_coord) * 100).toFixed(0)}`;
            
            return `
                <tr class="event-row" data-x="${event.x_coord}" data-y="${event.y_coord}">
                    <td>${event.point_id}</td>
                    <td class="${playerClass}">${event.player_id}</td>
                    <td>${event.stroke_type}</td>
                    <td class="${outcomeClass}">${event.outcome === 'WINNER' ? 'WIN' : event.outcome === 'FORCED_ERROR' ? 'F.ERR' : 'UF.ERR'}</td>
                    <td>${position}</td>
                </tr>
            `;
        }).join('');
        
        // Añadir event listeners para hover
        this.addTableHoverListeners();
    }

    addTableHoverListeners() {
        const eventRows = document.querySelectorAll('.event-row');
        
        eventRows.forEach(row => {
            row.addEventListener('mouseenter', (e) => {
                const x = parseFloat(e.target.closest('tr').dataset.x);
                const y = parseFloat(e.target.closest('tr').dataset.y);
                this.showPositionMarker(x, y);
            });
            
            row.addEventListener('mouseleave', () => {
                this.hidePositionMarker();
            });
        });
    }

    showPositionMarker(xCoord, yCoord) {
        const court = document.getElementById('padel-court');
        let marker = court.querySelector('.position-marker');
        
        if (!marker) {
            marker = document.createElement('div');
            marker.className = 'position-marker';
            court.appendChild(marker);
        }
        
        // Convertir coordenadas normalizadas a píxeles
        const rect = court.getBoundingClientRect();
        const x = xCoord * rect.width;
        const y = yCoord * rect.height;
        
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        marker.classList.add('show');
    }

    hidePositionMarker() {
        const court = document.getElementById('padel-court');
        const marker = court.querySelector('.position-marker');
        
        if (marker) {
            marker.classList.remove('show');
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PadelEventTracker();
});

// Prevent zoom on double tap (iOS Safari)
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);