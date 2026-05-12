const STROKES = {
  "SAQUE": ["SAQUE T", "SAQUE CRISTAL", "RESTO"],
  "DERECHA": ["CRUZADA", "PARALELA", "CENTRO", "GLOBO SIN CRISTAL"],
  "REVES": ["CRUZADA", "PARALELA", "CENTRO", "GLOBO SIN CRISTAL"],
  "VOLEA DERECHA": ["ALTA CRUZADA", "ALTA PARALELA", "BAJA CRUZADA", "BAJA PARALELA"],
  "VOLEA REVES": ["ALTA CRUZADA", "ALTA PARALELA", "BAJA CRUZADA", "BAJA PARALELA"],
  "ESP RED": ["BANDEJA CRUZADA","BANDEJA PARALELA", "X3", "REMATE", "RULO", "DEJADA", "BA", "BD" ],
  "ESP FONDO": ["BAJADA DERECHA","BAJADA REVES", "CHIQUITA CRUZADA","CHIQUITA PARALELA", "CONTRARREMATE", "GLOBO CON CRISTAL"]
};

class PadelEventTracker {

  constructor() {

    this.events = [];
    this.pointId = 1;

    this.currentStrokeCategory = "SAQUE";

    this.score = {
      ourGames:0,
      rivalGames:0,
      ourPoints:0,
      rivalPoints:0
    };

    this.cronoSegundos = 0;
    this.cronoInterval = null;
    this.cronoRunning = false;

    this.init();
  }

  init(){

    this.renderCategoryButtons();
    this.renderAllStrokePanels();

    this.initToggles();
    this.initCourtZones();
    this.initCrono();
    this.initBottomButtons();

    this.renderScore();
  }

  initToggles(){

    this.setupToggleButton(
      "server-toggle",
      ["J1","J2","R1","R2"],
      value => `Saca ${value}`
    );

    this.setupToggleButton(
      "serve-number-toggle",
      ["1","2"],
      value => `${value}º`
    );

    this.setupToggleButton(
      "rally-toggle",
      ["MENOS_3","ENTRE_3_6","MAS_6"],
      value => {
        if(value==="MENOS_3") return "R:<3";
        if(value==="ENTRE_3_6") return "R:3-6";
        return "R:>6";
      }
    );
  }

  setupToggleButton(id, values, formatter){

    const btn = document.getElementById(id);

    btn.addEventListener("click", ()=>{

      const current = btn.dataset.value;
      const index = values.indexOf(current);
      const next = values[(index+1)%values.length];

      btn.dataset.value = next;
      btn.textContent = formatter(next);
    });
  }

  initCourtZones(){

    document.querySelectorAll(".court-zone").forEach(zone=>{

      zone.addEventListener("click", ()=>{

        this.registerPoint({
          point_result:"WON",
          outcome:"RIVAL_UNFORCED_ERROR",
          player_id:"",
          stroke_category:"",
          stroke_type:"",
          court_zone:zone.dataset.zone
        });

      });

    });

  }

  renderCategoryButtons(){

    const container = document.getElementById("category-buttons");
    container.innerHTML = "";

    Object.keys(STROKES).forEach(category=>{

      const btn = document.createElement("button");

      btn.className = "category-btn";
      btn.textContent = category;

      if(category===this.currentStrokeCategory){
        btn.classList.add("selected");
      }

      btn.addEventListener("click", ()=>{

        this.currentStrokeCategory = category;

        if(category==="Saque"){
          const rallyBtn = document.getElementById("rally-toggle");
          rallyBtn.dataset.value = "MENOS_3";
          rallyBtn.textContent = "R:<3";
        }

        this.renderCategoryButtons();
        this.renderAllStrokePanels();
      });

      container.appendChild(btn);

    });

  }

  renderAllStrokePanels(){

    this.renderStrokePanel("j1-win","J1","WON","WINNER_OR_FORCED");
    this.renderStrokePanel("j1-nf","J1","LOST","OWN_UNFORCED_ERROR");
    this.renderStrokePanel("j1-lost","J1","LOST","RIVAL_WINNER_OR_OWN_FORCED");

    this.renderStrokePanel("j2-win","J2","WON","WINNER_OR_FORCED");
    this.renderStrokePanel("j2-nf","J2","LOST","OWN_UNFORCED_ERROR");
    this.renderStrokePanel("j2-lost","J2","LOST","RIVAL_WINNER_OR_OWN_FORCED");
  }

  renderStrokePanel(panelId, playerId, pointResult, outcome){

    const container = document.getElementById(`stroke-buttons-${panelId}`);
    container.innerHTML = "";

    const counter = this.events.filter(e =>
      e.player_id===playerId &&
      e.point_result===pointResult &&
      e.outcome===outcome
    ).length;

    document.getElementById(`counter-${panelId}`).textContent = counter;

    STROKES[this.currentStrokeCategory].forEach(stroke=>{

      const btn = document.createElement("button");

      btn.className = "stroke-btn";
      btn.textContent = stroke;

      btn.addEventListener("click", ()=>{

        this.registerPoint({
          point_result:pointResult,
          outcome:outcome,
          player_id:playerId,
          stroke_category:this.currentStrokeCategory,
          stroke_type:stroke,
          court_zone:""
        });

      });

      container.appendChild(btn);

    });

  }

