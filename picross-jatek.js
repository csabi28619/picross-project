// ((jelenlegi állapotok))
let puzzleData = null;
let playerGrid = [];
let N = 0;
let errors = 0;
const MAX_ERRORS = 3;
let timerInterval = null;
let seconds = 0;
let gameActive = false;
let hintCount = 0;

// (((pálya random legenerálása (fájdalom volt))))
function calcClue(arr) {
  const g = [];
  let cnt = 0;
  for (const v of arr) {
    if (v) cnt++;
    else if (cnt > 0) { g.push(cnt); cnt = 0; }
  }
  if (cnt > 0) g.push(cnt);
  return g.length ? g : [];
}

function generateRandomPuzzle(size) {
  const density = 0.4 + Math.random() * 0.2;
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Math.random() < density ? 1 : 0)
  );
  const rowClues = Array.from({ length: size }, (_, r) => calcClue(grid[r]));
  const colClues = Array.from({ length: size }, (_, c) => calcClue(grid.map(row => row[c])));
  return {
    version: 1,
    name: 'Véletlen #' + Math.floor(Math.random() * 9000 + 1000),
    size,
    grid,
    rowClues,
    colClues,
    createdAt: new Date().toISOString()
  };
}

function newRandomGame() {
  document.getElementById('loseOverlay').classList.remove('show');
  document.getElementById('winOverlay').classList.remove('show');
  const size = parseInt(document.getElementById('sizeSelect').value);
  const data = generateRandomPuzzle(size);
  loadPuzzle(data);
}

function replayCurrentPuzzle() {
  document.getElementById('loseOverlay').classList.remove('show');
  document.getElementById('winOverlay').classList.remove('show');
  if (puzzleData) loadPuzzle(puzzleData);
}

// (fájlok kezelése)
function triggerLoad() {
  document.getElementById('fileInput').click();
}

function handleDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (file) readFile(file);
  e.target.value = '';
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.size || !data.grid) throw new Error('Érvénytelen fájl');
      loadPuzzle(data);
    } catch (err) {
      showToast('Hiba: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// (pálya betöltése és at időmérés)
function loadPuzzle(data) {
  puzzleData = data;
  N = data.size;
  playerGrid = Array.from({ length: N }, () => Array(N).fill('empty'));
  errors = 0;
  hintCount = 0;
  seconds = 0;
  gameActive = true;

  document.getElementById('sizeVal').textContent = N + '×' + N;
  document.getElementById('errVal').textContent = errors;
  document.getElementById('progressVal').textContent = '0%';
  document.getElementById('timerVal').textContent = '00:00';

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameActive) {
      seconds++;
      document.getElementById('timerVal').textContent = formatTime(seconds);
    }
  }, 1000);

  render();
  showToast('Pálya: ' + (data.name || 'Picross') + ' (' + N + '×' + N + ')');
}

