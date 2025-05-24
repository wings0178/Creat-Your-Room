/* ----------------------------------------------------------
   Room Layout Manager – front-end script
   ----------------------------------------------------------
   - 家具をドラッグ＆リサイズ
   - ＋Furniture で追加
   - ＋Item で家具をリストから選択 → アイテム追加
   - ダブルクリックで家具の中身表示
---------------------------------------------------------- */
window.onload = function () {

  // === グローバル ===
  const room = document.getElementById('room');
  let   data = {};   // { name: {x,y,w,h,items[]} }

  // === 1. 起動時にサーバーからデータ取得 ===
  fetch('/data')
    .then(r => r.json())
    .then(d => {
      data = d;
      for (const n in data) spawn(n, data[n]);
    });

  // === 2. 家具ブロックを生成 ===
  function spawn(name, info) {
    const div = document.createElement('div');
    div.className = 'furniture';
    div.textContent = name;

    // 右下ハンドル
    div.insertAdjacentHTML(
      'beforeend',
      '<div class="handle"></div>'
    );

    room.appendChild(div);
    apply(div, info);

    // 中身確認
    div.ondblclick = () =>
      alert(
        info.items.length ? info.items.join('\n')
                          : 'まだ何も入っていません'
      );

    makeDrag(div, name);
    makeResize(div, name);
  }

  // === 3. ＋Furniture ボタン ===
  document.getElementById('addFurniture').onclick = () => {
    const name = prompt('家具名は？');
    if (!name || data[name]) return;

    data[name] = { x: 50, y: 50, w: 120, h: 60, items: [] };
    spawn(name, data[name]);
    save();
  };

  // === 4. ＋Item ボタン（家具リスト選択版） ===
  document.getElementById('addItem').onclick = () => {
    const list = Object.keys(data);
    if (!list.length) {
      alert('まず家具を追加してね');
      return;
    }

    // --- 図形なしの簡易モーダルを動的生成 ---
    const dlg = document.createElement('div');
    dlg.style.cssText = `
      position:fixed; inset:0; background:#0004;
      display:flex; align-items:center; justify-content:center;
      z-index:9999;`;
    dlg.innerHTML = `
      <div style="background:#fff; padding:20px 30px; border-radius:8px;">
        <p style="margin:0 0 8px;">どの家具にアイテムを入れる？</p>
        <select id="fSel" style="width:180px; margin-bottom:12px;">
          ${list.map(n => `<option>${n}</option>`).join('')}
        </select><br>
        <button id="okBtn">OK</button>
        <button id="cancelBtn">キャンセル</button>
      </div>`;
    document.body.appendChild(dlg);

    dlg.querySelector('#cancelBtn').onclick = () => dlg.remove();

    dlg.querySelector('#okBtn').onclick = () => {
      const fname = dlg.querySelector('#fSel').value;
      dlg.remove();

      const item = prompt(`${fname} に追加するアイテム名は？`);
      if (!item) return;

      data[fname].items.push(item);
      save();
    };
  };

  // === 5. ドラッグ実装 ===
  function makeDrag(el, name) {
    interact(el).draggable({
      listeners: {
        move(e) {
          data[name].x += e.dx;
          data[name].y += e.dy;
          apply(el, data[name]);
        },
        end: save
      }
    });
  }

  // === 6. リサイズ実装 ===
  function makeResize(el, name) {
    interact(el).resizable({
      edges: { right: true, bottom: true },
      listeners: {
        move(e) {
          data[name].w = Math.max(60, e.rect.width);
          data[name].h = Math.max(30, e.rect.height);
          apply(el, data[name]);
        },
        end: save
      }
    });
  }

  // === 7. 共通：位置・サイズを要素に反映 ===
  function apply(el, info) {
    el.style.left   = info.x + 'px';
    el.style.top    = info.y + 'px';
    el.style.width  = info.w + 'px';
    el.style.height = info.h + 'px';
  }

  // === 8. サーバーへ保存 ===
  function save() {
    fetch('/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
};