  initCrono(){

    document.getElementById("toggle-crono")
      .addEventListener("click", ()=>this.toggleCrono());

    document.getElementById("minus-crono")
      .addEventListener("click", ()=>this.modifyCrono(-5));

    document.getElementById("plus-crono")
      .addEventListener("click", ()=>this.modifyCrono(5));

    document.getElementById("reset-crono")
      .addEventListener("click", ()=>this.resetCrono());
  }

  toggleCrono(){

    this.cronoRunning
      ? this.stopCrono()
      : this.startCrono();
  }

  startCrono(){

    if(this.cronoInterval) return;

    this.cronoRunning = true;

    document.getElementById("toggle-crono").textContent = "⏸";

    this.cronoInterval = setInterval(()=>{

      this.cronoSegundos++;
      this.renderCrono();

    },1000);
  }

  stopCrono(){

    clearInterval(this.cronoInterval);

    this.cronoInterval = null;
    this.cronoRunning = false;

    document.getElementById("toggle-crono").textContent = "▶";
  }

  modifyCrono(value){

    this.cronoSegundos = Math.max(0,this.cronoSegundos+value);
    this.renderCrono();
  }

  resetCrono(){

    this.cronoSegundos = 0;
    this.renderCrono();
  }

  renderCrono(){

    const min = String(Math.floor(this.cronoSegundos/60)).padStart(2,"0");
    const sec = String(this.cronoSegundos%60).padStart(2,"0");

    document.getElementById("crono-display").textContent = `${min}:${sec}`;
  }

  addScorePoint(winner){

    winner==="OUR"
      ? this.score.ourPoints++
      : this.score.rivalPoints++;

    this.normalizeGameScore();
  }

  normalizeGameScore(){

    const our = this.score.ourPoints;
    const rival = this.score.rivalPoints;

    if(our>=4 && our-rival>=2){
      this.winGame("OUR");
    }

    if(rival>=4 && rival-our>=2){
      this.winGame("RIVAL");
    }
  }

  winGame(team){

    team==="OUR"
      ? this.score.ourGames++
      : this.score.rivalGames++;

    this.score.ourPoints = 0;
    this.score.rivalPoints = 0;
  }

  getPointLabel(points){

    return ["0","15","30","40"][Math.min(points,3)];
  }

  renderScore(){

    document.getElementById("our-games").textContent =
      this.score.ourGames;

    document.getElementById("rival-games").textContent =
      this.score.rivalGames;

    document.getElementById("our-points").textContent =
      this.getPointLabel(this.score.ourPoints);

    document.getElementById("rival-points").textContent =
      this.getPointLabel(this.score.rivalPoints);
  }

  registerPoint(data){

    const winner =
      data.point_result==="WON"
        ? "OUR"
        : "RIVAL";

    this.addScorePoint(winner);

    const event = {

      timestamp:new Date().toISOString(),

      point_id:this.pointId,

      point_result:data.point_result,
      outcome:data.outcome,

      player_id:data.player_id,

      stroke_category:data.stroke_category,
      stroke_type:data.stroke_type,

      court_zone:data.court_zone,

      rally:document.getElementById("rally-toggle").dataset.value,

      server:document.getElementById("server-toggle").dataset.value,

      serve_number:document.getElementById("serve-number-toggle").dataset.value,

      point_duration_seconds:this.cronoSegundos,

      our_games_after:this.score.ourGames,
      rival_games_after:this.score.rivalGames
    };

    this.events.push(event);

    this.pointId++;

    document.getElementById("serve-number-toggle").dataset.value = "1";
    document.getElementById("serve-number-toggle").textContent = "1º";

    this.renderAllStrokePanels();
    this.renderScore();
    this.updateUI();
  }

  updateUI(){

    document.getElementById("event-count").textContent =
      this.events.length;

    document.getElementById("undo-btn").disabled =
      this.events.length===0;

    document.getElementById("export-btn").disabled =
      this.events.length===0;

    const last = this.events[this.events.length-1];

    if(!last){

      document.getElementById("last-event").textContent =
        "Sin eventos";

      return;
    }

    document.getElementById("last-event").textContent =
      `${last.player_id || "RIVAL"} · ${last.stroke_type || last.court_zone}`;
  }

  initBottomButtons(){

    document.getElementById("undo-btn")
      .addEventListener("click", ()=>this.undoLastEvent());

    document.getElementById("export-btn")
      .addEventListener("click", ()=>this.exportCSV());
  }

  undoLastEvent(){

    if(this.events.length===0) return;

    this.events.pop();

    this.score = {
      ourGames:0,
      rivalGames:0,
      ourPoints:0,
      rivalPoints:0
    };

    this.events.forEach(event=>{

      const winner =
        event.point_result==="WON"
          ? "OUR"
          : "RIVAL";

      this.addScorePoint(winner);
    });

    this.renderAllStrokePanels();
    this.renderScore();
    this.updateUI();
  }

  exportCSV(){

    const headers = Object.keys(this.events[0] || {});

    const rows = this.events.map(event => {

      return headers.map(header => {

        const value = event[header] ?? "";

        return `"${String(value).replaceAll('"','""')}"`;

      }).join(",");

    });

    const csv = [headers.join(","),...rows].join("\n");

    const blob = new Blob([csv],{
      type:"text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "padel-events.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

}

document.addEventListener("DOMContentLoaded", ()=>{

  new PadelEventTracker();

});