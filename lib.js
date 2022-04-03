const dayms = 1000 * 60 * 60 * 24;
const start = new Date('2022/04/01').setHours(0, 0, 0, 0);
const today = new Date().setHours(0, 0, 0, 0);
const puzzleId = Math.ceil((today - start)/(dayms));
let seedRand = new Math.seedrandom("t");

let state = {};
let persist = null;

function init() {
  setInterval(countdown, 1000);
  persist = localStorage.getItem('tactle');
  if (!persist) {
    persist = {
      lastPlayed: today,
      todayHighScore: 0,
      played: 0,
      wins: 0,
      incompletes: 0,
      losses: 0,
      streak: 0,
      maxStreak: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0
      }
    };
  }
  else {
    persist = JSON.parse(persist);
  }
  const daysSinceLastPlayed = today - persist.lastPlayed;
  if (daysSinceLastPlayed >= 1 || persist.played === 0) {
    persist.played++;
    persist.incompletes++;
  }

  persist.lastPlayed = today;
  localStorage.setItem('tactle', JSON.stringify(persist));

  state = {
    tempX: false,
    tempY: false,
    seed: puzzleId,
    score: 0,
    round: 1,
    pieces: [],
    blocks: [],
  };
  ['light', 'dark'].forEach(color => {
    const sigilPool = getSigilPool(5);
    for (let i=1; i<=5; i++) {
      const piece = {};
      piece.piece = getPiece();
      piece.color = color;
      piece.sigil = sigilPool[i-1];
      piece.x = i;
      piece.y = 1;
      if (color == 'dark') {
        piece.y = 6;
      }
      if (i == 3) {
        piece.piece = 'king';
      }
      switch(piece.piece) {
        case 'pawn':
          piece.hp = 1;
          break;
        case 'rook':
        case 'bishop':
        case 'knight':
          piece.hp = 2;
          break;
        case 'king':
        case 'queen':
          piece.hp = 3;
          break;
      }
      drawPiece(piece);
      state.pieces.push(piece);
    }
  });
  for (let i=0; i<2; i++) {
    const blocked = {x: getRandomInt(5)+1, y: getRandomInt(2)+3};
    state.blocks.push(blocked);
    drawBlock(blocked);
  }
  $(`.tile`).click(function() {
    $e = $(this);
    touchTile($e);
  });
  $('.light').each(function() {
    $e = $(this);
    const tiles = getMoveable($e);
    const r = getRandomInt(tiles.length);
    $e.attr('data-x', tiles[r].x).attr('data-y', tiles[r].y);
  });
}

function drawBlock(block) {
  $(`[data-row='${block.y}'] [data-col='${block.x}']`).attr('data-block', 'true');
}

function drawPiece(piece) {
  $('.grid').append(`
  <div class="unit ${piece.color}" data-piece="${piece.piece}" data-x="${piece.x}" data-y="${piece.y}" data-sigil="${piece.sigil}" data-hp=${piece.hp} data-state="${piece.color === 'dark' ? 'ready' : ''}">
    <span class="piece icon-"></span>
    <span class="piece dupe icon-"></span>
    <div class="info">
      <div class="hp">
      </div>
      <span class="sigil icon-"></span>
    </div>
  </div>
  `);
  $p = $(`[data-x="${piece.x}"][data-y="${piece.y}"]`);
  for (let i=0; i < piece.hp; i++) {
    $p.find('.hp').append('<span class="icon-heart"></span>');
  }
  $(`[data-x="${piece.x}"][data-y="${piece.y}"]`).click(function() {
    $e = $(this);
    touchPiece($e);
  });
}

function rewind() {
  if ($('.rewind').hasClass('hidden')) {
    return;
  }
  const mode = getMode();
  const $activePiece = getActivePiece();
  if (mode === 'moving') {
    $activePiece.attr('data-state', "ready");
  }
  if (mode === 'attacking') {
    $activePiece.attr('data-x', tempX).attr('data-y', tempY).attr('data-state', "ready");
  }
  $('.active').addClass('hidden');
  $('[data-move="true"]').attr('data-move', "false");
  $('[data-attack="true"]').attr('data-attack', "false");
  $('.rewind').addClass('hidden');
}

