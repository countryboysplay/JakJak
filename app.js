(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const TOYS = [
    { id:'tinker', name:'Tinker Board', icon:'⚙️', blurb:'Switches, knobs, lights and cause-and-effect play.', accent:'#79B9A6', kicker:'TOUCH & DISCOVER', hint:'Try everything. There is no wrong way.' },
    { id:'shapes', name:'Shape Workshop', icon:'△', blurb:'Match shapes with big, forgiving drag-and-drop play.', accent:'#76A9D7', kicker:'MATCH & MOVE', hint:'Drag each shape to its matching space.' },
    { id:'creature', name:'Creature Builder', icon:'👾', blurb:'Build a silly creature from interchangeable parts.', accent:'#9D8DC5', kicker:'MAKE SOMETHING SILLY', hint:'Drag pieces onto the creature.' },
    { id:'marbles', name:'Marble Lab', icon:'🔵', blurb:'Tap, roll, bounce and experiment with simple physics.', accent:'#E97863', kicker:'ROLL & EXPERIMENT', hint:'Tap the playground to drop marbles.' },
    { id:'basketball', name:'Basketball', icon:'🏀', blurb:'Flick real shots, learn angles, and take on harder challenges.', accent:'#E58B46', kicker:'AIM • FLICK • SWISH', hint:'Touch the ball, flick toward the hoop, and adjust your shot.' },
    { id:'numbers', name:'Number Garden', icon:'🍎', blurb:'Explore counting and one-to-one quantities.', accent:'#F2C45F', kicker:'COUNT & NOTICE', hint:'Put the same number of apples in the basket.' },
    { id:'sounds', name:'Sound Garden', icon:'🎵', blurb:'Make gentle sounds and rhythms with colorful pads.', accent:'#D991A7', kicker:'LISTEN & PLAY', hint:'Tap the pads to make your own little song.' }
  ];

  const DEFAULTS = {
    enabledToys: TOYS.map(t => t.id),
    volume: 0.45,
    music: false,
    calmMotion: true,
    choiceCount: 7,
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
      // v0.3 migration: make the new Basketball toy visible for existing installs
      // without disturbing a deliberately compact 4-toy home screen.
      if (!Array.isArray(merged.enabledToys)) merged.enabledToys = [...DEFAULTS.enabledToys];
      if (!merged.enabledToys.includes('basketball')) merged.enabledToys.push('basketball');
      if ((saved.choiceCount ?? 6) === 6) merged.choiceCount = 7;
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
    const makers = { tinker:makeTinker, shapes:makeShapes, creature:makeCreature, marbles:makeMarbles, basketball:makeBasketball, numbers:makeNumbers, sounds:makeSounds };
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
    gameMount.innerHTML = `
      <div class="tinker-board">
        <div class="tinker-cell"><div id="lamp" class="lamp"></div><button id="switch" class="big-switch" aria-label="Light switch"><span></span></button></div>
        <div class="tinker-cell"><div id="knob" class="knob" role="slider" aria-valuemin="0" aria-valuemax="360" aria-valuenow="0" aria-label="Turning knob"></div><strong>Turn me</strong></div>
        <div class="tinker-cell"><button id="push" class="push-button" aria-label="Big button">●</button><strong>Push</strong></div>
        <div class="tinker-cell"><div class="slider-wrap"><strong>Slide</strong><input id="funSlider" type="range" min="0" max="100" value="50"><div id="sliderFace" style="font-size:3rem;text-align:center">🙂</div></div></div>
        <div class="tinker-cell"><div id="gears" class="gear-pair"><span class="gear">⚙</span><span class="gear">⚙</span></div><button id="gearBtn" class="pill-btn">Gears</button></div>
        <div class="tinker-cell"><div id="colorBlob" style="width:110px;height:110px;border-radius:35% 65% 60% 40%;background:var(--blue);transition:.2s"></div><button id="colorBtn" class="pill-btn">Color</button></div>
      </div>`;
    const sw=$('#switch'), lamp=$('#lamp'); sw.addEventListener('click',()=>{sw.classList.toggle('on');lamp.classList.toggle('on');tone(sw.classList.contains('on')?620:330,.12)});
    let angle=0, dragging=false, lastX=0; const knob=$('#knob');
    knob.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;knob.setPointerCapture(e.pointerId)});
    knob.addEventListener('pointermove',e=>{if(!dragging)return;angle=(angle+(e.clientX-lastX)*2)%360;lastX=e.clientX;knob.style.transform=`rotate(${angle}deg)`;knob.setAttribute('aria-valuenow',Math.round((angle+360)%360));});
    knob.addEventListener('pointerup',()=>{dragging=false;tone(240+((angle+360)%360),.12)});
    $('#push').addEventListener('click',()=>{tone(180,.14,'triangle',.14); const b=$('#push'); b.textContent=['●','★','✦','♥'][Math.floor(Math.random()*4)];});
    $('#funSlider').addEventListener('input',e=>{const v=+e.target.value;$('#sliderFace').textContent=v<34?'🙂':v<67?'😄':'🤩'; if(v%10<2) tone(240+v*4,.05,'sine',.04)});
    $('#gearBtn').addEventListener('click',()=>{ $$('.gear',$('#gears')).forEach(g=>g.classList.toggle('spin')); tone(300,.1,'square',.05)});
    const colors=['#76A9D7','#79B9A6','#E97863','#F2C45F','#9D8DC5','#D991A7']; let ci=0;
    $('#colorBtn').addEventListener('click',()=>{ci=(ci+1)%colors.length;$('#colorBlob').style.background=colors[ci];$('#colorBlob').style.borderRadius=`${30+Math.random()*35}% ${35+Math.random()*30}% ${30+Math.random()*35}% ${35+Math.random()*30}%`;tone(380+ci*60,.1)});
  }

  function makeShapes(){
    const defs=[['circle','○'],['square','□'],['triangle','△']];
    gameMount.innerHTML=`<div class="shape-area"><div class="shape-targets" id="shapeTargets">${defs.map(([c])=>`<div class="shape ${c} target" data-target="${c}"></div>`).join('')}</div><div class="shape-pieces" id="shapePieces">${defs.map(([c,s])=>`<div class="shape ${c}" data-shape="${c}" role="button" tabindex="0" aria-label="${c}">${c==='triangle'?'':s}</div>`).join('')}</div></div>`;
    let matched=0;
    const pieces=$$('[data-shape]');
    pieces.forEach(piece=>{
      let ox=0,oy=0,drag=false;
      piece.addEventListener('pointerdown',e=>{drag=true; const r=piece.getBoundingClientRect(); ox=e.clientX-r.left;oy=e.clientY-r.top;piece.setPointerCapture(e.pointerId);piece.style.position='fixed';piece.style.zIndex='50';piece.style.left=`${e.clientX-ox}px`;piece.style.top=`${e.clientY-oy}px`;});
      piece.addEventListener('pointermove',e=>{if(!drag)return;piece.style.left=`${e.clientX-ox}px`;piece.style.top=`${e.clientY-oy}px`;});
      piece.addEventListener('pointerup',e=>{if(!drag)return;drag=false; const target=$(`[data-target="${piece.dataset.shape}"]`); const tr=target.getBoundingClientRect(); const cx=e.clientX, cy=e.clientY; const near=cx>tr.left-45&&cx<tr.right+45&&cy>tr.top-45&&cy<tr.bottom+45; if(near){piece.remove();target.classList.remove('target');target.classList.add('matched');matched++;successChime();if(matched===defs.length)toast('All matched!');} else {piece.removeAttribute('style');tone(220,.08,'sine',.04);} });
    });
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

  function makeNumbers(){
    let target=1+Math.floor(Math.random()*5),count=0;
    gameMount.innerHTML=`<div class="number-stage"><div class="number-card" id="targetNumber">${target}</div><div class="basket-zone" id="basket"><div class="basket-label">Basket</div></div><div class="counter" id="counter">0 of ${target}</div><div class="number-items" id="numberItems"></div></div>`;
    const items=$('#numberItems'),basket=$('#basket');
    const total=target+2;
    for(let i=0;i<total;i++){const a=document.createElement('div');a.className='apple';a.textContent='🍎';a.role='button';a.tabIndex=0;a.addEventListener('click',()=>moveApple(a));items.appendChild(a)}
    function moveApple(a){if(a.parentElement===basket)return;basket.appendChild(a);count++;$('#counter').textContent=`${count} of ${target}`;tone(340+count*45,.1);if(count===target){successChime();toast(`${target}!`)}else if(count>target){$('#counter').textContent=`${count} apples — try taking one out`;}}
    basket.addEventListener('click',e=>{const a=e.target.closest('.apple');if(!a)return;items.appendChild(a);count=Math.max(0,count-1);$('#counter').textContent=`${count} of ${target}`;tone(240,.08)});
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
