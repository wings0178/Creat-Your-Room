/********************************************************
  Room Layout Manager – v3
  機能:
    • 家具・フォルダー・アイテム3階層
    • 家具作成後に9色パレットで色変更
    • 削除モード & 家具ロック/アンロック切替
    • 部屋サイズは初期600×400（拡張のみOK）
*********************************************************/

const room   = document.getElementById('room');
const handle = document.getElementById('room-handle');
const paletteColors = ['#ff9aa2','#ffb7b2','#ffdac1','#e2f0cb',
                       '#b5ead7','#c7ceea','#b0d4ff','#ffd95e',
                       '#d1c4e9'];

let data = {};        // 全家具データ
let delMode = false;  // 削除モード
let lockMode=false;   // 家具固定モード

/* ────────────────────────────────
   1. サーバー読み込み
──────────────────────────────── */
fetch('/data').then(r=>r.json()).then(d=>{
  data=d;
  for(const n in data) spawn(n,data[n]);
});

/* ────────────────────────────────
   2. 家具生成
──────────────────────────────── */
function spawn(name,info){
  const div=document.createElement('div');
  div.className='furniture';
  div.dataset.id=name;
  div.textContent=name;
  div.style.background= info.color || '#b0d4ff';
  applyRect(div,info);
  badge(div,info);

  room.appendChild(div);

  /* クリック*/
  div.onclick = e=>{
    if(delMode){ delFurniture(name,div); return; }
    if(lockMode) return;
  };

  /* ダブルクリック→情報ポップアップ */
  div.ondblclick = ()=> openInfo(name,div);

  /* ドラッグ & リサイズ */
  makeDrag(div,name);
  makeResize(div,name);
}

/* ────────────────────────────────
   3. 家具バッジ
──────────────────────────────── */
function badge(div,info){
  div.querySelectorAll('.folder-badge').forEach(b=>b.remove());
  if(info.folders && Object.keys(info.folders).length){
    const b=document.createElement('span');
    b.className='folder-badge'; b.textContent='📂';
    div.appendChild(b);
  }
}

/* ────────────────────────────────
   4. ボタン系
──────────────────────────────── */
addFurniture.onclick = ()=>{
  const name=prompt('家具名？'); if(!name||data[name]) return;
  data[name]={x:60,y:60,w:120,h:60,color:'#b0d4ff',folders:{}};
  spawn(name,data[name]); save();
};

addFolder.onclick = ()=>{
  const f = chooseFurniture(); if(!f) return;
  const folder = prompt('フォルダー名？'); if(!folder) return;
  data[f].folders=data[f].folders||{}; data[f].folders[folder]=data[f].folders[folder]||[];
  badge(document.querySelector(`[data-id="${f}"]`),data[f]); save();
};

addItem.onclick = ()=>{
  const f = chooseFurniture(); if(!f) return;
  const folders=Object.keys(data[f].folders||{});
  if(!folders.length){ alert('先にフォルダーを作って'); return; }
  const folder=prompt(`どのフォルダー？\n${folders.join(', ')}`); if(!folder) return;
  if(!folders.includes(folder)){ alert('存在しないフォルダー'); return; }
  const item=prompt('アイテム名？'); if(!item) return;
  data[f].folders[folder].push(item); save();
};

/* ─── 削除モード切替 */
delModeBtn.onclick=()=>{
  delMode=!delMode;
  alert(delMode?'削除モードON（家具をタップで削除）':'削除モードOFF');
};
/* ─── 家具固定/解除 */
lockBtn.onclick=()=>{
  lockMode=!lockMode;
  document.querySelectorAll('.furniture').forEach(div=>{
    div.classList.toggle('locked',lockMode);
  });
  lockBtn.textContent= lockMode?'Unlock Furniture':'Lock Furniture';
};

/* ────────────────────────────────
   5. 情報ポップアップ + 色変更
──────────────────────────────── */
function openInfo(name,div){
  const info=data[name];
  let txt=`<strong>${name}</strong><br>`;
  for(const f in info.folders){
    txt+=`📂${f}<br>`;
    info.folders[f].forEach(i=>txt+=`&nbsp;&nbsp;- ${i}<br>`);
  }
  /* 色パレットHTML */
  txt+=`<hr>色を選んで変更：<div class='palette'>`;
  paletteColors.forEach(c=>{
    txt+=`<span class='swatch' style='background:${c}' data-color='${c}'></span>`;
  });
  txt+=`</div>`;

  /* モーダル */
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:#0006;display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML=`<div style="background:#fff;padding:16px;border-radius:8px;max-height:70%;overflow:auto">${txt}<br><button id='closeInfo'>Close</button></div>`;
  document.body.appendChild(modal);

  modal.onclick=e=>{
    if(e.target.id==='closeInfo'||e.target===modal) modal.remove();
    if(e.target.classList.contains('swatch')){
      const c=e.target.dataset.color;
      info.color=c; div.style.background=c; save();
    }
  };
}

/* ────────────────────────────────
   6. ドラッグ / リサイズ
──────────────────────────────── */
function makeDrag(el,name){
  interact(el).draggable({
    listeners:{ move(e){
      if(lockMode) return;
      data[name].x+=e.dx; data[name].y+=e.dy;
      applyRect(el,data[name]);
    },end:save }
  });
}
function makeResize(el,name){
  interact(el).resizable({
    edges:{right:true,bottom:true},
    listeners:{ move(e){
      if(lockMode) return;
      data[name].w=e.rect.width; data[name].h=e.rect.height;
      applyRect(el,data[name]);
    },end:save }
  });
}
function applyRect(el,info){
  el.style.left=info.x+'px'; el.style.top=info.y+'px';
  el.style.width=info.w+'px'; el.style.height=info.h+'px';
}

/* ────────────────────────────────
   7. 削除処理
──────────────────────────────── */
function delFurniture(name,div){
  if(confirm(`${name} を削除？`)){
    delete data[name]; div.remove(); save();
  }
}

/* ────────────────────────────────
   8. 家具選択ダイアログ
──────────────────────────────── */
function chooseFurniture(){
  const names=Object.keys(data); if(!names.length){alert('家具なし');return null;}
  const n=prompt(`どの家具？\n${names.join(', ')}`); return data[n]?n:null;
}

/* ────────────────────────────────
   9. 部屋リサイズ（拡大のみ）
──────────────────────────────── */
interact(handle).draggable({
  listeners:{ move(e){
    const r=room.getBoundingClientRect();
    room.style.width = Math.max(600,r.width+e.dx)+'px';
    room.style.height= Math.max(400,r.height+e.dy)+'px';
  }}
});

/* ────────────────────────────────
   10. 保存
──────────────────────────────── */
function save(){
  fetch('/data',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data)});
}
