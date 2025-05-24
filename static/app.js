// ─── データと定数 ─────────────────────
const room   = document.getElementById('room');
const handle = document.getElementById('room-handle');
const COLORS = ['#ff9aa2','#ffb7b2','#ffdac1','#e2f0cb','#b5ead7',
                '#c7ceea','#b0d4ff','#ffd95e','#d1c4e9'];

let data     = {};    // 家具データ
let delMode  = false; // 削除モード
let lockMode = false; // 固定モード

// ─── 1. 初期ロード ──────────────────
fetch('/data').then(r=>r.json()).then(j=>{
  data=j; for(const n in data) createFurniture(n,data[n]);
});

// ─── 2. 家具生成 ───────────────────
function createFurniture(name,info){
  const div=document.createElement('div');
  div.className='furniture';
  div.dataset.id=name;
  div.textContent=name;
  div.style.background=info.color||'#b0d4ff';
  setRect(div,info);   // 位置 & サイズ
  setBadge(div,info);  // フォルダー有無

  // クリック
  div.onclick=e=>{
    if(delMode){ deleteFurniture(name,div); }
  };
  // ダブルクリックで詳細
  div.ondblclick=()=> openModal(name,div);

  room.appendChild(div);
  makeDrag(div,name); makeResize(div,name);
}

// ─── 3. バッジ ─────────────────────
function setBadge(div,info){
  div.querySelectorAll('.folder-badge').forEach(b=>b.remove());
  if(info.folders && Object.keys(info.folders).length){
    const b=document.createElement('span');
    b.className='folder-badge'; b.textContent='📁';
    div.appendChild(b);
  }
}

// ─── 4. ボタン処理 ──────────────────
addFurniture.onclick=()=>{
  const n=prompt('家具名？'); if(!n||data[n])return;
  data[n]={x:70,y:70,w:120,h:60,color:'#b0d4ff',folders:{}};
  createFurniture(n,data[n]); save();
};

addFolder.onclick=()=>{
  const f = select(Object.keys(data),'家具を選択'); if(!f)return;
  const folder=prompt('フォルダー名？'); if(!folder)return;
  data[f].folders=data[f].folders||{}; data[f].folders[folder]=[];
  setBadge(getDiv(f),data[f]); save();
};

addItem.onclick=()=>{
  const f = select(Object.keys(data),'家具を選択'); if(!f)return;
  const folders=Object.keys(data[f].folders||{});
  if(!folders.length){alert('フォルダーを先に追加');return;}
  const folder=select(folders,'フォルダーを選択'); if(!folder)return;
  const item=prompt('アイテム名？'); if(!item)return;
  data[f].folders[folder].push(item); save();
};

lockBtn.onclick=()=>{
  lockMode=!lockMode;
  lockBtn.textContent= lockMode?'🔒 Lock ON':'🔓 Lock OFF';
  document.querySelectorAll('.furniture')
          .forEach(el=>el.classList.toggle('locked',lockMode));
};

delBtn.onclick=()=>{
  delMode=!delMode;
  delBtn.textContent= delMode?'🗑 Delete ON':'🗑 Delete OFF';
};

// ─── 5. 情報＆色変更モーダル ─────────
function openModal(name,div){
  const info=data[name];
  let html=`<h3>${name}</h3>`;
  for(const f in info.folders){
    html+=`<strong>${f}</strong><ul>`;
    info.folders[f].forEach(i=>html+=`<li>${i}</li>`); html+='</ul>';
  }
  html+=`<hr>色変更:<div class='palette'>`;
  COLORS.forEach(c=> html+=`<span class='swatch' data-c='${c}'
    style='background:${c}'></span>`); html+=`</div>
    <button id='close'>Close</button>`;

  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:#0005;display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML=`<div style="background:#fff;padding:18px;border-radius:8px;max-height:80%;overflow:auto">${html}</div>`;
  document.body.appendChild(modal);

  modal.onclick=e=>{
    if(e.target.id==='close'||e.target===modal) modal.remove();
    if(e.target.classList.contains('swatch')){
      const c=e.target.dataset.c;
      info.color=c; div.style.background=c; save();
    }
  };
}

// ─── 6. 選択ダイアログ（番号入力） ──
function select(arr,title){
  const num=prompt(`${title}\n${arr.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n番号を入力:`); 
  const idx=parseInt(num,10)-1; return arr[idx]||null;
}

// ─── 7. ドラッグ & リサイズ ─────────
function makeDrag(el,id){
  interact(el).draggable({
    listeners:{move(e){
      if(lockMode) return;
      const i=data[id]; i.x+=e.dx; i.y+=e.dy; setRect(el,i);
    },end:save}
  });
}
function makeResize(el,id){
  interact(el).resizable({
    edges:{right:true,bottom:true},
    listeners:{move(e){
      if(lockMode) return;
      const i=data[id]; i.w=e.rect.width; i.h=e.rect.height; setRect(el,i);
    },end:save}
  });
}
function setRect(el,i){
  el.style.left=i.x+'px'; el.style.top=i.y+'px';
  el.style.width=i.w+'px'; el.style.height=i.h+'px';
}

// ─── 8. 削除 ─────────────────────
function deleteFurniture(name,div){
  if(confirm(`${name} を削除？`)){ delete data[name]; div.remove(); save(); }
}

// ─── 9. 部屋リサイズ（拡張のみ） ────
interact(handle).draggable({
  listeners:{move(e){
    const r=room.getBoundingClientRect();
    room.style.width = Math.max(600,r.width+e.dx)+'px';
    room.style.height= Math.max(400,r.height+e.dy)+'px';
  }}
});

// ─── 10. Util ─────────────────────
function getDiv(id){return document.querySelector(`[data-id="${id}"]`);}
function save(){
  fetch('/data',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data)});
}