function touchPiece($e) {
  const mode = getMode();
  const $activePiece = getActivePiece();
  if (mode === 'neutral' && $e.hasClass('dark')) {
    $('.rewind').removeClass('hidden');
    cstate = $e.attr('data-state');
    if (!cstate || cstate === 'ready') {
      tempX = $e.attr('data-x');
      tempY = $e.attr('data-y');    
      $('.active').attr('data-x', $e.attr('data-x')).attr('data-y', $e.attr('data-y')).removeClass('hidden');
      $e.attr('data-state', 'moving');
      setMoveable($e);
    }
  }
  else if (mode === 'moving') {
    if ($activePiece.is($e)) {
      // self select, no move
      $('[data-move="true"]').attr('data-move', "false");
      $e.attr('data-state', 'attacking');
      setAttackable($e);
    }
  }
  else if (mode === 'attacking') {
    if ($activePiece.is($e)) {
      // self select, no attack
      $activePiece.attr('data-state', 'waiting');
      // $('[data-attack="true"]').attr('data-attack', "false");
      // $e.attr('data-state', 'waiting');
      // $('.active').addClass('hidden');
      endTurn();
    }
    else if ($e.hasClass('light') && isAttackable($e)) {
      // attack foe
      const result = doAttack($activePiece, $e);
      if (result === -1) {
        // loss
        loseHeart($activePiece, 1);
        const ax = $activePiece.attr('data-x');
        const ay = $activePiece.attr('data-y');
        $activePiece.attr('data-x', $e.attr('data-x'));
        $activePiece.attr('data-y', $e.attr('data-y'));
        $e.attr('data-x', ax);
        $e.attr('data-y', ay);
      }
      else if (result === 1) {
        // win
        loseHeart($e, 2);
      }
      else {
        // tie
        loseHeart($e, 1);
        loseHeart($activePiece, 1);
      }
      $('.score').html(`<span class="a-changeValue">${state.score}</span>`);
      $activePiece.attr('data-state', 'waiting');
      endTurn();
    }
  }
}

function endTurn() {
  $('[data-attack="true"]').attr('data-attack', "false");
  $('[data-state="attacking"]').attr('data-state', 'waiting');
  $('.active').addClass('hidden');
  $('.rewind').addClass('hidden');
  $remainingFoes = $('.unit.light');
  if ($remainingFoes.length === 0) {
    $('[data-state="ready"]').attr('data-state', 'waiting');
    console.log("Victory!");
    persist.incompletes--;
    persist.wins++;
    persist.distribution[state.round]++;
    window.localStorage.setItem('tactle', JSON.stringify(persist));
    showPanel('victory');
    return;
  }
  $remainingPieces = $('[data-state="ready"]');
  if ($remainingPieces.length === 0) {
    if (state.round < 6) {
      state.round++;
      $('.round').html(`<span class="a-changeValue">${state.round}</span>`);
      $('[data-state="waiting"]').attr('data-state', 'ready');
    }
    else {
      console.log("Failed...");      
      showPanel('failed');
    }
  }
}

function showPanel(result) {
  $('.overlay').addClass('fadeIn').removeClass('hidden');
  $('.panel').addClass('a-slideIn').removeClass('hidden');
  if (result === 'how') {
    $('.panel .how').removeClass('hidden');
  }
  if (result === 'victory') {
    $('.panel .victory').removeClass('hidden');
  }
  if (result === 'failed') {
    $('.panel .failed').removeClass('hidden');
  }
}

function hidePanel() {
  $('.panel .display').addClass('hidden');
  $('.overlay').removeClass('fadeIn').addClass('hidden');
  $('.panel').removeClass('a-slideIn').addClass('hidden');
}

