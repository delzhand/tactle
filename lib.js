const dayms = 1000 * 60 * 60 * 24;
const start = new Date('2022/04/01').setHours(0, 0, 0, 0);
const today = new Date().setHours(0, 0, 0, 0);
const puzzleId = Math.ceil((today - start)/(dayms));
let seedRand = new Math.seedrandom(puzzleId);

let gameState = {};

function init() {
  setInterval(countdown, 1000);
  gameState = {
    tempX: false,
    tempY: false,
    seed: puzzleId,
    maxScore: 0,
    round: 1,
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
        piece.y = 7;
      }
      switch(piece.piece) {
        case 'pawn':
          piece.hp = 2;
          break;
        case 'rook':
        case 'bishop':
        case 'knight':
          piece.hp = 3;
          break;
        case 'king':
        case 'queen':
          piece.hp = 4;
          break;
      }
      if (color === 'dark') {
        gameState.maxScore += parseInt(piece.hp);
      }
      drawPiece(piece);
    }
  });
  for (let i=0; i<2; i++) {
    const blocked = {x: getRandomInt(5)+1, y: getRandomInt(3)+3};
    drawBlock(blocked);
  }
  $(`.tile`).click(function() {
    $e = $(this);
    touchTile($e);
  });
}

function drawBlock(block) {
  $(`[data-row='${block.y}'] [data-col='${block.x}']`).attr('data-block', 'true');
}

