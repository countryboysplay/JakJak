(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const TOYS = [
    { id:'tinker', name:'Tinker Board', icon:'⚙️', blurb:'Build a working machine with motors, fans, magnets, gates and moving balls.', accent:'#79B9A6', kicker:'TOUCH & DISCOVER', hint:'Try everything. There is no wrong way.' },
    { id:'shapes', name:'Shape Workshop', icon:'△', blurb:'Solve spatial puzzles, symmetry, patterns, and build your own designs.', accent:'#76A9D7', kicker:'BUILD • ROTATE • SOLVE', hint:'Choose a challenge. Move and rotate pieces to figure it out.' },
    { id:'creature', name:'Creature Builder', icon:'👾', blurb:'Build a silly creature from interchangeable parts.', accent:'#9D8DC5', kicker:'MAKE SOMETHING SILLY', hint:'Drag pieces onto the creature.' },
    { id:'marbles', name:'Marble Lab', icon:'🔵', blurb:'Tap, roll, bounce and experiment with simple physics.', accent:'#E97863', kicker:'ROLL & EXPERIMENT', hint:'Tap the playground to drop marbles.' },
    { id:'basketball', name:'Basketball', icon:'🏀', blurb:'Flick real shots, learn angles, and take on harder challenges.', accent:'#E58B46', kicker:'AIM • FLICK • SWISH', hint:'Touch the ball, flick toward the hoop, and adjust your shot.' },
    { id:'bowling', name:'Bowling', icon:'🎳', blurb:'Aim, control power, add hook, and knock down real pin racks.', accent:'#68A7A1', kicker:'AIM • ROLL • STRIKE', hint:'Pick a ball, then swipe up the lane. Angle and speed change every roll.' },
    { id:'numbers', name:'Number Garden', icon:'🍎', blurb:'Count, compare, make sums, and solve number patterns.', accent:'#F2C45F', kicker:'COUNT & NOTICE', hint:'Put the same number of apples in the basket.' },
    { id:'logic', name:'Logic Tracks', icon:'🤖', blurb:'Plan a path, build a command sequence, and run the robot.', accent:'#6FA7C8', kicker:'PLAN • CODE • RUN', hint:'Build a path with arrows, then press Run.' },
    { id:'balance', name:'Balance Lab', icon:'⚖️', blurb:'Experiment with number combinations until both sides balance.', accent:'#A58CC6', kicker:'COMPARE • COMBINE • BALANCE', hint:'Add weights until both sides are equal.' },
    { id:'circuits', name:'Circuit Lab', icon:'💡', blurb:'Complete simple circuits and discover what conducts electricity.', accent:'#E2B84E', kicker:'CONNECT • TEST • DISCOVER', hint:'Change the parts until the device turns on.' },
    { id:'machine', name:'Number Machine', icon:'🔢', blurb:'Choose inputs and operations to make target numbers.', accent:'#79B9A6', kicker:'INPUT • CHANGE • SOLVE', hint:'Use the machine controls to make the target number.' },
    { id:'sounds', name:'Sound Garden', icon:'🎵', blurb:'Make gentle sounds and rhythms with colorful pads.', accent:'#D991A7', kicker:'LISTEN & PLAY', hint:'Tap the pads to make your own little song.' }
  ];

  const DEFAULTS = {
    enabledToys: TOYS.map(t => t.id),
    volume: 0.45,
    music: false,
    calmMotion: true,
    choiceCount: 12,
    sessionMinutes: 0,
    warningMinutes: 5
  };

  const state = {
    settings: loadSettings(),
    currentToy: null,
    cleanup: null,
    sessionTimer: null,
    warningTimer: null,
    audioCtx: null,
    masterGain: null,
    heldTimer: null
  };

  const homeScreen = $('#homeScreen');
  const gameScreen = $('#gameScreen');
  const toyGrid = $('#toyGrid');
  const gameMount = $('#gameMount');
  const homeButton = $('#homeButton');
  const resetButton = $('#resetButton');
  const brandButton = $('#brandButton');
  const parentHotspot = $('#parentHotspot');
  const parentGate = $('#parentGate');
  const settingsDialog = $('#settingsDialog');

  function loadSettings(){
    try {
      const saved = JSON.parse(localStorage.getItem('jakjak.settings')) || {};
      const merged = { ...DEFAULTS, ...saved };
      // Migrations: keep new toys visible for existing installs without disturbing
      // deliberately compact 4-toy home screens.
      if (!Array.isArray(merged.enabledToys)) merged.enabledToys = [...DEFAULTS.enabledToys];
      if (!merged.enabledToys.includes('basketball')) merged.enabledToys.push('basketball');
      if (!merged.enabledToys.includes('bowling')) merged.enabledToys.push('bowling');
      for (const id of ['logic','balance','circuits','machine']) if (!merged.enabledToys.includes(id)) merged.enabledToys.push(id);
      if ([6,7,8,9,10,11].includes(saved.choiceCount ?? 6)) merged.choiceCount = 12;
      return merged;
    } catch { return { ...DEFAULTS, enabledToys:[...DEFAULTS.enabledToys] }; }
  }
  function saveSettings(){
    localStorage.setItem('jakjak.settings', JSON.stringify(state.settings));
    applyComfort();
    renderHome();
  }
  function applyComfort(){
    document.body.classList.toggle('calm-motion', !!state.settings.calmMotion);
    if (state.masterGain) state.masterGain.gain.value = Number(state.settings.volume);
  }

  function renderHome(){
    const enabled = TOYS.filter(t => state.settings.enabledToys.includes(t.id)).slice(0, Number(state.settings.choiceCount) || 6);
    toyGrid.innerHTML = enabled.map(t => `
      <button class="toy-card" data-toy="${t.id}" style="--accent:${t.accent}" aria-label="Open ${t.name}">
        <span class="toy-dot" aria-hidden="true"></span>
        <div class="toy-art" aria-hidden="true">${t.icon}</div>
        <div><h3>${t.name}</h3><p>${t.blurb}</p></div>
      </button>`).join('');
    $$('[data-toy]', toyGrid).forEach(btn => btn.addEventListener('click', () => openToy(btn.dataset.toy)));
  }

  function openToy(id){
    const toy = TOYS.find(t => t.id === id); if (!toy) return;
    cleanupToy();
    state.currentToy = id;
    homeScreen.classList.remove('active'); gameScreen.classList.add('active');
    homeButton.classList.remove('hidden'); resetButton.classList.remove('hidden');
    $('#gameKicker').textContent = toy.kicker;
    $('#gameTitle').textContent = toy.name;
    $('#gameHint').textContent = toy.hint;
    gameMount.innerHTML = '';
    const makers = { tinker:makeTinker, shapes:makeShapes, creature:makeCreature, marbles:makeMarbles, basketball:makeBasketball, bowling:makeBowling, numbers:makeNumbers, logic:makeLogicTracks, balance:makeBalanceLab, circuits:makeCircuitLab, machine:makeNumberMachine, sounds:makeSounds };
    state.cleanup = makers[id]?.() || null;
    $('#main').focus({preventScroll:true});
  }
  function goHome(){
    cleanupToy(); state.currentToy = null;
    gameScreen.classList.remove('active'); homeScreen.classList.add('active');
    homeButton.classList.add('hidden'); resetButton.classList.add('hidden');
    gameMount.innerHTML = '';
    $('#main').focus({preventScroll:true});
  }
  function resetToy(){ if (state.currentToy) openToy(state.currentToy); }
  function cleanupToy(){ if (typeof state.cleanup === 'function') { try{state.cleanup();}catch{} } state.cleanup = null; }

  function ensureAudio(){
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      state.audioCtx = new Ctx();
      state.masterGain = state.audioCtx.createGain();
      state.masterGain.gain.value = Number(state.settings.volume);
      state.masterGain.connect(state.audioCtx.destination);
    }
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
    return state.audioCtx;
  }
  function tone(freq=440, duration=.16, type='sine', gain=.12){
    const ctx = ensureAudio(); if (!ctx || Number(state.settings.volume) <= 0) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq; g.gain.value = gain;
    osc.connect(g); g.connect(state.masterGain);
    const now = ctx.currentTime; g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.start(now); osc.stop(now + duration);
  }
  function successChime(){ tone(523,.14,'sine',.09); setTimeout(()=>tone(659,.18,'sine',.08),100); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1800); }

  function makeTinker(){
    const PALETTE=['#2D78C4','#E97863','#F2C45F','#79B9A6','#9D8DC5','#D9689A'];
    let ballColor=localStorage.getItem('jakjak.tinker.ball')||PALETTE[0];
    if(!PALETTE.includes(ballColor))ballColor=PALETTE[0];
    gameMount.innerHTML=`
      <div class="tinker-lab">
        <div class="tinker-readout" aria-live="polite">
          <div><span class="tinker-dot" id="tinkerPowerDot"></span><strong id="tinkerPowerText">MACHINE OFF</strong></div>
          <div><strong id="tinkerCaught">0</strong><small> CAPTURED</small></div>
        </div>
        <canvas id="tinkerCanvas" class="tinker-canvas" aria-label="Interactive machine laboratory"></canvas>
        <div class="tinker-controls" aria-label="Machine controls">
          <button class="tinker-control power" id="tinkPower"><span>⚡</span><strong>Power</strong><small>machine</small></button>
          <button class="tinker-control" id="tinkFan"><span>🌬️</span><strong>Fan</strong><small>push</small></button>
          <button class="tinker-control" id="tinkMagnet"><span>🧲</span><strong>Magnet</strong><small>pull</small></button>
          <button class="tinker-control" id="tinkGate"><span>🚧</span><strong>Gate</strong><small>closed</small></button>
          <button class="tinker-control" id="tinkReverse"><span>↔️</span><strong>Direction</strong><small>right</small></button>
          <button class="tinker-control launch" id="tinkLaunch"><span>●</span><strong>Launch</strong><small>new ball</small></button>
        </div>
        <div class="tinker-speed-panel">
          <label for="tinkSpeed"><span>Motor speed</span><strong id="tinkSpeedLabel">55%</strong></label>
          <input id="tinkSpeed" type="range" min="0" max="100" value="55" />
        </div>
        <div class="tinker-ball-panel">
          <span>Ball color</span>
          <div class="tinker-colors">
            ${PALETTE.map(c=>`<button class="tinker-color ${c===ballColor?'active':''}" data-tink-color="${c}" style="--tink-color:${c}" aria-label="Choose ball color"></button>`).join('')}
          </div>
        </div>
        <div id="tinkerMessage" class="tinker-message">Turn on the machine, launch a ball, then change the controls while it moves.</div>
      </div>`;

    const c=$('#tinkerCanvas'),ctx=c.getContext('2d');
    const powerBtn=$('#tinkPower'),fanBtn=$('#tinkFan'),magnetBtn=$('#tinkMagnet'),gateBtn=$('#tinkGate'),reverseBtn=$('#tinkReverse');
    const speedInput=$('#tinkSpeed'),speedLabel=$('#tinkSpeedLabel'),message=$('#tinkerMessage');
    let running=true,last=performance.now(),power=false,fan=false,magnet=false,gateClosed=true,direction=1,speed=55,caught=0;
    let gearAngle=0,fanAngle=0,balls=[];

    function dims(){return{w:c.clientWidth,h:c.clientHeight};}
    function layout(){
      const {w,h}=dims();
      return {
        top:{x:w*.12,y:h*.27,w:w*.70},
        lower:{x:w*.15,y:h*.62,w:w*.70},
        gateX:w*.51,
        magnet:{x:w*.72,y:h*.14,r:30},
        fan:{x:w*.12,y:h*.51,r:27},
        gear:{x:w*.52,y:h*.50,r:35},
        catcher:{x:w*.77,y:h*.74,w:w*.16,h:h*.17}
      };
    }
    function resize(){
      const r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      balls.forEach(b=>{b.x=Math.min(c.clientWidth-b.r,Math.max(b.r,b.x));b.y=Math.min(c.clientHeight-b.r,Math.max(b.r,b.y));});
    }
    resize();const ro=new ResizeObserver(resize);ro.observe(c);

    function setMessage(t){message.textContent=t;}
    function updateControls(){
      powerBtn.classList.toggle('active',power);fanBtn.classList.toggle('active',fan);magnetBtn.classList.toggle('active',magnet);gateBtn.classList.toggle('active',!gateClosed);reverseBtn.classList.toggle('active',direction<0);
      $('#tinkerPowerDot').classList.toggle('on',power);$('#tinkerPowerText').textContent=power?'MACHINE ON':'MACHINE OFF';
      gateBtn.querySelector('small').textContent=gateClosed?'closed':'open';reverseBtn.querySelector('small').textContent=direction>0?'right':'left';$('#tinkerCaught').textContent=caught;
    }
    function launch(){
      const {w,h}=dims();
      balls.push({x:w*.17,y:h*.15,vx:35*direction,vy:0,r:13+Math.random()*3,color:ballColor,captured:false});
      tone(185,.08,'triangle',.06);setMessage('Ball launched. Change the machine while it moves.');
      if(balls.length>12)balls.splice(0,balls.length-12);
    }
    powerBtn.addEventListener('click',()=>{power=!power;updateControls();tone(power?440:220,.11,'square',.05);setMessage(power?'Machine powered up. Try the motor, fan, magnet, and gate.':'Power off. Gravity still works.');});
    fanBtn.addEventListener('click',()=>{fan=!fan;updateControls();tone(fan?360:210,.09,'sine',.045);});
    magnetBtn.addEventListener('click',()=>{magnet=!magnet;updateControls();tone(magnet?520:250,.1,'triangle',.05);});
    gateBtn.addEventListener('click',()=>{gateClosed=!gateClosed;updateControls();tone(gateClosed?175:310,.08,'square',.04);});
    reverseBtn.addEventListener('click',()=>{direction*=-1;updateControls();tone(direction>0?410:300,.08,'sine',.04);});
    $('#tinkLaunch').addEventListener('click',launch);
    speedInput.addEventListener('input',e=>{speed=+e.target.value;speedLabel.textContent=`${speed}%`;if(speed%10<2)tone(180+speed*2.3,.035,'sine',.025);});
    $$('.tinker-color').forEach(btn=>btn.addEventListener('click',()=>{ballColor=btn.dataset.tinkColor;localStorage.setItem('jakjak.tinker.ball',ballColor);$$('.tinker-color').forEach(b=>b.classList.toggle('active',b===btn));tone(340,.05,'sine',.03);}));
    c.addEventListener('pointerdown',e=>{const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;balls.push({x,y,vx:(Math.random()-.5)*90,vy:-80,r:13,color:ballColor,captured:false});tone(230,.05,'sine',.025);});

    function circleCollision(ball,cx,cy,cr,boost=0){
      const dx=ball.x-cx,dy=ball.y-cy,d=Math.hypot(dx,dy),min=ball.r+cr;if(d<=0||d>=min)return;
      const nx=dx/d,ny=dy/d,over=min-d;ball.x+=nx*over;ball.y+=ny*over;
      const rel=ball.vx*nx+ball.vy*ny;if(rel<0){ball.vx-=1.75*rel*nx;ball.vy-=1.75*rel*ny;ball.vx+=-ny*boost;ball.vy+=nx*boost;}
    }
    function drawGear(x,y,r,angle){
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#6F7C82';ctx.strokeStyle='#526066';ctx.lineWidth=3;
      ctx.beginPath();for(let i=0;i<20;i++){const a=i*Math.PI/10,rr=i%2===0?r:r*.78;const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#E8E2D7';ctx.beginPath();ctx.arc(0,0,r*.28,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function drawMachine(){
      const {w,h}=dims(),L=layout();ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#D9E8E6');bg.addColorStop(1,'#EFE2CB');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      // Decorative panel rivets
      ctx.fillStyle='rgba(57,72,80,.18)';[[18,18],[w-18,18],[18,h-18],[w-18,h-18]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();});
      // Top conveyor
      ctx.fillStyle='#48565C';roundRect(ctx,L.top.x,L.top.y,L.top.w,22,11);ctx.fill();
      ctx.strokeStyle=power?'#F2C45F':'#899499';ctx.lineWidth=4;for(let x=L.top.x+10;x<L.top.x+L.top.w-4;x+=23){ctx.beginPath();ctx.moveTo(x,L.top.y+4);ctx.lineTo(x+12,L.top.y+18);ctx.stroke();}
      ctx.fillStyle='#344047';ctx.font='800 11px system-ui';ctx.textAlign='left';ctx.fillText('CONVEYOR',L.top.x,L.top.y-9);
      // lower workbench
      ctx.fillStyle='#748187';roundRect(ctx,L.lower.x,L.lower.y,L.lower.w,16,8);ctx.fill();
      // gate
      ctx.save();ctx.translate(L.gateX,L.top.y);ctx.strokeStyle=gateClosed?'#E97863':'#79B9A6';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(gateClosed?0:34,gateClosed?-58:-32);ctx.stroke();ctx.restore();
      // magnet
      ctx.fillStyle=magnet&&power?'#E97863':'#9AA4A7';ctx.lineWidth=7;ctx.strokeStyle='#F6F0E7';ctx.beginPath();ctx.arc(L.magnet.x,L.magnet.y,24,.15*Math.PI,.85*Math.PI,true);ctx.stroke();ctx.strokeStyle=magnet&&power?'#D04F42':'#798488';ctx.beginPath();ctx.arc(L.magnet.x,L.magnet.y,24,.15*Math.PI,.85*Math.PI,true);ctx.stroke();
      ctx.fillStyle='#344047';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('MAGNET',L.magnet.x,L.magnet.y+43);
      // fan
      ctx.save();ctx.translate(L.fan.x,L.fan.y);ctx.rotate(fanAngle);ctx.fillStyle=fan&&power?'#76A9D7':'#AAB4B7';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.ellipse(0,-17,7,17,.35,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#526067';ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.fillStyle='#344047';ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText('FAN',L.fan.x,L.fan.y+40);
      // gears
      drawGear(L.gear.x,L.gear.y,L.gear.r,gearAngle);drawGear(L.gear.x+52,L.gear.y+25,L.gear.r*.68,-gearAngle*1.47);
      // catcher
      ctx.fillStyle='#29383F';roundRect(ctx,L.catcher.x,L.catcher.y,L.catcher.w,L.catcher.h,15);ctx.fill();ctx.fillStyle='#79B9A6';roundRect(ctx,L.catcher.x+7,L.catcher.y+7,L.catcher.w-14,L.catcher.h-14,10);ctx.fill();ctx.fillStyle='#24303A';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillText('CATCH',L.catcher.x+L.catcher.w/2,L.catcher.y+L.catcher.h/2+4);
      // motor meter
      ctx.fillStyle='#FFFDF8';roundRect(ctx,w*.10,h*.78,w*.48,34,12);ctx.fill();ctx.fillStyle=power?'#79B9A6':'#B7B9B6';roundRect(ctx,w*.115,h*.795,w*.45*(speed/100),10,5);ctx.fill();ctx.fillStyle='#536168';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillText(`MOTOR ${speed}%`,w*.11,h*.775);
      // Balls
      for(const b of balls){ctx.fillStyle=b.color;ctx.strokeStyle='rgba(36,48,58,.45)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(b.x-b.r*.35,b.y-b.r*.35,b.r*.25,0,Math.PI*2);ctx.fill();}
    }
    function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
    function step(now){
      if(!running)return;const dt=Math.min(.025,(now-last)/1000);last=now;const {w,h}=dims(),L=layout();
      if(power){gearAngle+=direction*(.4+speed/32)*dt;fanAngle+=(fan?8:1.2)*dt;}
      for(const b of balls){
        b.vy+=430*dt;
        // Conveyor drive only while resting near its surface.
        if(power&&b.y+b.r>L.top.y-8&&b.y+b.r<L.top.y+26&&b.x>L.top.x&&b.x<L.top.x+L.top.w){b.vx+=direction*(70+speed*2.2)*dt;}
        // Fan pushes horizontally through the lower chamber.
        if(power&&fan&&b.x>L.fan.x-10&&b.x<w*.82&&Math.abs(b.y-L.fan.y)<100)b.vx+=(180+speed*2.3)*dt;
        // Magnet attracts from a broad radius.
        if(power&&magnet){const dx=L.magnet.x-b.x,dy=L.magnet.y-b.y,d2=dx*dx+dy*dy;if(d2<220*220&&d2>120){const d=Math.sqrt(d2),f=(23000/d2)*(70+speed*.65);b.vx+=(dx/d)*f*dt;b.vy+=(dy/d)*f*dt;}}
        b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.993,dt*60);
        // top conveyor platform
        if(b.x>L.top.x&&b.x<L.top.x+L.top.w&&b.y+b.r>L.top.y&&b.y-b.r<L.top.y&&b.vy>0){b.y=L.top.y-b.r;b.vy*=-.42;b.vx*=.96;}
        // gate collision
        if(gateClosed&&b.y+b.r>L.top.y-62&&b.y-b.r<L.top.y+5&&Math.abs(b.x-L.gateX)<b.r+5){b.x=b.x<L.gateX?L.gateX-b.r-6:L.gateX+b.r+6;b.vx*=-.72;}
        // lower platform
        if(b.x>L.lower.x&&b.x<L.lower.x+L.lower.w&&b.y+b.r>L.lower.y&&b.y-b.r<L.lower.y&&b.vy>0){b.y=L.lower.y-b.r;b.vy*=-.52;b.vx*=.98;}
        // moving gear bumpers
        circleCollision(b,L.gear.x,L.gear.y,L.gear.r*.78,power?direction*(35+speed*.7):0);circleCollision(b,L.gear.x+52,L.gear.y+25,L.gear.r*.50,power?-direction*(28+speed*.5):0);
        // screen edges
        if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx)*.7;}if(b.x+b.r>w){b.x=w-b.r;b.vx=-Math.abs(b.vx)*.7;}
        // catcher
        if(!b.captured&&b.x>L.catcher.x&&b.x<L.catcher.x+L.catcher.w&&b.y>L.catcher.y&&b.y<L.catcher.y+L.catcher.h){b.captured=true;caught++;$('#tinkerCaught').textContent=caught;successChime();setMessage(`Captured ${caught}! Can you change the controls and do it a different way?`);}
        if(b.y>h+45){b.y=30;b.x=w*(.16+Math.random()*.16);b.vx=(Math.random()-.5)*80;b.vy=0;b.captured=false;}
      }
      drawMachine();requestAnimationFrame(step);
    }
    updateControls();launch();requestAnimationFrame(step);
    return()=>{running=false;ro.disconnect();};
  }

  function makeShapes(){
    gameMount.innerHTML=`
      <div class="shape-lab">
        <div class="shape-modebar" role="group" aria-label="Shape Workshop modes">
          <button class="pill-btn shape-mode active" data-shape-mode="build">🧩 Build</button>
          <button class="pill-btn shape-mode" data-shape-mode="symmetry">↔️ Symmetry</button>
          <button class="pill-btn shape-mode" data-shape-mode="pattern">🧠 Patterns</button>
          <button class="pill-btn shape-mode" data-shape-mode="free">✨ Free Build</button>
        </div>
        <div class="shape-statusbar">
          <div><span id="shapeChallengeIcon">🚀</span><strong id="shapeChallengeName">Rocket</strong></div>
          <div class="shape-progress" id="shapeProgress">0 / 6</div>
        </div>
        <canvas id="shapeCanvas" class="shape-canvas" aria-label="Shape puzzle workspace"></canvas>
        <div class="shape-tools" id="shapeTools">
          <button class="pill-btn" id="shapeRotateLeft" aria-label="Rotate selected piece left">↺ Rotate</button>
          <button class="pill-btn" id="shapeRotateRight" aria-label="Rotate selected piece right">Rotate ↻</button>
          <button class="pill-btn" id="shapeNext">Next challenge</button>
        </div>
        <div id="shapePatternPanel" class="shape-pattern-panel hidden"></div>
        <div id="shapeMessage" class="shape-message">Build the rocket. Pieces snap only when position and rotation are close.</div>
      </div>`;

    const c=$('#shapeCanvas'),ctx=c.getContext('2d');
    const msg=$('#shapeMessage'),progressEl=$('#shapeProgress'),nameEl=$('#shapeChallengeName'),iconEl=$('#shapeChallengeIcon');
    const tools=$('#shapeTools'),patternPanel=$('#shapePatternPanel');
    let running=true,mode='build',challenge=0,selected=null,drag=null,pieces=[],targets=[];
    let patternRound=0,patternScore=0;
    const COLORS=['#E97863','#76A9D7','#79B9A6','#F2C45F','#9D8DC5','#D991A7','#EF9B67'];
    const puzzles=[
      {name:'Rocket',icon:'🚀',message:'Build the rocket. Try rotating pieces until they fit.',parts:[
        ['triangle',0,-1.15,-.23,-90],['rect',1,-.55,-.23,90],['square',2,.02,-.23,0],['triangle',3,.58,-.52,180],['triangle',4,.58,.06,0],['diamond',5,1.05,-.23,45]
      ]},
      {name:'Robot',icon:'🤖',message:'Build the robot. Notice how the same shapes can make something new.',parts:[
        ['square',0,-.72,-.05,0],['rect',1,-.05,-.05,90],['circle',2,.58,-.38,0],['circle',3,.58,.27,0],['triangle',4,.06,-.62,0],['diamond',5,.82,-.05,45]
      ]},
      {name:'Fish',icon:'🐟',message:'Build the fish. Some pieces need a quarter-turn.',parts:[
        ['triangle',0,-.78,-.03,90],['diamond',1,-.18,-.03,45],['square',2,.38,-.03,0],['triangle',3,.88,-.34,-90],['triangle',4,.88,.28,90],['circle',5,.28,-.34,0]
      ]},
      {name:'Castle',icon:'🏰',message:'Build the castle. Look for symmetry and repeated shapes.',parts:[
        ['rect',0,-.68,.03,0],['rect',1,.68,.03,0],['square',2,0,.12,0],['triangle',3,-.68,-.57,0],['triangle',4,.68,-.57,0],['diamond',5,0,-.45,45]
      ]}
    ];
    const SHAPE_SIZE={circle:30,square:34,triangle:38,rect:38,diamond:35};

    function dims(){return{w:c.clientWidth,h:c.clientHeight};}
    function resize(){
      const r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(mode!=='pattern') setupMode(true);
    }
    const ro=new ResizeObserver(resize);ro.observe(c);

    function targetLayout(parts){
      const {w,h}=dims(),cx=w*.5,cy=h*.39,scale=Math.min(w/5.2,h/3.4);
      return parts.map(([type,id,nx,ny,rot])=>({id,type,x:cx+nx*scale,y:cy+ny*scale,rot,size:SHAPE_SIZE[type],filled:false}));
    }
    function trayPieces(types){
      const {w,h}=dims(),n=types.length,usable=w-38,step=usable/n;
      return types.map((type,i)=>({id:`p${i}-${Date.now()}`,type,x:19+step*(i+.5),y:h*.84,rot:0,size:SHAPE_SIZE[type],color:COLORS[i%COLORS.length],locked:false}));
    }
    function symmetrySetup(){
      const {w,h}=dims(),cx=w*.5;
      const base=[
        {type:'triangle',x:cx-w*.28,y:h*.27,rot:25,size:34},
        {type:'square',x:cx-w*.18,y:h*.45,rot:0,size:32},
        {type:'diamond',x:cx-w*.31,y:h*.60,rot:45,size:32},
        {type:'circle',x:cx-w*.13,y:h*.66,rot:0,size:27}
      ];
      targets=base.map((b,i)=>({id:i,type:b.type,x:cx+(cx-b.x),y:b.y,rot:(360-b.rot)%360,size:b.size,filled:false,ghostSource:b}));
      pieces=trayPieces(base.map(x=>x.type));
      pieces.forEach((p,i)=>p.color=COLORS[(i+2)%COLORS.length]);
      return base;
    }
    let symmetrySource=[];

    function setupMode(keepSize=false){
      if(!c.clientWidth||!c.clientHeight)return;
      selected=null;drag=null;
      patternPanel.classList.add('hidden');c.classList.remove('hidden');tools.classList.remove('hidden');
      if(mode==='build'){
        const p=puzzles[challenge%puzzles.length];nameEl.textContent=p.name;iconEl.textContent=p.icon;msg.textContent=p.message;
        targets=targetLayout(p.parts);pieces=trayPieces(p.parts.map(x=>x[0]));progressEl.textContent=`0 / ${targets.length}`;
        $('#shapeNext').textContent='Next challenge';
      }else if(mode==='symmetry'){
        nameEl.textContent='Mirror It';iconEl.textContent='↔️';msg.textContent='Make the right side a mirror of the left side.';
        symmetrySource=symmetrySetup();progressEl.textContent=`0 / ${targets.length}`;$('#shapeNext').textContent='New mirror';
      }else if(mode==='free'){
        nameEl.textContent='Free Build';iconEl.textContent='✨';msg.textContent='Build anything. Tap a piece, rotate it, and move it anywhere.';
        targets=[];pieces=trayPieces(['triangle','square','rect','diamond','circle','triangle','square']);progressEl.textContent='CREATE';$('#shapeNext').textContent='Fresh pieces';
      }
      draw();
    }

    function pathShape(type,size){
      ctx.beginPath();
      if(type==='circle'){ctx.arc(0,0,size,0,Math.PI*2);return;}
      if(type==='square'){ctx.roundRect?ctx.roundRect(-size,-size,size*2,size*2,9):ctx.rect(-size,-size,size*2,size*2);return;}
      if(type==='rect'){ctx.roundRect?ctx.roundRect(-size*1.15,-size*.62,size*2.3,size*1.24,8):ctx.rect(-size*1.15,-size*.62,size*2.3,size*1.24);return;}
      if(type==='diamond'){ctx.moveTo(0,-size);ctx.lineTo(size,0);ctx.lineTo(0,size);ctx.lineTo(-size,0);ctx.closePath();return;}
      ctx.moveTo(0,-size);ctx.lineTo(size*.92,size*.78);ctx.lineTo(-size*.92,size*.78);ctx.closePath();
    }
    function drawOne(o,{ghost=false,selectedRing=false,source=false}={}){
      ctx.save();ctx.translate(o.x,o.y);ctx.rotate((o.rot||0)*Math.PI/180);pathShape(o.type,o.size);
      if(ghost){ctx.fillStyle='rgba(56,70,78,.07)';ctx.strokeStyle='rgba(56,70,78,.30)';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.fill();ctx.stroke();ctx.setLineDash([]);}
      else if(source){ctx.fillStyle='rgba(118,169,215,.28)';ctx.strokeStyle='rgba(58,83,101,.48)';ctx.lineWidth=2;ctx.fill();ctx.stroke();}
      else{ctx.fillStyle=o.color;ctx.strokeStyle='rgba(36,48,58,.42)';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(-o.size*.25,-o.size*.25,Math.max(5,o.size*.13),0,Math.PI*2);ctx.fill();}
      if(selectedRing){ctx.setLineDash([5,5]);ctx.strokeStyle='#24303A';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,o.size*1.45,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      ctx.restore();
    }
    function drawGrid(){
      const {w,h}=dims();ctx.fillStyle='#F9F4EA';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(77,93,103,.07)';ctx.lineWidth=1;
      for(let x=24;x<w;x+=24){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=24;y<h;y+=24){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.fillStyle='rgba(121,185,166,.10)';ctx.fillRect(0,h*.73,w,h*.27);ctx.strokeStyle='rgba(62,78,88,.18)';ctx.beginPath();ctx.moveTo(0,h*.73);ctx.lineTo(w,h*.73);ctx.stroke();
      ctx.fillStyle='#657178';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillText(mode==='free'?'PIECE TRAY • MOVE THEM ANYWHERE':'PIECE TRAY',12,h*.76);
    }
    function draw(){
      const {w,h}=dims();ctx.clearRect(0,0,w,h);drawGrid();
      if(mode==='symmetry'){
        ctx.save();ctx.strokeStyle='rgba(36,48,58,.35)';ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(w*.5,h*.08);ctx.lineTo(w*.5,h*.70);ctx.stroke();ctx.restore();
        symmetrySource.forEach(o=>drawOne(o,{source:true}));
      }
      targets.forEach(t=>{if(!t.filled)drawOne(t,{ghost:true});});
      pieces.forEach(p=>drawOne(p,{selectedRing:p===selected}));
      if(mode==='build'){
        ctx.fillStyle='rgba(36,48,58,.62)';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText(`${puzzles[challenge%puzzles.length].icon} BUILD THE ${puzzles[challenge%puzzles.length].name.toUpperCase()}`,w/2,22);
      }else if(mode==='symmetry'){
        ctx.fillStyle='rgba(36,48,58,.62)';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('MAKE BOTH SIDES MATCH',w/2,22);
      }
    }
    function angleDiff(a,b){let d=Math.abs(((a-b+180)%360)-180);return d;}
    function rotOkay(piece,target){if(piece.type==='circle'||piece.type==='square'||piece.type==='diamond')return true;return angleDiff(piece.rot,target.rot)<28;}
    function snapPiece(piece){
      if(mode==='free')return false;
      let best=null,bd=Infinity;
      for(const t of targets){if(t.filled||t.type!==piece.type)continue;const d=Math.hypot(piece.x-t.x,piece.y-t.y);if(d<bd){bd=d;best=t;}}
      if(best&&bd<Math.max(48,piece.size*1.45)&&rotOkay(piece,best)){
        piece.x=best.x;piece.y=best.y;piece.rot=best.rot;piece.locked=true;best.filled=true;selected=null;successChime();
        const n=targets.filter(t=>t.filled).length;progressEl.textContent=`${n} / ${targets.length}`;
        if(n===targets.length){msg.textContent=mode==='symmetry'?'Perfect mirror. Try a new one.':'Solved it. Try the next build.';successChime();toast('Solved!');}
        return true;
      }
      return false;
    }
    function point(e){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    function hitPiece(x,y){for(let i=pieces.length-1;i>=0;i--){const p=pieces[i];if(p.locked)continue;if(Math.hypot(x-p.x,y-p.y)<p.size*1.5)return p;}return null;}
    c.addEventListener('pointerdown',e=>{if(mode==='pattern')return;const q=point(e),p=hitPiece(q.x,q.y);if(!p)return;selected=p;drag={p,dx:q.x-p.x,dy:q.y-p.y};pieces.splice(pieces.indexOf(p),1);pieces.push(p);c.setPointerCapture(e.pointerId);tone(260,.035,'sine',.025);draw();});
    c.addEventListener('pointermove',e=>{if(!drag)return;const q=point(e),{w,h}=dims(),p=drag.p;p.x=Math.max(p.size,Math.min(w-p.size,q.x-drag.dx));p.y=Math.max(p.size,Math.min(h-p.size,q.y-drag.dy));draw();});
    c.addEventListener('pointerup',()=>{if(!drag)return;const p=drag.p;drag=null;if(!snapPiece(p)&&mode!=='free')tone(190,.05,'sine',.025);draw();});

    function rotate(dir){if(!selected||selected.locked)return;selected.rot=(selected.rot+dir*45+360)%360;tone(dir>0?390:330,.045,'triangle',.03);draw();}
    $('#shapeRotateLeft').addEventListener('click',()=>rotate(-1));$('#shapeRotateRight').addEventListener('click',()=>rotate(1));
    $('#shapeNext').addEventListener('click',()=>{if(mode==='build')challenge=(challenge+1)%puzzles.length;setupMode();tone(330,.06,'sine',.03);});

    const patternSets=[
      {seq:['circle','square','circle','square','?'],answer:'circle'},
      {seq:['triangle','triangle','diamond','triangle','triangle','diamond','?'],answer:'triangle'},
      {seq:['circle','square','triangle','circle','square','?'],answer:'triangle'},
      {seq:['diamond','square','square','diamond','square','square','?'],answer:'diamond'},
      {seq:['triangle','square','diamond','circle','triangle','square','?'],answer:'diamond'},
      {seq:['circle','circle','square','circle','circle','square','?'],answer:'circle'}
    ];
    const symbol={circle:'●',square:'■',triangle:'▲',diamond:'◆'};
    const color={circle:'#E97863',square:'#76A9D7',triangle:'#79B9A6',diamond:'#9D8DC5'};
    function renderPattern(){
      const p=patternSets[patternRound%patternSets.length];nameEl.textContent='Pattern Logic';iconEl.textContent='🧠';progressEl.textContent=`${patternScore} solved`;
      msg.textContent='What comes next? Look for the repeating rule.';
      c.classList.add('hidden');tools.classList.add('hidden');patternPanel.classList.remove('hidden');
      const opts=['circle','square','triangle','diamond'];
      patternPanel.innerHTML=`<div class="pattern-sequence">${p.seq.map(t=>`<div class="pattern-token ${t==='?'?'mystery':''}" style="--pc:${t==='?'?'#DDD2C2':color[t]}">${t==='?'?'?':symbol[t]}</div>`).join('')}</div><div class="pattern-question">What comes next?</div><div class="pattern-choices">${opts.map(t=>`<button class="pattern-choice" data-pattern-choice="${t}" style="--pc:${color[t]}" aria-label="${t}">${symbol[t]}</button>`).join('')}</div>`;
      $$('.pattern-choice',patternPanel).forEach(b=>b.addEventListener('click',()=>{
        if(b.dataset.patternChoice===p.answer){patternScore++;patternRound=(patternRound+1)%patternSets.length;successChime();msg.textContent='You found the rule!';setTimeout(()=>{if(running&&mode==='pattern')renderPattern();},550);}
        else{tone(185,.08,'sine',.035);b.classList.add('try-again');setTimeout(()=>b.classList.remove('try-again'),300);msg.textContent='Not that one. Look at how the shapes repeat.';}
      }));
    }

    $$('.shape-mode').forEach(btn=>btn.addEventListener('click',()=>{
      mode=btn.dataset.shapeMode;$$('.shape-mode').forEach(b=>b.classList.toggle('active',b===btn));
      if(mode==='pattern'){renderPattern();}else{setupMode();}
      tone(300,.06,'sine',.03);
    }));

    resize();setupMode();
    return()=>{running=false;ro.disconnect();};
  }

  function makeCreature(){
    gameMount.innerHTML=`<div class="creature-stage"><div id="creatureCanvas" class="creature-canvas"><div class="creature-body"></div></div><div class="part-tray" id="partTray"></div></div>`;
    const parts=['👀','👁️','👃','👄','😁','🦷','👂','🦄','🎀','👒','⭐','🌼','🕶️']; const tray=$('#partTray'), canvas=$('#creatureCanvas');
    parts.forEach((p,i)=>{const b=document.createElement('button');b.className='part-chip';b.textContent=p;b.setAttribute('aria-label','Creature part');b.addEventListener('click',()=>addPart(p));tray.appendChild(b)});
    function addPart(p){const el=document.createElement('div');el.className='creature-part';el.textContent=p;el.style.left=`${35+Math.random()*30}%`;el.style.top=`${28+Math.random()*38}%`;canvas.appendChild(el);makeDraggable(el);tone(320+Math.random()*300,.1)}
    function makeDraggable(el){let dx=0,dy=0,drag=false;el.addEventListener('pointerdown',e=>{drag=true;const r=el.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;el.setPointerCapture(e.pointerId)});el.addEventListener('pointermove',e=>{if(!drag)return;const r=canvas.getBoundingClientRect();el.style.left=`${Math.max(0,Math.min(r.width-55,e.clientX-r.left-dx))}px`;el.style.top=`${Math.max(0,Math.min(r.height-55,e.clientY-r.top-dy))}px`});el.addEventListener('pointerup',()=>drag=false)}
    addPart('👀'); addPart('👄');
  }

  function makeMarbles(){
    gameMount.innerHTML=`<div class="marble-wrap"><canvas id="marbleCanvas" class="marble-canvas"></canvas><div class="game-controls"><button id="addMarble" class="pill-btn">Drop marble</button><button id="clearMarbles" class="pill-btn">Clear</button></div></div>`;
    const c=$('#marbleCanvas'),ctx=c.getContext('2d'); let running=true,balls=[],last=performance.now();
    const palette=['#E97863','#76A9D7','#79B9A6','#F2C45F','#9D8DC5','#D991A7'];
    function resize(){const r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.width=r.width*dpr;c.height=r.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)} resize();
    const ro=new ResizeObserver(resize);ro.observe(c);
    function add(x=null,y=null){const r=c.getBoundingClientRect();balls.push({x:x??r.width*(.25+Math.random()*.5),y:y??25,vx:(Math.random()-.5)*120,vy:0,r:14+Math.random()*10,color:palette[Math.floor(Math.random()*palette.length)]});tone(220+Math.random()*250,.08,'sine',.04)}
    function step(now){if(!running)return;const dt=Math.min(.03,(now-last)/1000);last=now;const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(0,h*.68,w,8);ctx.fillRect(w*.08,h*.45,w*.34,8);ctx.fillRect(w*.58,h*.28,w*.32,8);
      for(const b of balls){b.vy+=620*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;const floors=[{x:0,y:h*.68,w},{x:w*.08,y:h*.45,w:w*.34},{x:w*.58,y:h*.28,w:w*.32}];for(const f of floors){if(b.x+b.r>f.x&&b.x-b.r<f.x+f.w&&b.y+b.r>f.y&&b.y-b.r<f.y&&b.vy>0){b.y=f.y-b.r;b.vy*=-.68;b.vx*=.985}}if(b.x-b.r<0){b.x=b.r;b.vx=Math.abs(b.vx)*.8}if(b.x+b.r>w){b.x=w-b.r;b.vx=-Math.abs(b.vx)*.8}if(b.y-b.r>h+40){b.y=10;b.vy=0}ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle=b.color;ctx.fill();ctx.beginPath();ctx.arc(b.x-b.r*.28,b.y-b.r*.30,b.r*.25,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.55)';ctx.fill()}requestAnimationFrame(step)}
    c.addEventListener('pointerdown',e=>{const r=c.getBoundingClientRect();add(e.clientX-r.left,e.clientY-r.top)});$('#addMarble').addEventListener('click',()=>add());$('#clearMarbles').addEventListener('click',()=>balls=[]);for(let i=0;i<3;i++)add();requestAnimationFrame(step);
    return()=>{running=false;ro.disconnect()};
  }

  function makeBasketball(){
    gameMount.innerHTML=`
      <div class="basketball-wrap">
        <div class="basketball-scorebar" aria-live="polite">
          <div class="basketball-stat"><span>🏀</span><strong id="bbScore">0</strong><small>MADE</small></div>
          <div class="basketball-stat"><span>🔥</span><strong id="bbStreak">0</strong><small>STREAK</small></div>
          <div class="basketball-stat"><span>⭐</span><strong id="bbBest">0</strong><small>BEST</small></div>
        </div>
        <canvas id="basketballCanvas" class="basketball-canvas" aria-label="Basketball shooting game"></canvas>
        <div class="basketball-modes" role="group" aria-label="Basketball modes">
          <button class="pill-btn bb-mode active" data-bb-mode="free">🏀 Free</button>
          <button class="pill-btn bb-mode" data-bb-mode="around">📍 Around</button>
          <button class="pill-btn bb-mode" data-bb-mode="moving">↔️ Moving</button>
          <button class="pill-btn bb-mode" data-bb-mode="bank">▣ Bank</button>
        </div>
        <div id="bbMessage" class="basketball-message">Flick the ball toward the hoop.</div>
      </div>`;

    const c=$('#basketballCanvas'),ctx=c.getContext('2d');
    let running=true,last=performance.now(),mode='free',score=0,streak=0;
    let best=Number(localStorage.getItem('jakjak.basketball.best')||0);
    let aiming=false,startPointer=null,currentPointer=null,shotActive=false,shotAge=0,resetDelay=0;
    let previousBallY=0,hitBackboard=false,scoredThisShot=false,missCounted=false;
    let aroundIndex=0,movingPhase=0;
    const aroundSpots=[0.28,0.16,0.39,0.10,0.47];
    const ball={x:0,y:0,vx:0,vy:0,r:18};
    const hoop={x:0,y:0,rimHalf:34,backboardX:0,backboardTop:0,backboardBottom:0};
    const scoreEl=$('#bbScore'),streakEl=$('#bbStreak'),bestEl=$('#bbBest'),messageEl=$('#bbMessage');
    bestEl.textContent=best;

    function dimensions(){return {w:c.clientWidth,h:c.clientHeight};}
    function setHoop(){
      const {w,h}=dimensions();
      const baseX=w*.76;
      hoop.x=mode==='moving' ? w*(.70 + Math.sin(movingPhase)*.10) : baseX;
      hoop.y=Math.max(110,h*.28);
      hoop.backboardX=hoop.x+48;
      hoop.backboardTop=hoop.y-78;
      hoop.backboardBottom=hoop.y+8;
    }
    function startX(){
      const {w}=dimensions();
      if(mode==='around') return w*aroundSpots[aroundIndex];
      if(mode==='bank') return w*.22;
      if(mode==='moving') return w*.18;
      return w*.24;
    }
    function resetBall(immediate=true){
      const {h}=dimensions();
      ball.x=startX();ball.y=h-48;ball.vx=0;ball.vy=0;
      previousBallY=ball.y;shotActive=false;shotAge=0;resetDelay=immediate?0:.35;
      aiming=false;startPointer=null;currentPointer=null;hitBackboard=false;scoredThisShot=false;missCounted=false;
    }
    function resize(){
      const r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
      c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      setHoop(); if(!shotActive) resetBall();
    }
    resize(); const ro=new ResizeObserver(resize);ro.observe(c);

    function updateHud(){scoreEl.textContent=score;streakEl.textContent=streak;bestEl.textContent=best;}
    function setMessage(text){messageEl.textContent=text;}
    function recordMake(){
      if(scoredThisShot)return;
      scoredThisShot=true;score++;streak++;
      if(streak>best){best=streak;localStorage.setItem('jakjak.basketball.best',String(best));}
      if(mode==='around'){
        aroundIndex=(aroundIndex+1)%aroundSpots.length;
        setMessage(aroundIndex===0?'You went all the way around!':'Nice. Next spot!');
      }else if(mode==='bank') setMessage(hitBackboard?'Bank shot!':'Try using the backboard.');
      else if(streak>=5) setMessage(`${streak} in a row!`);
      else setMessage('Swish!');
      successChime(); updateHud(); resetDelay=.65;
    }
    function recordMiss(){
      if(missCounted||scoredThisShot)return;
      missCounted=true;streak=0;updateHud();
      if(mode==='bank')setMessage('Try hitting the square on the backboard.');
      else if(mode==='around')setMessage('Same spot. Adjust and try again.');
      else setMessage('Close. Change the angle or power.');
    }
    function switchMode(next){
      mode=next;aroundIndex=0;movingPhase=0;streak=0;score=0;updateHud();
      $$('.bb-mode').forEach(b=>b.classList.toggle('active',b.dataset.bbMode===mode));
      const messages={free:'Flick the ball toward the hoop.',around:'Make it, then move to the next spot.',moving:'The hoop moves. Lead your shot.',bank:'Use the backboard before the ball goes in.'};
      setMessage(messages[mode]);setHoop();resetBall();tone(330,.08);
    }
    $$('.bb-mode').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.bbMode)));

    function launch(dx,dy){
      const len=Math.hypot(dx,dy); if(len<26)return;
      // Direct flick physics: quick/long upward motion = more power. Horizontal aim matters.
      const scale=Math.min(7.2,Math.max(4.8,920/Math.max(120,len)));
      ball.vx=dx*scale;
      ball.vy=dy*scale;
      // Keep obviously downward releases playable, but do not auto-aim the shot.
      if(ball.vy>-180)ball.vy=-180-Math.min(240,len*1.25);
      const speed=Math.hypot(ball.vx,ball.vy),max=1150;
      if(speed>max){ball.vx*=max/speed;ball.vy*=max/speed;}
      shotActive=true;shotAge=0;previousBallY=ball.y;hitBackboard=false;scoredThisShot=false;missCounted=false;
      tone(150,.06,'triangle',.06);
    }
    function point(e){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    c.addEventListener('pointerdown',e=>{
      if(shotActive||resetDelay>0)return;
      const p=point(e),dist=Math.hypot(p.x-ball.x,p.y-ball.y);
      if(dist>Math.max(68,ball.r*3.4))return;
      aiming=true;startPointer=p;currentPointer=p;c.setPointerCapture(e.pointerId);e.preventDefault();
    });
    c.addEventListener('pointermove',e=>{if(!aiming)return;currentPointer=point(e);e.preventDefault();});
    c.addEventListener('pointerup',e=>{
      if(!aiming)return;currentPointer=point(e);aiming=false;
      launch(currentPointer.x-startPointer.x,currentPointer.y-startPointer.y);e.preventDefault();
    });
    c.addEventListener('pointercancel',()=>{aiming=false;});

    function collideCircle(cx,cy,cr){
      const dx=ball.x-cx,dy=ball.y-cy,d=Math.hypot(dx,dy),min=ball.r+cr;
      if(d<=0||d>=min)return;
      const nx=dx/d,ny=dy/d,overlap=min-d;ball.x+=nx*overlap;ball.y+=ny*overlap;
      const dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.7*dot*nx;ball.vy-=1.7*dot*ny;ball.vx*=.94;ball.vy*=.94;}
      tone(115,.035,'sine',.025);
    }
    function collideBackboard(){
      const bx=hoop.backboardX,top=hoop.backboardTop,bottom=hoop.backboardBottom;
      if(ball.y+ball.r<top||ball.y-ball.r>bottom)return;
      if(previousBallY===undefined)return;
      if(ball.x+ball.r>=bx && ball.x-ball.r<=bx+9 && ball.vx>0){
        ball.x=bx-ball.r;ball.vx=-Math.abs(ball.vx)*.72;hitBackboard=true;tone(125,.05,'square',.035);
      }
    }
    function drawCourt(){
      const {w,h}=dimensions();
      const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#DCECF4');sky.addColorStop(.68,'#F4E3C8');sky.addColorStop(.69,'#D7A76E');sky.addColorStop(1,'#C58E55');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
      // court lines
      ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w*.72,h*.78,w*.28,Math.PI,Math.PI*1.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,h*.88);ctx.lineTo(w,h*.88);ctx.stroke();
      // backboard
      ctx.fillStyle='rgba(255,255,255,.88)';ctx.fillRect(hoop.backboardX,hoop.backboardTop,9,hoop.backboardBottom-hoop.backboardTop);
      ctx.strokeStyle='#D85B45';ctx.lineWidth=4;ctx.strokeRect(hoop.backboardX-30,hoop.y-45,30,28);
      // rim
      ctx.strokeStyle='#D85B45';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(hoop.x-hoop.rimHalf,hoop.y);ctx.lineTo(hoop.x+hoop.rimHalf,hoop.y);ctx.stroke();
      // net
      ctx.strokeStyle='rgba(255,255,255,.82)';ctx.lineWidth=2;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(hoop.x+i*9,hoop.y+4);ctx.lineTo(hoop.x+i*5,hoop.y+46);ctx.stroke();}for(let j=1;j<=3;j++){ctx.beginPath();ctx.ellipse(hoop.x,hoop.y+j*11,hoop.rimHalf-j*6,5,0,0,Math.PI*2);ctx.stroke();}
      // around-the-court markers
      if(mode==='around'){aroundSpots.forEach((f,i)=>{ctx.beginPath();ctx.arc(w*f,h-27,10,0,Math.PI*2);ctx.fillStyle=i===aroundIndex?'#E97863':'rgba(255,255,255,.55)';ctx.fill();});}
    }
    function drawBall(){
      ctx.save();ctx.translate(ball.x,ball.y);ctx.fillStyle='#E8893E';ctx.strokeStyle='#6D3A20';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,ball.r,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,ball.r*.98,-.9,.9);ctx.stroke();ctx.beginPath();ctx.arc(0,0,ball.r*.98,Math.PI-.9,Math.PI+.9);ctx.stroke();ctx.beginPath();ctx.moveTo(-ball.r,0);ctx.lineTo(ball.r,0);ctx.stroke();ctx.beginPath();ctx.moveTo(0,-ball.r);ctx.lineTo(0,ball.r);ctx.stroke();ctx.restore();
    }
    function drawAim(){
      if(!aiming||!startPointer||!currentPointer)return;
      const dx=currentPointer.x-startPointer.x,dy=currentPointer.y-startPointer.y;
      let vx=dx*5.7,vy=dy*5.7;if(vy>-180)vy=-180-Math.min(240,Math.hypot(dx,dy)*1.25);
      ctx.fillStyle='rgba(66,82,94,.38)';
      for(let i=1;i<=8;i++){const t=i*.10,x=ball.x+vx*t,y=ball.y+vy*t+450*t*t;ctx.beginPath();ctx.arc(x,y,Math.max(2,5-i*.35),0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(66,82,94,.35)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(startPointer.x,startPointer.y);ctx.lineTo(currentPointer.x,currentPointer.y);ctx.stroke();
    }
    function step(now){
      if(!running)return;
      const dt=Math.min(.025,(now-last)/1000);last=now;
      if(mode==='moving'){movingPhase+=dt*(.75+Math.min(1.2,score*.035));setHoop();}
      if(resetDelay>0){resetDelay-=dt;if(resetDelay<=0)resetBall();}
      if(shotActive){
        shotAge+=dt;previousBallY=ball.y;ball.vy+=900*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
        collideCircle(hoop.x-hoop.rimHalf,hoop.y,6);collideCircle(hoop.x+hoop.rimHalf,hoop.y,6);collideBackboard();
        const crossed=previousBallY<hoop.y && ball.y>=hoop.y && ball.vy>0;
        const inside=Math.abs(ball.x-hoop.x)<hoop.rimHalf-ball.r*.40;
        if(crossed&&inside){if(mode!=='bank'||hitBackboard)recordMake();else{scoredThisShot=true;setMessage('That went in — now try a bank shot!');tone(420,.12);resetDelay=.65;}}
        const {w,h}=dimensions();
        if(ball.y+ball.r>h-10){ball.y=h-10-ball.r;if(Math.abs(ball.vy)>90){ball.vy=-Math.abs(ball.vy)*.52;ball.vx*=.76}else{ball.vy=0;ball.vx*=.9;}if(shotAge>.7&&!scoredThisShot)recordMiss();}
        if(ball.x<-80||ball.x>w+100||ball.y>h+120||shotAge>6){if(!scoredThisShot)recordMiss();resetDelay=.45;}
      }
      drawCourt();drawAim();drawBall();requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return()=>{running=false;ro.disconnect();};
  }

  function makeBowling(){
    const BALLS=[
      ['Ocean','#2D78C4'],['Red','#D94B45'],['Lime','#73B94B'],['Purple','#7B5BC7'],['Orange','#E58B46'],
      ['Pink','#D9689A'],['Gold','#D6A62E'],['Teal','#2F9A91'],['Black','#34383D'],['White','#F3F0E9']
    ];
    let savedColor=localStorage.getItem('jakjak.bowling.ball')||BALLS[0][1];
    if(!BALLS.some(([,c])=>c===savedColor)) savedColor=BALLS[0][1];
    gameMount.innerHTML=`
      <div class="bowling-wrap">
        <div class="bowling-scorebar" aria-live="polite">
          <div class="bowling-stat"><span>🎳</span><strong id="bowlPins">10</strong><small>PINS</small></div>
          <div class="bowling-stat"><span>⚡</span><strong id="bowlStrikes">0</strong><small>STRIKES</small></div>
          <div class="bowling-stat"><span>⭐</span><strong id="bowlBest">${Number(localStorage.getItem('jakjak.bowling.best')||0)}</strong><small>BEST STREAK</small></div>
        </div>
        <div class="bowling-color-panel" aria-label="Choose bowling ball color">
          <span class="bowling-color-label">Ball</span>
          <div class="bowling-colors">
            ${BALLS.map(([name,color])=>`<button class="bowl-color ${color===savedColor?'active':''}" data-bowl-color="${color}" aria-label="${name} bowling ball" title="${name}" style="--ball-color:${color}"></button>`).join('')}
          </div>
        </div>
        <canvas id="bowlingCanvas" class="bowling-canvas" aria-label="Bowling lane game"></canvas>
        <div class="bowling-modes" role="group" aria-label="Bowling modes">
          <button class="pill-btn bowl-mode active" data-bowl-mode="rack">🎳 Rack Play</button>
          <button class="pill-btn bowl-mode" data-bowl-mode="strike">⚡ Strike Hunt</button>
          <button class="pill-btn bowl-mode" data-bowl-mode="spare">🎯 Spare Lab</button>
        </div>
        <div id="bowlMessage" class="bowling-message">Pick a ball, then swipe it up the lane.</div>
      </div>`;

    const c=$('#bowlingCanvas'),ctx=c.getContext('2d');
    const pinsEl=$('#bowlPins'),strikesEl=$('#bowlStrikes'),bestEl=$('#bowlBest'),messageEl=$('#bowlMessage');
    let running=true,last=performance.now(),mode='rack',ballColor=savedColor;
    let pins=[],aiming=false,startPointer=null,currentPointer=null,shotActive=false,shotAge=0,settle=0;
    let roll=1,strikes=0,strikeStreak=0,best=Number(localStorage.getItem('jakjak.bowling.best')||0),spares=0;
    let gutter=false,rollStartStanding=10,rackComplete=false;
    const ball={x:0,y:0,vx:0,vy:0,r:16,spin:0,rotation:0};

    function dims(){return{w:c.clientWidth,h:c.clientHeight};}
    function lane(){const {w,h}=dims();return{left:w*.13,right:w*.87,top:34,bottom:h-18,width:w*.74,height:h-52};}
    function rackPositions(){
      const {w,h}=dims(),cx=w*.5,baseY=Math.max(104,h*.205),dx=Math.min(27,w*.055),dy=Math.min(25,h*.045);
      const out=[];
      for(let row=0;row<4;row++) for(let col=0;col<=row;col++) out.push({x:cx+(col-row/2)*dx,y:baseY+row*dy});
      return out;
    }
    function freshRack(pattern=null){
      const pos=rackPositions();
      pins=pos.map((p,i)=>({id:i,x:p.x,y:p.y,homeX:p.x,homeY:p.y,vx:0,vy:0,r:10.5,down:false,angle:0,spin:0,visible:pattern?pattern.includes(i):true}));
      roll=1;rackComplete=false;updateHud();resetBall();
    }
    function spareRack(){
      const ids=[0,1,2,3,4,5,6,7,8,9];
      const keep=2+Math.floor(Math.random()*4); // 2-5 pins
      ids.sort(()=>Math.random()-.5);
      freshRack(ids.slice(0,keep));
      setMessage(`Spare Lab: clear ${keep} pin${keep===1?'':'s'} in one roll.`);
    }
    function resetBall(){
      const {w,h}=dims();ball.x=w*.5;ball.y=h-55;ball.vx=ball.vy=ball.spin=ball.rotation=0;
      aiming=false;startPointer=currentPointer=null;shotActive=false;shotAge=0;settle=0;gutter=false;
      rollStartStanding=standingCount(); updateHud();
    }
    function standingCount(){return pins.filter(p=>p.visible&&!p.down).length;}
    function updateHud(){pinsEl.textContent=standingCount();strikesEl.textContent=strikes;bestEl.textContent=best;}
    function setMessage(t){messageEl.textContent=t;}
    function resize(){
      const r=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      if(!shotActive){
        const visibleIds=pins.filter(p=>p.visible).map(p=>p.id);
        const downIds=new Set(pins.filter(p=>p.down).map(p=>p.id));
        const pos=rackPositions();
        if(pins.length) pins.forEach(p=>{p.homeX=pos[p.id].x;p.homeY=pos[p.id].y;if(!p.down){p.x=p.homeX;p.y=p.homeY;}});
        else freshRack();
        resetBall();
      }
    }
    resize();const ro=new ResizeObserver(resize);ro.observe(c);

    $$('.bowl-color').forEach(btn=>btn.addEventListener('click',()=>{
      ballColor=btn.dataset.bowlColor;localStorage.setItem('jakjak.bowling.ball',ballColor);
      $$('.bowl-color').forEach(b=>b.classList.toggle('active',b===btn));tone(380,.07,'sine',.04);
    }));
    $$('.bowl-mode').forEach(btn=>btn.addEventListener('click',()=>switchMode(btn.dataset.bowlMode)));

    function switchMode(next){
      mode=next;strikes=0;strikeStreak=0;spares=0;
      $$('.bowl-mode').forEach(b=>b.classList.toggle('active',b.dataset.bowlMode===mode));
      if(mode==='spare')spareRack();else freshRack();
      const msg={rack:'Two rolls to clear each rack. Strikes reset it immediately.',strike:'Fresh rack every roll. Build the longest strike streak you can.',spare:'Random leaves. Clear every standing pin in one roll.'};
      setMessage(msg[mode]);updateHud();tone(330,.08);
    }

    function pointer(e){const r=c.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    c.addEventListener('pointerdown',e=>{
      if(shotActive||settle>0)return;const p=pointer(e);if(Math.hypot(p.x-ball.x,p.y-ball.y)>70)return;
      aiming=true;startPointer=p;currentPointer=p;c.setPointerCapture(e.pointerId);e.preventDefault();
    });
    c.addEventListener('pointermove',e=>{if(!aiming)return;currentPointer=pointer(e);e.preventDefault();});
    c.addEventListener('pointerup',e=>{
      if(!aiming)return;currentPointer=pointer(e);aiming=false;
      const dx=currentPointer.x-startPointer.x,dy=currentPointer.y-startPointer.y,len=Math.hypot(dx,dy);
      if(len<28||dy>-10){setMessage('Swipe the ball up the lane.');return;}
      const power=Math.min(1.15,Math.max(.55,len/175));
      ball.vx=dx*2.15;ball.vy=-680*power;ball.spin=dx*2.8;shotActive=true;shotAge=0;rollStartStanding=standingCount();
      tone(125,.06,'triangle',.05);e.preventDefault();
    });
    c.addEventListener('pointercancel',()=>aiming=false);

    function knockPin(p,forceX,forceY,impact){
      p.vx+=forceX;p.vy+=forceY;p.spin+=(Math.random()-.5)*7;
      if(impact>92||Math.hypot(p.vx,p.vy)>82)p.down=true;
    }
    function ballPinCollision(p){
      if(!p.visible)return;const dx=p.x-ball.x,dy=p.y-ball.y,d=Math.hypot(dx,dy),min=p.r+ball.r;
      if(d<=0||d>=min)return;const nx=dx/d,ny=dy/d,over=min-d;p.x+=nx*over*.65;p.y+=ny*over*.65;ball.x-=nx*over*.35;ball.y-=ny*over*.35;
      const rel=ball.vx*nx+ball.vy*ny;if(rel>0){
        const impact=Math.abs(rel);knockPin(p,nx*impact*.72,ny*impact*.72,impact);
        ball.vx-=nx*impact*.16;ball.vy-=ny*impact*.16;tone(150+Math.min(120,impact*.12),.035,'square',.022);
      }
    }
    function pinPinCollisions(){
      for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++){
        const a=pins[i],b=pins[j];if(!a.visible||!b.visible)continue;
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;if(d<=0||d>=min)continue;
        const nx=dx/d,ny=dy/d,over=min-d;a.x-=nx*over*.5;a.y-=ny*over*.5;b.x+=nx*over*.5;b.y+=ny*over*.5;
        const rvx=b.vx-a.vx,rvy=b.vy-a.vy,rel=rvx*nx+rvy*ny;
        if(rel<0){const imp=-rel*.58;a.vx-=nx*imp;a.vy-=ny*imp;b.vx+=nx*imp;b.vy+=ny*imp;if(imp>38){a.down=true;b.down=true;}}
      }
    }
    function finishRoll(){
      if(!shotActive)return;shotActive=false;
      const nowStanding=standingCount(),knocked=Math.max(0,rollStartStanding-nowStanding);
      updateHud();
      if(gutter&&knocked===0)setMessage('Gutter ball. Try a straighter line or less hook.');
      if(mode==='strike'){
        if(knocked===10){strikes++;strikeStreak++;if(strikeStreak>best){best=strikeStreak;localStorage.setItem('jakjak.bowling.best',String(best));}setMessage(strikeStreak>1?`${strikeStreak} strikes in a row!`:'Strike!');successChime();}
        else{strikeStreak=0;setMessage(`${knocked} down. Adjust your line and try again.`);}
        updateHud();settle=.9;return;
      }
      if(mode==='spare'){
        if(nowStanding===0){spares++;setMessage(`Spare cleared! ${spares} solved.`);successChime();}
        else setMessage(`${nowStanding} left. New spare challenge coming up.`);
        settle=1.0;return;
      }
      // Rack Play: two-roll bowling rack.
      if(roll===1&&nowStanding===0){strikes++;strikeStreak++;rackComplete=true;if(strikeStreak>best){best=strikeStreak;localStorage.setItem('jakjak.bowling.best',String(best));}setMessage('Strike! Fresh rack.');successChime();updateHud();settle=.95;return;}
      if(roll===1){strikeStreak=0;roll=2;rackComplete=false;setMessage(`${knocked} down. Roll two: ${nowStanding} left.`);settle=.75;return;}
      if(nowStanding===0){setMessage('Spare! Nice adjustment.');successChime();}else setMessage(`Rack finished: ${10-nowStanding} down.`);
      strikeStreak=0;rackComplete=true;settle=.95;
    }
    function afterSettle(){
      if(mode==='strike'){freshRack();return;}
      if(mode==='spare'){spareRack();return;}
      if(mode==='rack'){
        if(rackComplete)freshRack();
        else resetBall();
      }
    }

    function drawLane(){
      const {w,h}=dims(),L=lane();ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#443E39';ctx.fillRect(0,0,w,h);
      // gutters
      ctx.fillStyle='#66615C';ctx.fillRect(L.left-22,L.top,22,L.bottom-L.top);ctx.fillRect(L.right,L.top,22,L.bottom-L.top);
      // lane wood
      const grd=ctx.createLinearGradient(0,L.top,0,L.bottom);grd.addColorStop(0,'#E8C98F');grd.addColorStop(1,'#D7A867');ctx.fillStyle=grd;ctx.fillRect(L.left,L.top,L.width,L.bottom-L.top);
      ctx.strokeStyle='rgba(121,78,39,.20)';ctx.lineWidth=1;for(let x=L.left+12;x<L.right;x+=18){ctx.beginPath();ctx.moveTo(x,L.top);ctx.lineTo(x,L.bottom);ctx.stroke();}
      // foul line and arrows
      ctx.strokeStyle='#7B4F34';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(L.left,h*.73);ctx.lineTo(L.right,h*.73);ctx.stroke();
      ctx.fillStyle='rgba(90,62,42,.55)';for(let i=-2;i<=2;i++){const x=w*.5+i*w*.075,y=h*.59;ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x-6,y+7);ctx.lineTo(x+6,y+7);ctx.closePath();ctx.fill();}
      // pocket dots
      ctx.fillStyle='rgba(255,255,255,.38)';ctx.beginPath();ctx.arc(w*.475,Math.max(100,h*.19),6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(w*.525,Math.max(100,h*.19),6,0,Math.PI*2);ctx.fill();
      if(gutter){ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='800 16px system-ui';ctx.textAlign='center';ctx.fillText('GUTTER',w*.5,h*.47);}
    }
    function drawPins(){
      for(const p of pins){if(!p.visible)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.down?p.angle:0);
        if(p.down){ctx.globalAlpha=.82;ctx.scale(1.35,.62);}
        ctx.fillStyle='#FBF8F0';ctx.strokeStyle='#C9C3B8';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,p.r*.82,p.r*1.2,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        ctx.strokeStyle='#D94B45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-p.r*.62,-p.r*.24);ctx.lineTo(p.r*.62,-p.r*.24);ctx.stroke();ctx.beginPath();ctx.moveTo(-p.r*.66,p.r*.05);ctx.lineTo(p.r*.66,p.r*.05);ctx.stroke();ctx.restore();
      }
    }
    function drawBall(){
      ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.rotation);ctx.fillStyle=ballColor;ctx.strokeStyle=ballColor==='#F3F0E9'?'#8A8D90':'rgba(0,0,0,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,ball.r,0,Math.PI*2);ctx.fill();ctx.stroke();
      const light=ctx.createRadialGradient(-6,-7,1,-6,-7,11);light.addColorStop(0,'rgba(255,255,255,.65)');light.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=light;ctx.beginPath();ctx.arc(0,0,ball.r-1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=ballColor==='#34383D'?'#D9DADD':'#31363A';[[-4,-5],[3,-7],[5,0]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();});ctx.restore();
    }
    function drawAim(){
      if(!aiming||!startPointer||!currentPointer)return;const dx=currentPointer.x-startPointer.x,dy=currentPointer.y-startPointer.y,len=Math.hypot(dx,dy);if(len<5)return;
      const power=Math.min(1.15,Math.max(.55,len/175)),vx=dx*2.15,vy=-680*power,spin=dx*2.8;
      ctx.fillStyle='rgba(47,61,69,.38)';let x=ball.x,y=ball.y,sx=vx,sy=vy;
      for(let i=1;i<=11;i++){const dt=.055;sx+=spin*dt*.34;x+=sx*dt;y+=sy*dt;ctx.beginPath();ctx.arc(x,y,Math.max(2,5-i*.25),0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(47,61,69,.30)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(startPointer.x,startPointer.y);ctx.lineTo(currentPointer.x,currentPointer.y);ctx.stroke();
    }

    function step(now){
      if(!running)return;const dt=Math.min(.024,(now-last)/1000);last=now;const {w,h}=dims(),L=lane();
      if(shotActive){
        shotAge+=dt;ball.vx+=ball.spin*dt*.34;ball.spin*=Math.pow(.993,dt*60);ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.rotation+=Math.hypot(ball.vx,ball.vy)*dt/ball.r;
        // lane friction
        ball.vx*=Math.pow(.996,dt*60);ball.vy*=Math.pow(.9992,dt*60);
        if(!gutter&&(ball.x-ball.r<L.left||ball.x+ball.r>L.right)){gutter=true;ball.vx*=.35;ball.spin*=.25;tone(95,.08,'sine',.04);}
        pins.forEach(ballPinCollision);pinPinCollisions();
        for(const p of pins){if(!p.visible)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;p.vx*=Math.pow(.965,dt*60);p.vy*=Math.pow(.965,dt*60);p.spin*=Math.pow(.96,dt*60);if(Math.hypot(p.vx,p.vy)>62)p.down=true;}
        const offTop=ball.y<-40,slow=shotAge>1.2&&Math.hypot(ball.vx,ball.vy)<75;
        if(offTop||slow||shotAge>4.7)finishRoll();
      }
      if(settle>0){
        settle-=dt;for(const p of pins){p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;p.vx*=Math.pow(.92,dt*60);p.vy*=Math.pow(.92,dt*60);p.spin*=Math.pow(.91,dt*60);}pinPinCollisions();
        if(settle<=0)afterSettle();
      }
      drawLane();drawPins();drawAim();drawBall();requestAnimationFrame(step);
    }
    if(!pins.length)freshRack();requestAnimationFrame(step);
    return()=>{running=false;ro.disconnect();};
  }

  function makeNumbers(){
    let mode='count',level=Math.min(9,Number(localStorage.getItem('jakjak.numbers.level')||0)),locked=false;
    gameMount.innerHTML=`<div class="number-lab">
      <div class="number-modebar" role="group" aria-label="Number Garden modes">
        <button class="pill-btn number-mode active" data-number-mode="count">🍎 Count</button>
        <button class="pill-btn number-mode" data-number-mode="compare">⚖️ Compare</button>
        <button class="pill-btn number-mode" data-number-mode="make">➕ Make</button>
        <button class="pill-btn number-mode" data-number-mode="sequence">🧠 Sequence</button>
      </div>
      <div class="number-lab-head"><strong id="numberPrompt">Build the number</strong><span id="numberLevel">LEVEL ${level+1}</span></div>
      <div id="numberPlay" class="number-play"></div>
      <div id="numberMessage" class="thinking-message">Tap apples to build the target number.</div>
    </div>`;
    const play=$('#numberPlay'),msg=$('#numberMessage');
    function win(text){if(locked)return;locked=true;successChime();msg.textContent=text;level=Math.min(9,level+1);localStorage.setItem('jakjak.numbers.level',String(level));$('#numberLevel').textContent=`LEVEL ${level+1}`;setTimeout(setup,950);}
    function setup(){
      locked=false;$('#numberLevel').textContent=`LEVEL ${level+1}`;
      if(mode==='count')setupCount();else if(mode==='compare')setupCompare();else if(mode==='make')setupMake();else setupSequence();
    }
    function setupCount(){
      const max=Math.min(12,5+Math.floor(level/2)*2),target=2+Math.floor(Math.random()*(max-1));let count=0;
      $('#numberPrompt').textContent=`Build ${target}`;msg.textContent='Tap apples to move them into the basket.';
      play.innerHTML=`<div class="number-count-layout"><div class="number-big">${target}</div><div class="number-basket" id="smartBasket"><span>Basket</span><div id="basketApples"></div></div><div class="number-apple-tray" id="smartAppleTray"></div><div class="number-readout" id="numberReadout">0 of ${target}</div></div>`;
      const tray=$('#smartAppleTray'),basket=$('#basketApples');
      for(let i=0;i<target+3;i++){const b=document.createElement('button');b.className='smart-apple';b.textContent='🍎';b.addEventListener('click',()=>{if(b.parentElement===tray){basket.appendChild(b);count++;}else{tray.appendChild(b);count--;}$('#numberReadout').textContent=`${count} of ${target}`;tone(280+count*28,.045,'sine',.025);if(count===target)win(`${target}. Exactly right.`);});tray.appendChild(b)}
    }
    function setupCompare(){
      let a=1+Math.floor(Math.random()*(5+level)),b=1+Math.floor(Math.random()*(5+level));if(level<5&&a===b)b=a===1?2:a-1;
      const askEqual=level>=5&&Math.random()<.25&&a===b;const askLess=!askEqual&&Math.random()<.45;const correct=askEqual?'equal':askLess?(a<b?'a':'b'):(a>b?'a':'b');
      $('#numberPrompt').textContent=askEqual?'Are they equal?':`Which side has ${askLess?'fewer':'more'}?`;msg.textContent='Look at the groups before choosing.';
      const apples=n=>Array.from({length:n},()=>'<span>🍎</span>').join('');
      play.innerHTML=`<div class="compare-layout"><button class="compare-card" data-side="a"><strong>${a}</strong><div>${apples(a)}</div></button><div class="compare-symbol">?</div><button class="compare-card" data-side="b"><strong>${b}</strong><div>${apples(b)}</div></button></div>${askEqual?'<button class="pill-btn equal-choice" data-side="equal">They are equal</button>':''}`;
      $$('[data-side]',play).forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.side===correct)win('You compared them correctly.');else{tone(160,.07,'sine',.03);msg.textContent='Look again. Count each group if you need to.';}}));
    }
    function setupMake(){
      const target=4+Math.floor(Math.random()*(Math.min(14,7+level)-3));let picks=[];
      $('#numberPrompt').textContent=`Make ${target}`;msg.textContent='Choose two numbers that add up to the target.';
      play.innerHTML=`<div class="make-number"><div class="number-big small">${target}</div><div class="number-equation-live"><span id="makeA">?</span><b>+</b><span id="makeB">?</span><b>=</b><strong id="makeSum">?</strong></div><div class="number-choice-grid">${Array.from({length:Math.min(10,target+1)},(_,i)=>`<button class="number-choice" data-n="${i}">${i}</button>`).join('')}</div><button class="pill-btn" id="makeClear">Clear</button></div>`;
      function render(){const sum=picks.length===2?picks[0]+picks[1]:null;$('#makeA').textContent=picks[0]??'?';$('#makeB').textContent=picks[1]??'?';$('#makeSum').textContent=sum??'?';if(sum===target)win(`${picks[0]} plus ${picks[1]} makes ${target}.`);else if(sum!==null){tone(180,.05,'sine',.025);msg.textContent=sum<target?'That sum is too small. Try another pair.':'That sum is too big. Try another pair.';}}
      $$('.number-choice',play).forEach(b=>b.addEventListener('click',()=>{if(picks.length===2)picks=[];picks.push(+b.dataset.n);tone(300+picks.length*60,.045,'triangle',.025);render();}));$('#makeClear').addEventListener('click',()=>{picks=[];render();});
    }
    function setupSequence(){
      const step=level<3?1:level<6?(Math.random()<.5?2:3):(Math.random()<.5?2:4),descending=level>=7&&Math.random()<.35,start=descending?8+Math.floor(Math.random()*8):1+Math.floor(Math.random()*4),seq=[];for(let i=0;i<4;i++)seq.push(start+(descending?-step:step)*i);const answer=start+(descending?-step:step)*4;
      const choices=[answer,answer+(descending?-1:1)*step,Math.max(0,answer+(descending?1:-1)*step)].sort(()=>Math.random()-.5);
      $('#numberPrompt').textContent='What comes next?';msg.textContent='Find the rule in the number pattern.';
      play.innerHTML=`<div class="sequence-lab"><div class="number-sequence">${seq.map(n=>`<span>${n}</span>`).join('<b>→</b>')}<b>→</b><span class="mystery">?</span></div><div class="sequence-choices">${choices.map(n=>`<button data-answer="${n}">${n}</button>`).join('')}</div></div>`;
      $$('[data-answer]',play).forEach(b=>b.addEventListener('click',()=>{if(+b.dataset.answer===answer)win('You found the pattern.');else{tone(160,.07,'sine',.03);msg.textContent='Not yet. Look at how much each number changes.';}}));
    }
    $$('.number-mode').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.numberMode;$$('.number-mode').forEach(b=>b.classList.toggle('active',b===btn));setup();}));
    setup();
  }

  function makeLogicTracks(){
    const levels=[
      {n:4,start:[3,0],goal:[0,3],rocks:[[2,1],[1,1]],max:8},
      {n:4,start:[3,3],goal:[0,0],rocks:[[2,2],[1,2]],max:8},
      {n:5,start:[4,0],goal:[0,4],rocks:[[3,1],[2,1],[2,3],[1,3]],max:12},
      {n:5,start:[4,4],goal:[0,0],rocks:[[3,3],[3,2],[1,2],[1,1]],max:12},
      {n:5,start:[4,0],goal:[0,4],rocks:[[4,2],[3,2],[2,2],[1,1],[1,3]],max:14}
    ];
    let level=Math.min(levels.length-1,Number(localStorage.getItem('jakjak.logic.level')||0));
    let commands=[],running=false,robot=[0,0],stepTimer=null;
    gameMount.innerHTML=`<div class="logic-lab">
      <div class="logic-head"><div><strong id="logicLevel">Challenge ${level+1}</strong><small> PLAN THE ROUTE</small></div><div id="logicCount">0 commands</div></div>
      <div id="logicGrid" class="logic-grid" aria-label="Logic path grid"></div>
      <div class="logic-program" id="logicProgram"><span class="logic-placeholder">Build a program</span></div>
      <div class="logic-controls" aria-label="Programming controls">
        <button class="logic-arrow" data-cmd="up">↑</button><button class="logic-arrow" data-cmd="right">→</button><button class="logic-arrow" data-cmd="down">↓</button><button class="logic-arrow" data-cmd="left">←</button>
      </div>
      <div class="logic-actions"><button class="pill-btn" id="logicUndo">Undo</button><button class="pill-btn primaryish" id="logicRun">▶ Run</button><button class="pill-btn" id="logicClear">Clear</button></div>
      <div id="logicMessage" class="thinking-message">Get the robot to the star without hitting a rock.</div>
    </div>`;
    const grid=$('#logicGrid'),program=$('#logicProgram'),msg=$('#logicMessage');
    const arrows={up:'↑',right:'→',down:'↓',left:'←'};
    function setup(){
      clearTimeout(stepTimer);running=false;commands=[];const L=levels[level];robot=[...L.start];
      grid.style.setProperty('--logic-n',L.n);renderGrid();renderProgram();$('#logicLevel').textContent=`Challenge ${level+1}`;msg.textContent='Get the robot to the star without hitting a rock.';
    }
    function key(r,c){return `${r},${c}`}
    function renderGrid(){
      const L=levels[level],rocks=new Set(L.rocks.map(x=>key(...x)));
      let html='';
      for(let r=0;r<L.n;r++)for(let c=0;c<L.n;c++){
        const isRobot=r===robot[0]&&c===robot[1],isGoal=r===L.goal[0]&&c===L.goal[1],isRock=rocks.has(key(r,c));
        html+=`<div class="logic-cell ${isGoal?'goal':''} ${isRock?'rock':''}">${isGoal?'⭐':''}${isRock?'🪨':''}${isRobot?'<span class="logic-robot">🤖</span>':''}</div>`;
      }
      grid.innerHTML=html;
    }
    function renderProgram(){
      $('#logicCount').textContent=`${commands.length} command${commands.length===1?'':'s'}`;
      program.innerHTML=commands.length?commands.map((c,i)=>`<span class="logic-chip" data-i="${i}">${arrows[c]}</span>`).join(''):'<span class="logic-placeholder">Build a program</span>';
    }
    $$('.logic-arrow').forEach(b=>b.addEventListener('click',()=>{
      if(running)return;const L=levels[level];if(commands.length>=L.max){tone(150,.08);msg.textContent='That program is full. Try running it or remove a step.';return;}commands.push(b.dataset.cmd);renderProgram();tone(320+commands.length*12,.04,'sine',.03);
    }));
    $('#logicUndo').addEventListener('click',()=>{if(running)return;commands.pop();renderProgram();});
    $('#logicClear').addEventListener('click',()=>{if(running)return;commands=[];renderProgram();});
    $('#logicRun').addEventListener('click',()=>{
      if(running||!commands.length)return;running=true;robot=[...levels[level].start];renderGrid();let i=0;msg.textContent='Running your program…';
      const tick=()=>{
        if(i>=commands.length){running=false;msg.textContent='Program finished. Adjust it and try again.';return;}
        const dir=commands[i++],d={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]}[dir],nr=robot[0]+d[0],nc=robot[1]+d[1],L=levels[level],blocked=nr<0||nc<0||nr>=L.n||nc>=L.n||L.rocks.some(([r,c])=>r===nr&&c===nc);
        if(blocked){running=false;tone(140,.13,'sine',.04);msg.textContent='Blocked. Change the plan and try again.';return;}
        robot=[nr,nc];renderGrid();tone(260+i*18,.045,'sine',.025);
        if(robot[0]===L.goal[0]&&robot[1]===L.goal[1]){running=false;successChime();msg.textContent='You solved it! A harder track is ready.';level=Math.min(levels.length-1,level+1);localStorage.setItem('jakjak.logic.level',String(level));setTimeout(setup,1100);return;}
        stepTimer=setTimeout(tick,380);
      };tick();
    });
    setup();
    return()=>clearTimeout(stepTimer);
  }

  function makeBalanceLab(){
    let level=Math.min(8,Number(localStorage.getItem('jakjak.balance.level')||0)),target=0,total=0,weights=[],solved=false;
    gameMount.innerHTML=`<div class="balance-lab">
      <div class="balance-head"><strong id="balanceChallenge">Make both sides equal</strong><span id="balanceLevel">Level ${level+1}</span></div>
      <div class="balance-scale">
        <div class="balance-post"></div><div class="balance-beam" id="balanceBeam"><div class="balance-pan left"><div id="balanceLeft" class="balance-stack"></div></div><div class="balance-pan right"><div id="balanceRight" class="balance-stack"></div></div></div>
      </div>
      <div class="balance-equation"><span id="balanceTarget">?</span><span>=</span><span id="balanceTotal">0</span></div>
      <div class="balance-pieces">${[1,2,3,5].map(n=>`<button class="weight-btn" data-weight="${n}"><span>${n}</span><small>weight</small></button>`).join('')}</div>
      <div class="logic-actions"><button class="pill-btn" id="balanceUndo">Undo</button><button class="pill-btn" id="balanceNew">New puzzle</button></div>
      <div id="balanceMessage" class="thinking-message">Try different combinations. There can be more than one solution.</div>
    </div>`;
    const beam=$('#balanceBeam'),left=$('#balanceLeft'),right=$('#balanceRight'),msg=$('#balanceMessage');
    function makeChallenge(){
      weights=[];total=0;solved=false;const max=6+level*2;target=3+Math.floor(Math.random()*Math.max(2,max-2));
      $('#balanceTarget').textContent=target;$('#balanceTotal').textContent=0;$('#balanceLevel').textContent=`Level ${level+1}`;left.innerHTML=renderBlocks(target,'fixed');right.innerHTML='';beam.style.transform='rotate(-7deg)';msg.textContent='Try different combinations. There can be more than one solution.';
    }
    function renderBlocks(n,cls=''){let remain=n,out='';for(const v of [5,3,2,1])while(remain>=v){out+=`<span class="balance-block ${cls} b${v}">${v}</span>`;remain-=v;}return out;}
    function update(){
      if(solved)return;total=weights.reduce((a,b)=>a+b,0);$('#balanceTotal').textContent=total;right.innerHTML=weights.map(v=>`<span class="balance-block b${v}">${v}</span>`).join('');
      const diff=Math.max(-1,Math.min(1,(total-target)/Math.max(target,1)));beam.style.transform=`rotate(${diff*9}deg)`;
      if(total===target){solved=true;successChime();msg.textContent='Balanced! You found a combination.';level=Math.min(8,level+1);localStorage.setItem('jakjak.balance.level',String(level));setTimeout(makeChallenge,1100);}else if(total>target){tone(170,.06,'sine',.025);msg.textContent='That side is heavier. Remove or change a weight.';}else msg.textContent=`The right side needs ${target-total} more.`;
    }
    $$('.weight-btn').forEach(b=>b.addEventListener('click',()=>{weights.push(+b.dataset.weight);tone(280+weights.length*18,.05,'sine',.03);update();}));
    $('#balanceUndo').addEventListener('click',()=>{weights.pop();update();});$('#balanceNew').addEventListener('click',makeChallenge);makeChallenge();
  }

  function makeCircuitLab(){
    const parts=[
      {id:'wire',icon:'〰️',name:'Wire',conducts:true},
      {id:'metal',icon:'🪙',name:'Metal',conducts:true},
      {id:'switch',icon:'⏻',name:'Switch',conducts:true,switch:true},
      {id:'wood',icon:'🪵',name:'Wood',conducts:false},
      {id:'rubber',icon:'🟫',name:'Rubber',conducts:false}
    ];
    const devices=[['💡','Bulb'],['🌀','Fan'],['🔔','Buzzer']];
    let level=Math.min(7,Number(localStorage.getItem('jakjak.circuit.level')||0)),deviceIndex=0,slots=['wood','rubber'],switchOn=false,solved=false;
    gameMount.innerHTML=`<div class="circuit-lab">
      <div class="circuit-top"><div><strong id="circuitGoal">Light the bulb</strong><small id="circuitLevel">LEVEL ${level+1}</small></div><div id="circuitState" class="circuit-state">OPEN</div></div>
      <div class="circuit-board">
        <div class="circuit-battery">🔋<span>Battery</span></div>
        <button class="circuit-slot" data-slot="0"></button>
        <div class="circuit-device" id="circuitDevice"><span id="deviceIcon">💡</span><small id="deviceName">Bulb</small></div>
        <button class="circuit-slot" data-slot="1"></button>
        <svg class="circuit-wire-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M18 28 H48"/><path d="M52 28 H82 V72 H52"/><path d="M48 72 H18 V28"/></svg>
      </div>
      <div class="circuit-parts">${parts.map(p=>`<button class="circuit-part" data-part="${p.id}"><span>${p.icon}</span><small>${p.name}</small></button>`).join('')}</div>
      <div class="circuit-actions"><button class="pill-btn" id="circuitSwitch">Toggle switch</button><button class="pill-btn" id="circuitNew">New challenge</button></div>
      <div id="circuitMessage" class="thinking-message">Tap a gap, then choose a part to put there.</div>
    </div>`;
    let selected=0;
    const slotEls=$$('.circuit-slot'),msg=$('#circuitMessage');
    function part(id){return parts.find(p=>p.id===id)}
    function newChallenge(){
      deviceIndex=(level>=2?Math.floor(Math.random()*devices.length):0);switchOn=false;solved=false;
      slots=level<2?['wood','rubber']:(level<4?['wire','switch']:[Math.random()<.5?'wood':'metal',Math.random()<.5?'rubber':'switch']);
      selected=0;render();msg.textContent=level<2?'Find two conducting parts to complete the loop.':'Complete the loop. A switch only conducts when it is on.';
    }
    function render(){
      const d=devices[deviceIndex];$('#deviceIcon').textContent=d[0];$('#deviceName').textContent=d[1];$('#circuitGoal').textContent=`Power the ${d[1].toLowerCase()}`;$('#circuitLevel').textContent=`LEVEL ${level+1}`;
      slotEls.forEach((el,i)=>{const p=part(slots[i]);el.innerHTML=`<span>${p.icon}</span><small>${p.name}</small>`;el.classList.toggle('selected',i===selected);});
      const complete=slots.every(id=>{const p=part(id);return p.conducts&&(!p.switch||switchOn)});
      $('#circuitState').textContent=complete?'CLOSED':'OPEN';$('#circuitState').classList.toggle('on',complete);$('#circuitDevice').classList.toggle('powered',complete);
      $('#circuitSwitch').textContent=switchOn?'Switch: ON':'Switch: OFF';
      if(complete&&!solved){solved=true;successChime();msg.textContent=`Circuit complete — the ${d[1].toLowerCase()} is powered!`;level=Math.min(7,level+1);localStorage.setItem('jakjak.circuit.level',String(level));setTimeout(newChallenge,1300);}
    }
    slotEls.forEach((el,i)=>el.addEventListener('click',()=>{selected=i;render();tone(260,.04,'sine',.025);}));
    $$('.circuit-part').forEach(b=>b.addEventListener('click',()=>{slots[selected]=b.dataset.part;render();tone(330,.05,'triangle',.03);}));
    $('#circuitSwitch').addEventListener('click',()=>{switchOn=!switchOn;render();tone(switchOn?460:180,.06,'square',.025);});$('#circuitNew').addEventListener('click',newChallenge);newChallenge();
  }

  function makeNumberMachine(){
    let level=Math.min(8,Number(localStorage.getItem('jakjak.machine.level')||0)),input=1,op1='+1',op2='none',target=0,solved=false;
    const ops=['+1','+2','+3','×2'];
    gameMount.innerHTML=`<div class="machine-lab">
      <div class="machine-target"><small>MAKE</small><strong id="machineTarget">8</strong></div>
      <div class="machine-line">
        <div class="machine-box"><small>INPUT</small><div class="machine-stepper"><button id="inputMinus">−</button><strong id="machineInput">1</strong><button id="inputPlus">+</button></div></div>
        <div class="machine-arrow">→</div>
        <button class="machine-op" id="machineOp1">+1</button>
        <div class="machine-arrow">→</div>
        <button class="machine-op second" id="machineOp2">OFF</button>
        <div class="machine-arrow">→</div>
        <div class="machine-output"><small>OUTPUT</small><strong id="machineOutput">2</strong></div>
      </div>
      <div class="machine-controls"><button class="pill-btn primaryish" id="machineCheck">Run machine</button><button class="pill-btn" id="machineNew">New target</button></div>
      <div class="machine-token-row" id="machineTokens"></div>
      <div id="machineMessage" class="thinking-message">Change the input and operations until the output matches the target.</div>
    </div>`;
    const msg=$('#machineMessage');
    function apply(v,op){if(op==='none')return v;if(op==='×2')return v*2;return v+Number(op.slice(1));}
    function output(){return apply(apply(input,op1),op2)}
    function render(){
      $('#machineInput').textContent=input;$('#machineOp1').textContent=op1;$('#machineOp2').textContent=op2==='none'?'OFF':op2;$('#machineOutput').textContent=output();$('#machineTarget').textContent=target;
      const out=output();$('#machineTokens').innerHTML=Array.from({length:Math.min(out,18)},()=>'<span>●</span>').join('')+(out>18?`<b>+${out-18}</b>`:'');
    }
    function cycle(current,allowOff){const arr=allowOff?['none',...ops]:ops;return arr[(arr.indexOf(current)+1)%arr.length]}
    function solvableTarget(){
      const maxInput=level<3?5:8,allowSecond=level>=3;const choices=[];
      for(let i=1;i<=maxInput;i++)for(const a of ops)for(const b of (allowSecond?['none',...ops]:['none']))choices.push(apply(apply(i,a),b));
      const uniq=[...new Set(choices.filter(x=>x>=3&&x<=24))];return uniq[Math.floor(Math.random()*uniq.length)];
    }
    function newChallenge(){solved=false;target=solvableTarget();input=1;op1='+1';op2=level>=3?'none':'none';render();msg.textContent=level>=3?'You can use one or two machines. Find any combination that works.':'Find an input and operation that makes the target.';}
    $('#inputMinus').addEventListener('click',()=>{input=Math.max(1,input-1);render();tone(220,.04,'sine',.025);});$('#inputPlus').addEventListener('click',()=>{input=Math.min(level<3?5:8,input+1);render();tone(300,.04,'sine',.025);});
    $('#machineOp1').addEventListener('click',()=>{op1=cycle(op1,false);render();tone(360,.04,'triangle',.025);});$('#machineOp2').addEventListener('click',()=>{if(level<3){msg.textContent='The second machine unlocks after a few challenges.';tone(150,.05);return;}op2=cycle(op2,true);render();tone(390,.04,'triangle',.025);});
    $('#machineCheck').addEventListener('click',()=>{if(solved)return;const out=output();if(out===target){solved=true;successChime();msg.textContent='Exactly! The machine made the target.';level=Math.min(8,level+1);localStorage.setItem('jakjak.machine.level',String(level));setTimeout(newChallenge,1100);}else{tone(170,.08,'sine',.035);msg.textContent=out<target?`You made ${out}. The target is bigger.`:`You made ${out}. The target is smaller.`;}});$('#machineNew').addEventListener('click',newChallenge);newChallenge();
  }

  function makeSounds(){
    const pads=[['🌧️','Rain',261.63,'sine'],['☀️','Sun',329.63,'sine'],['🌿','Leaf',392,'triangle'],['💧','Drop',523.25,'sine'],['🌙','Moon',220,'sine'],['⭐','Star',659.25,'triangle']];
    gameMount.innerHTML=`<div class="sound-grid">${pads.map((p,i)=>`<button class="sound-pad" data-pad="${i}">${p[0]}<span>${p[1]}</span></button>`).join('')}</div>`;
    $$('[data-pad]').forEach(btn=>btn.addEventListener('pointerdown',()=>{const p=pads[+btn.dataset.pad];tone(p[2],.35,p[3],.10)}));
  }

  function setupParentGate(){
    let tapCount=0;
    let tapTimer=null;
    const resetTaps=()=>{tapCount=0;clearTimeout(tapTimer);tapTimer=null;};
    const openGate=()=>{
      resetTaps();
      if(parentGate.open)return;
      parentGate.showModal();
      $('#gateAnswer').value='';
      $('#gateError').textContent='';
      setTimeout(()=>$('#gateAnswer').focus(),80);
    };
    parentHotspot.addEventListener('click',e=>{
      e.preventDefault();
      tapCount++;
      clearTimeout(tapTimer);
      if(tapCount>=5){openGate();return;}
      tapTimer=setTimeout(resetTaps,2500);
    });
    parentHotspot.addEventListener('contextmenu',e=>e.preventDefault());
    $('#gateForm').addEventListener('submit',e=>{e.preventDefault();if($('#gateAnswer').value.trim()==='11'){parentGate.close();openSettings()}else{$('#gateError').textContent='Try again.';tone(180,.12,'sine',.04)}});
  }
  function openSettings(){
    $('#toyToggles').innerHTML=TOYS.map(t=>`<label class="toy-toggle"><span>${t.icon} ${t.name}</span><input type="checkbox" data-setting-toy="${t.id}" ${state.settings.enabledToys.includes(t.id)?'checked':''}></label>`).join('');
    $('#volumeRange').value=state.settings.volume;$('#musicToggle').checked=state.settings.music;$('#calmMotionToggle').checked=state.settings.calmMotion;$('#choiceCountSelect').value=String(state.settings.choiceCount);$('#sessionSelect').value=String(state.settings.sessionMinutes);$('#warningSelect').value=String(state.settings.warningMinutes);settingsDialog.showModal();
  }
  $('#settingsForm').addEventListener('submit',e=>{e.preventDefault();state.settings.enabledToys=$$('[data-setting-toy]:checked').map(x=>x.dataset.settingToy);if(!state.settings.enabledToys.length)state.settings.enabledToys=['tinker'];state.settings.volume=+$('#volumeRange').value;state.settings.music=$('#musicToggle').checked;state.settings.calmMotion=$('#calmMotionToggle').checked;state.settings.choiceCount=+$('#choiceCountSelect').value;state.settings.sessionMinutes=+$('#sessionSelect').value;state.settings.warningMinutes=+$('#warningSelect').value;saveSettings();setupSessionReminder();settingsDialog.close();toast('Settings saved');});
  $('#closeSettings').addEventListener('click',()=>settingsDialog.close());
  $('#resetSettings').addEventListener('click',()=>{
    state.settings={...DEFAULTS,enabledToys:[...DEFAULTS.enabledToys]};
    saveSettings();
    settingsDialog.close();
    openSettings();
  });

  function setupSessionReminder(){clearTimeout(state.sessionTimer);clearTimeout(state.warningTimer);const mins=+state.settings.sessionMinutes,warn=+state.settings.warningMinutes;if(!mins)return;if(warn>0&&warn<mins)state.warningTimer=setTimeout(()=>toast(`${warn} minutes until playtime ends`),(mins-warn)*60000);state.sessionTimer=setTimeout(()=>toast('Playtime is finished for now'),mins*60000);}

  homeButton.addEventListener('click',goHome); brandButton.addEventListener('click',goHome); resetButton.addEventListener('click',resetToy);
  setupParentGate(); renderHome(); applyComfort(); setupSessionReminder();
  window.addEventListener('pointerdown',()=>ensureAudio(),{once:true});
  if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