function setMoveable($e) {
  let tiles = getMoveable($e);
  tiles.forEach(t => {
    $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-move', "true");
  });
}

function getMoveable($e) {
  const piece = $e.attr('data-piece');
  const x = parseInt($e.attr('data-x'));
  const y = parseInt($e.attr('data-y'));
  const all = [];
  const valid = [{x,y}];
  switch (piece) {
    case 'pawn':
      addCardinals(all, x, y, 1);
      break;
    case 'rook':
      addCardinals(all, x, y, 3);
      break;
    case 'bishop':
      addOrdinals(all, x, y, 3);
      break;
    case 'queen':
      addCardinals(all, x, y, 3);
      addOrdinals(all, x, y, 2);
      break;
    case 'king':
      addCardinals(all, x, y, 1);
      addOrdinals(all, x, y, 1);
      break;
    case 'knight':
      addKnight(all, x, y);
      break;
  }
  all.forEach(i => {
    valid.push({x: i[0], y: i[1]});
  });
  return valid;
}

function isMoveable(x, y) {
  // is there a tile at these coords
  const $t = $(`[data-row="${y}"] [data-col="${x}"]`);
  if ($t.length) {
    // is the tile empty
    const $unitAt = $(`[data-x="${x}"][data-y="${y}"]`);
    if (!$unitAt.length) {
      // is the tile blocked
      const blocked = $t.attr('data-block');
      if (blocked != 'true') {
        return true;
      }
    }
  }
}

function setAttackable($e) {
  let tiles = getAttackable($e);
  tiles.forEach(t => {
    $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-attack', "true");
  });
}

function getAttackable($e) {
  const piece = $e.attr('data-piece');
  const x = parseInt($e.attr('data-x'));
  const y = parseInt($e.attr('data-y'));
  const all = [
    [x-1,y-1],[x,y-1],[x+1,y-1],
    [x-1,y],[x+1,y],
    [x-1,y+1],[x,y+1],[x+1,y+1]
  ];
  const valid = [{x,y}];
  all.forEach(i => {
    // is there a tile at these coords
    const tx = i[0];
    const ty = i[1];
    const $t = $(`[data-row="${ty}"] [data-col="${tx}"]`);
    if ($t.length) {
      // is the tile empty
      const $unitAt = $(`[data-x="${tx}"][data-y="${ty}"]`);
      if ($unitAt.length && $unitAt.hasClass('light')) {
        valid.push({x: tx, y: ty});
      }
    }
  });
  return valid;
}

function doAttack($attacker, $target) {
  attack = $attacker.attr('data-sigil');
  defend = $target.attr('data-sigil');
  if (attack === 'water' && defend === 'fire') return 1;
  if (attack === 'fire' && defend === 'grass') return 1;
  if (attack === 'grass' && defend === 'water') return 1;
  if (attack === 'water' && defend === 'grass') return -1;
  if (attack === 'fire' && defend === 'water') return -1;
  if (attack === 'grass' && defend === 'fire') return -1;
  return 0;
}

function loseHeart($e, n) {
  $e.addClass('a-shake');
  $e.find('.hp').empty();
  $hp = parseInt($e.attr('data-hp'));
  if (n > $hp) {
    n = $hp;
  }

  $nhp = $hp - n;

  if ($e.hasClass('light')) {
    state.score += n;
  }
  else {
    state.score -= n;
  }

  if ($nhp <= 0) {
    $nhp = 0;
    $e.remove();
    if ($e.hasClass('light')) {
      if ($e.attr('data-piece') === 'king') {
        $('.score-crown').html('<span class="icon-king a-changeValue"></span>');
      }  
    }
    return;
  }
  $e.attr('data-hp', $nhp);
  for (let i=0; i < $nhp; i++) {
    $e.find('.hp').append('<span class="icon-heart"></span>');
  }
}