function drawPiece(piece) {
  $('.grid').append(`
  <div class="unit" data-color="${piece.color}" data-piece="${piece.piece}" data-x="${piece.x}" data-y="${piece.y}" data-sigil="${piece.sigil}" data-hp=${piece.hp} data-state="${piece.color === 'dark' ? 'ready' : 'ai'}">
    <span class="piece icon-"></span>
    <span class="piece dupe icon-"></span>
    <div class="info">
      <div class="hp">
      </div>
      <span class="sigil icon-"></span>
    </div>
  </div>
  `);
  $p = getPieceAt(piece.x, piece.y);
  for (let i=0; i < piece.hp; i++) {
    $p.find('.hp').append('<span class="icon-heart"></span>');
  }
  $p.click(function() {
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
  const eData = getPieceData($e);
  const mode = getMode();
  const $activePiece = getActivePiece();
  if (mode === 'neutral' && eData.color === 'dark') {
    $('.rewind').removeClass('hidden');
    if (!eData.state || eData.state === 'ready') {
      tempX = eData.x;
      tempY = eData.y;
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
      endTurn();
    }
    else if (eData.color === 'light' && isAttackable($e)) {
      // attack foe
      const result = compareElement($activePiece, $e);
      doAttack($activePiece, $e, result);
      $('.score').html(`<span class="a-changeValue">${gameState.score}</span>`);
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
  $remainingFoes = $('[data-color="light"]');
  $remainingAllies = $('[data-color="dark"]');
  if ($remainingFoes.length === 0) {
    $('[data-state="ready"]').attr('data-state', 'waiting');
    $('.score').html(`${getScore()}/${gameState.maxScore}`);
    showPanel('victory');
    return;
  }
  if ($remainingAllies.length === 0) {
      console.log("Failed...");      
      showPanel('failed');
  }
  $remainingPieces = $('[data-state="ready"]');
  if ($remainingPieces.length === 0) {
    gameState.aiInterval = setInterval(function() {
      executeAI();
    // gameState.round++;
    // $('.round').html(`<span class="a-changeValue">${gameState.round}</span>`);
    // $('[data-state="waiting"]').attr('data-state', 'ready');

    }, 1000);
    // // start ai turn
    // console.log($remainingFoes);
    // $remainingFoes.each(function(){
    //   doAIAction($(this));      
    //   await bananapeel(500);
    // });
    // $('[data-color="light"]').attr('data-state', 'ai');

    // gameState.round++;
    // $('.round').html(`<span class="a-changeValue">${gameState.round}</span>`);
    // $('[data-state="waiting"]').attr('data-state', 'ready');

    // if (gameState.round < 6) {
    //   gameState.round++;
    //   $('.round').html(`<span class="a-changeValue">${gameState.round}</span>`);
    //   $('[data-state="waiting"]').attr('data-state', 'ready');
    // }
    // else {
    //   console.log("Failed...");      
    //   showPanel('failed');
    // }
  }
}

function executeAI() {
  $remainingFoes = $('[data-state="ai"]');
  if ($remainingFoes.length) {
    $foe = $remainingFoes.first();
    doAIAction($foe);
    $foe.attr('data-state', 'aiwaiting');
  }
  else {
    gameState.round++;
    $('.round').html(`<span class="a-changeValue">${gameState.round}</span>`);
    $('[data-state="waiting"]').attr('data-state', 'ready');
    $('[data-state="aiwaiting"]').attr('data-state', 'ai');
    clearTimeout(gameState.aiInterval);
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
  const eData = getPieceData($e);
  let tiles = getMoveable(eData.x, eData.y, eData.piece);
  tiles.forEach(t => {
    $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-move', "true");
  });
}

function getMoveable(x, y, piece) {
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
    const $unitAt = getPieceAt(x, y);
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
  const eData = getPieceData($e);
  let tiles = getAttackable(eData.color, eData.x, eData.y);
  tiles.forEach(t => {
    $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-attack', "true");
  });
}

function getAttackable(attackerColor, x, y) {
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
      const $unitAt = getPieceAt(tx, ty);
      if ($unitAt.length && $unitAt.attr('data-color') !== attackerColor) {
        valid.push({x: tx, y: ty});
      }
    }
  });
  return valid;
}

function doAttack($attacker, $defender, result) {
  if (result === -1) {
    // loss
    loseHeart($attacker, 1);
    const aData = getPieceData($attacker);
    const ax = aData.x;
    const ay = aData.y;
    $attacker.attr('data-x', $defender.attr('data-x'));
    $attacker.attr('data-y', $defender.attr('data-y'));
    $defender.attr('data-x', ax);
    $defender.attr('data-y', ay);
  }
  else if (result === 1) {
    // win
    loseHeart($defender, 2);
  }
  else {
    // tie
    loseHeart($defender, 1);
    loseHeart($attacker, 1);
  }
}

function compareElement($attacker, $target) {
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

function doAIAction($e) {
  $e.attr('data-state', 'moving');
  let option = false;
  const options = getAIOptions($e);
  options.forEach(o => {
    if (!option || o.rating > option.rating) {
      option = o;
    }
  });
  moveTo(option.x, option.y);
  if (option.target) {
    const result = compareElement($e, option.target)
    doAttack($e, option.target, result);
  }
}

function getAIOptions($e) {
  const eData = getPieceData($e);
  // AI priority:
  // Element Advantage * 10
  // Weakest HP * 5
  // Downward board position * 1
  const options = [];
  moveable = getMoveable(eData.x, eData.y, eData.piece);
  moveable.forEach(m => {
    let rating = 0;
    rating += m.y; // y position
    options.push({x: m.x, y: m.y, target: null, rating})
    const attackable = getAttackable(eData.color, m.x, m.y);
    attackable.forEach(a => {
      const $pieceAt = getPieceAt(a.x, a.y);
      if ($pieceAt.length && !$pieceAt.is($e)) {
        const paData = getPieceData($pieceAt);
        const elementComp = compareElement($e, $pieceAt);
        rating += ((elementComp+1)/2) * 10; // normalized element
        const hp = paData.hp;
        rating += ((5-hp)/5) * 5;
        options.push({x: m.x, y: m.y, target: $pieceAt, rating})
      }
    });
  });
  return options;
}

function loseHeart($e, n) {
  $e.addClass('a-shake');
  $e.find('.hp').empty();
  $hp = parseInt($e.attr('data-hp'));
  if (n > $hp) {
    n = $hp;
  }

  $nhp = $hp - n;
  if ($nhp <= 0) {
    $nhp = 0;
    setTimeout(function() {
      $e.remove();
    }, 500);
    return;
  }
  $e.attr('data-hp', $nhp);
  for (let i=0; i < $nhp; i++) {
    $e.find('.hp').append('<span class="icon-heart"></span>');
  }
}

function getScore() {
  let score = 0;
  $('[data-color="dark"]').each(function() {
    data = getPieceData($(this));
    score += data.hp;
  });
  return score;
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
      const $activePiece = getActivePiece();
      const apData = getPieceData($activePiece);
      const attackable = getAttackable(apData.color, x, y);
      if (attackable.length > 0) {
        attackable.forEach(t => {
          $(`[data-row="${t.y}"] [data-col="${t.x}"]`).attr('data-attack', "true");
        });
      }
      $('[data-move="true"]').attr('data-move', "false");
    }
  }
}

function getTileCoords($e) {
  return {x: $e.attr('data-col'), y: $e.parent().attr('data-row')};
}

function getPieceAt(x, y) {
  return $(`.unit[data-x="${x}"][data-y="${y}"]`);
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

function getPieceData($e) {
  if (!$e) {
    return null;
  }
  return {
    x: parseInt($e.attr('data-x')), 
    y: parseInt($e.attr('data-y')),
    color: $e.attr('data-color'),
    state: $e.attr('data-state'),
    sigil: $e.attr('data-sigil'),
    hp: parseInt($e.attr('data-hp')),
    piece: $e.attr('data-piece')
  };
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