function formatTime(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function getCellSize() {
  if (N <= 5) return 48;
  if (N <= 10) return 36;
  if (N <= 15) return 28;
  return 22;
}

// ((pálya kirajzolása (szintén nagyon gatya)))
function render() {
  const ws = document.getElementById('workspace');
  ws.innerHTML = '';

  const rowClues = puzzleData.rowClues;
  const colClues = puzzleData.colClues;
  const cellSize = getCellSize();
  const fontSize = Math.max(9, cellSize * 0.55);

  const maxColLen = Math.max(...colClues.map(a => a.length), 1);
  const maxRowLen = Math.max(...rowClues.map(a => a.length), 1);
  const cornerW = maxRowLen * (fontSize + 8) + 12;
  const cornerH = maxColLen * (fontSize + 6) + 10;

  const topRow = document.createElement('div');
  topRow.className = 'top-clues-row';

  const corner = document.createElement('div');
  corner.className = 'corner';
  corner.style.cssText = `width:${cornerW}px; height:${cornerH}px;`;
  topRow.appendChild(corner);

  for (let c = 0; c < N; c++) {
    const colDiv = document.createElement('div');
    colDiv.className = 'clue-col' + (isColSolved(c) ? ' solved' : '');
    colDiv.style.cssText = `width:${cellSize}px; min-height:${cornerH}px;`;
    const nums = (colClues[c] && colClues[c].length) ? colClues[c] : [0];
    for (let p = 0; p < maxColLen - nums.length; p++) {
      const sp = document.createElement('div');
      sp.className = 'clue-num';
      sp.style.visibility = 'hidden';
      sp.textContent = '0';
      colDiv.appendChild(sp);
    }
    nums.forEach(n => {
      const d = document.createElement('div');
      d.className = 'clue-num' + (isColSolved(c) ? ' done' : '');
      d.style.fontSize = fontSize * 0.85 + 'px';
      d.textContent = n;
      colDiv.appendChild(d);
    });
    topRow.appendChild(colDiv);
  }
  ws.appendChild(topRow);

  for (let r = 0; r < N; r++) {
    const mainRow = document.createElement('div');
    mainRow.className = 'main-row';

    const rowDiv = document.createElement('div');
    rowDiv.className = 'clue-row' + (isRowSolved(r) ? ' solved' : '');
    rowDiv.style.cssText = `height:${cellSize}px; min-width:${cornerW}px;`;
    const rNums = (rowClues[r] && rowClues[r].length) ? rowClues[r] : [0];
    for (let p = 0; p < maxRowLen - rNums.length; p++) {
      const sp = document.createElement('div');
      sp.className = 'clue-num';
      sp.style.visibility = 'hidden';
      sp.textContent = '0';
      rowDiv.appendChild(sp);
    }
    rNums.forEach(n => {
      const d = document.createElement('div');
      d.className = 'clue-num' + (isRowSolved(r) ? ' done' : '');
      d.style.fontSize = fontSize * 0.85 + 'px';
      d.textContent = n;
      rowDiv.appendChild(d);
    });
    mainRow.appendChild(rowDiv);

    for (let c = 0; c < N; c++) {
      const cell = document.createElement('div');
      const state = playerGrid[r][c];
      cell.className = 'cell ' + state;
      cell.style.cssText = `width:${cellSize}px; height:${cellSize}px; font-size:${fontSize}px;`;
      if ((c + 1) % 5 === 0 && c < N - 1) cell.classList.add('sep-right');
      if ((r + 1) % 5 === 0 && r < N - 1) cell.classList.add('sep-bottom');
      if (state === 'empty') {
        cell.addEventListener('click', () => handleLeftClick(r, c));
        cell.addEventListener('contextmenu', (e) => { e.preventDefault(); handleRightClick(r, c); });
      }
      mainRow.appendChild(cell);
    }
    ws.appendChild(mainRow);
  }

  updateProgress();
}

// (kattintásoknak kezelése, hibák számlálása, stb.)
function handleLeftClick(r, c) {
  if (!gameActive || playerGrid[r][c] !== 'empty') return;
  const correct = puzzleData.grid[r][c] === 1;
  if (correct) {
    playerGrid[r][c] = 'revealed';
    render();
    checkWin();
  } else {
    playerGrid[r][c] = 'wrong';
    errors++;
    document.getElementById('errVal').textContent = errors;
    render();
    if (errors >= MAX_ERRORS) {
      gameActive = false;
      clearInterval(timerInterval);
      document.getElementById('loseText').textContent =
        `${errors} hibával játék vége! Idő: ${formatTime(seconds)}`;
      document.getElementById('loseOverlay').classList.add('show');
    }
  }
}

function handleRightClick(r, c) {
  if (!gameActive) return;
  if (playerGrid[r][c] === 'empty') playerGrid[r][c] = 'marked';
  else if (playerGrid[r][c] === 'marked') playerGrid[r][c] = 'empty';
  render();
}

function isRowSolved(r) {
  for (let c = 0; c < N; c++) {
    if (puzzleData.grid[r][c] === 1 && playerGrid[r][c] !== 'revealed') return false;
  }
  return true;
}

function isColSolved(c) {
  for (let r = 0; r < N; r++) {
    if (puzzleData.grid[r][c] === 1 && playerGrid[r][c] !== 'revealed') return false;
  }
  return true;
}

function updateProgress() {
  let total = 0, done = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (puzzleData.grid[r][c] === 1) {
        total++;
        if (playerGrid[r][c] === 'revealed') done++;
      }
    }
  }
  document.getElementById('progressVal').textContent =
    total > 0 ? Math.round(done / total * 100) + '%' : '0%';
}

function checkWin() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (puzzleData.grid[r][c] === 1 && playerGrid[r][c] !== 'revealed') return;
    }
  }
  gameActive = false;
  clearInterval(timerInterval);
  const penalty = errors * 30;
  document.getElementById('winText').textContent =
    `Idő: ${formatTime(seconds)} | Hibák: ${errors} | Hintek: ${hintCount} | Pontszám: ${Math.max(0, 10000 - seconds - penalty - hintCount * 200)}`;
  document.getElementById('winOverlay').classList.add('show');
}

function useHint() {
  if (!gameActive || !puzzleData) return;
  const candidates = [];
  for (let r = 0; r < N; r++) if (!isRowSolved(r)) candidates.push({ type: 'row', idx: r });
  for (let c = 0; c < N; c++) if (!isColSolved(c)) candidates.push({ type: 'col', idx: c });
  if (candidates.length === 0) { showToast('Minden sor/oszlop megoldva!'); return; }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  hintCount++;

  if (pick.type === 'row') {
    for (let c = 0; c < N; c++) {
      if (puzzleData.grid[pick.idx][c] === 1 && playerGrid[pick.idx][c] === 'empty')
        playerGrid[pick.idx][c] = 'revealed';
    }
    showToast(`Hint: ${pick.idx + 1}. sor felfedve! (${hintCount}. hint)`);
  } else {
    for (let r = 0; r < N; r++) {
      if (puzzleData.grid[r][pick.idx] === 1 && playerGrid[r][pick.idx] === 'empty')
        playerGrid[r][pick.idx] = 'revealed';
    }
    showToast(`Hint: ${pick.idx + 1}. oszlop felfedve! (${hintCount}. hint)`);
  }

  render();
  checkWin();
}

// (kész pálya mentése fájlba)
function saveCurrentPuzzle() {
  if (!puzzleData) { showToast('Nincs betöltött pálya!'); return; }

  const data = {
    version: 1,
    name: puzzleData.name || 'Picross',
    size: puzzleData.size,
    grid: puzzleData.grid,
    rowClues: puzzleData.rowClues,
    colClues: puzzleData.colClues,
    createdAt: puzzleData.createdAt || new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.name.replace(/\s+/g, '_') + '.picross';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Mentve: ' + data.name + '.picross');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// (((pálya betöltésekor automatikusan)))
window.addEventListener('load', () => newRandomGame());