function addCardinals(tiles, x, y, d) {
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x, y-i)) {
      tiles.push([x,y-i]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x, y+i)) {
      tiles.push([x,y+i]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x+i, y)) {
      tiles.push([x+i,y]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x-i,y)) {
      tiles.push([x-i,y]);
    }
    else {
      i = d;
    }
  }
}

function addOrdinals(tiles, x, y, d) {
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x-i, y-i)) {
      tiles.push([x-i,y-i]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x-i, y+i)) {
      tiles.push([x-i,y+i]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x+i, y-i)) {
      tiles.push([x+i,y-i]);
    }
    else {
      i = d;
    }
  }
  for (let i = 1; i <= d; i++) {
    if (isMoveable(x+i,y+i)) {
      tiles.push([x+i,y+i]);
    }
    else {
      i = d;
    }
  }
}

function addKnight(tiles, x, y) {
  if (isMoveable(x-2,y-1)) {
    tiles.push([x-2,y-1]);
  }
  if (isMoveable(x-1,y-2)) {
    tiles.push([x-1,y-2]);
  }
  if (isMoveable(x-2,y+1)) {
    tiles.push([x-2,y+1]);
  }
  if (isMoveable(x-1,y+2)) {
    tiles.push([x-1,y+2]);
  }
  if (isMoveable(x+2,y-1)) {
    tiles.push([x+2,y-1]);
  }
  if (isMoveable(x+1,y-2)) {
    tiles.push([x+1,y-2]);
  }
  if (isMoveable(x+2,y+1)) {
    tiles.push([x+2,y+1]);
  }
  if (isMoveable(x+1,y+2)) {
    tiles.push([x+1,y+2]);
  }
}

function touchTile($e) {
  if (getMode() === 'moving') {
    const x = parseInt($e.attr('data-col'));
    const y = parseInt($e.parent().attr('data-row'));
    if ($e.attr('data-move') == 'true') {
      moveTo(x, y);
      const attackable = getAttackable($u);
      if (attackable.length > 0) {
        attackable.forEach(t => {
          $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-attack', "true");
        });
      }
      $('[data-move="true"]').attr('data-move', "false");
    }
  }
}

function moveTo(x, y) {
  $u = $('[data-state="moving"]');
  $u.attr('data-x', x).attr('data-y', y);
  $u.attr('data-state', 'attacking');
  $('.active').attr('data-x', x).attr('data-y', y);
}

function getMode() {
  let $u = $('[data-state="moving"]');
  if ($u.length) {
    return "moving";
  }
  $u = $('[data-state="attacking"]');
  if ($u.length) {
    return "attacking";
  }
  return 'neutral';
}

function getActivePiece() {
  let $u = $('[data-state="moving"], [data-state="attacking"]');
  if ($u.length) {
    return $u;
  }
}

function isAttackable($e) {
  return $(`[data-row="${$e.attr('data-y')}"] [data-col="${$e.attr('data-x')}"]`).attr('data-attack') == 'true';
}

function getPiece() {
  const regPieces = ['pawn', 'rook', 'knight', 'bishop', 'queen'];
  return regPieces[getRandomInt(regPieces.length)];
}

function getSigilPool(count) {
  const pool = ['fire', 'grass', 'water'];
  while (pool.length < count) {
    pool.push(getSigil());
  }
  return shuffle(pool);
}

function getSigil() {
  const sigils = ['fire', 'grass', 'water'];
  return sigils[getRandomInt(sigils.length)];
}

function countdown()
{
	var now = new Date();
	var hoursleft = 23-now.getHours();
	var minutesleft = 59-now.getMinutes();
	var secondsleft = 59-now.getSeconds();
	if (minutesleft<10) {
    minutesleft = "0"+minutesleft;
  }
	if (secondsleft<10) {
    secondsleft = "0"+secondsleft;
  }
	$('.countdown').html(hoursleft+":"+minutesleft+":"+secondsleft);
}

function getRandomInt(max) {
  const r = Math.floor(seedRand() * max);
  return r;
}

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  while (0 !== currentIndex) {
    randomIndex = getRandomInt(currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}