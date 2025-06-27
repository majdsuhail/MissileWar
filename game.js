const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const groundY = 160;
const canvasPadding = 30;

const leftSquare = { x: canvasPadding, y: groundY - 40, size: 40, color: 'red', hp: 100 };
const rightSquare = { x: 800 - canvasPadding - 40, y: groundY - 40, size: 40, color: 'blue', hp: 100 };

const projectiles = [];
const counterProjectiles = [];
let explosion = null;
let bigMissileCooldown = false;
let smallMissileCooldown = false;
let defenseCooldown = false;
let bigCooldownInterval = null;
let smallCooldownInterval = null;

const cooldownBar = document.getElementById('cooldownBar');
const cooldownProgress = document.getElementById('cooldownProgress');
const smallCooldownBar = document.getElementById('smallCooldownBar');
const smallCooldownProgress = document.getElementById('smallCooldownProgress');

let smallShotCount = 0;
let lastSmallShotTime = 0;
const MAX_SMALL_SHOTS = 10;
const SMALL_SHOT_INTERVAL = 1500;
let gameOver = false;

function drawGround() {
  ctx.fillStyle = '#444';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
}

function drawSquare(square) {
  ctx.fillStyle = square.color;
  ctx.fillRect(square.x, square.y, square.size, square.size);
  // Draw emoji on the square
  ctx.font = '28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (square.color === 'red') {
    ctx.fillText('🍦', square.x + square.size / 2, square.y + square.size / 2);
  } else if (square.color === 'blue') {
    ctx.fillText('🌸', square.x + square.size / 2, square.y + square.size / 2);
  }
  // Show HP for both squares
  ctx.fillStyle = 'white';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`HP: ${square.hp}`, square.x + 5, square.y - 5);
}

function drawProjectiles(list) {
  for (const p of list) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
}

function drawExplosion() {
  if (explosion && explosion.frames > 0) {
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 200, 0, ${explosion.frames / 10})`;
    ctx.fill();
    explosion.radius += 2;
    explosion.frames--;
  }
}

function showEndScreen(message) {
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#fff";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  ctx.restore();
  document.getElementById('restartBtn').style.display = 'block';
  document.getElementById('smallBtn').disabled = true;
  document.getElementById('bigBtn').disabled = true;
}

function restartGame() {
  leftSquare.hp = 100;
  rightSquare.hp = 100;
  projectiles.length = 0;
  counterProjectiles.length = 0;
  explosion = null;
  bigMissileCooldown = false;
  smallMissileCooldown = false;
  defenseCooldown = false;
  smallShotCount = 0;
  lastSmallShotTime = 0;
  gameOver = false;
  document.getElementById('restartBtn').style.display = 'none';
  document.getElementById('smallBtn').disabled = false;
  document.getElementById('bigBtn').disabled = false;
  cooldownBar.style.display = 'none';
  smallCooldownBar.style.display = 'none';
  update();
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround();
  drawSquare(leftSquare);
  drawSquare(rightSquare);
  drawProjectiles(projectiles);
  drawProjectiles(counterProjectiles);
  drawExplosion();

  // Check win/lose
  if (!gameOver) {
    if (leftSquare.hp <= 0) {
      gameOver = true;
      showEndScreen("You Win!");
      return;
    }
    if (rightSquare.hp <= 0) {
      gameOver = true;
      showEndScreen("You Lose!");
      return;
    }
  }

  // Update incoming missiles (projectiles)
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.t += 0.02;
    if (p.fromLeft) {
      // Enemy missile: left to right
      const startX = leftSquare.x + leftSquare.size;
      const endX = rightSquare.x;
      p.x = startX + (endX - startX) * p.t;
      p.y = groundY - 20 - 100 * Math.sin(Math.PI * p.t);
      // No auto-defense for enemy missiles
      if (p.t >= 1) {
        explosion = { x: p.x + p.size / 2, y: p.y + p.size / 2, radius: 10, frames: 10 };
        // Apply damage to blue box
        if (rightSquare.hp > 0) {
          rightSquare.hp = Math.max(0, rightSquare.hp - p.damage);
        }
        projectiles.splice(i, 1);
      }
    } else {
      // Player missile: right to left
      const startX = rightSquare.x;
      const endX = leftSquare.x + leftSquare.size;
      p.x = startX - (startX - endX) * p.t;
      p.y = groundY - 20 - 100 * Math.sin(Math.PI * p.t);

      // Launch a defense missile only if not in cooldown and there's no defense missile already targeting this projectile
      if (!defenseCooldown && p.x < 500 && !counterProjectiles.some(cp => cp.target === p)) {
        const counter = {
          x: leftSquare.x + leftSquare.size,
          y: groundY - 20,
          size: 10,
          damage: 0,
          color: 'lime',
          speed: 10, // Increased speed for defense missile
          target: p
        };
        counterProjectiles.push(counter);
        defenseCooldown = true;
        setTimeout(() => defenseCooldown = false, 1000);
      }

      if (p.t >= 1) {
        explosion = { x: p.x + p.size / 2, y: p.y + p.size / 2, radius: 10, frames: 10 };
        if (leftSquare.hp > 0) {
          leftSquare.hp = Math.max(0, leftSquare.hp - p.damage);
        }
        projectiles.splice(i, 1);
      }
    }
  }

  // Handle counterProjectiles and collision detection
  for (let i = counterProjectiles.length - 1; i >= 0; i--) {
    const cp = counterProjectiles[i];
    // If target is gone, remove the counter projectile
    if (!cp.target || !projectiles.includes(cp.target)) {
      counterProjectiles.splice(i, 1);
      continue;
    }

    // Move towards the target
    const dx = cp.target.x - cp.x;
    const dy = cp.target.y - cp.y;
    const dist = Math.hypot(dx, dy);

    // Detect collision in mid-air and remove both missiles
    if (dist < (cp.size + cp.target.size) / 2 + 2) {
      // Remove the incoming missile
      const targetIndex = projectiles.indexOf(cp.target);
      if (targetIndex !== -1) projectiles.splice(targetIndex, 1);
      // Remove the counter missile
      counterProjectiles.splice(i, 1);
      // Add explosion effect at collision point
      explosion = {
        x: (cp.x + cp.target.x) / 2,
        y: (cp.y + cp.target.y) / 2,
        radius: 10,
        frames: 10
      };
      continue;
    }

    cp.x += (dx / dist) * cp.speed;
    cp.y += (dy / dist) * cp.speed;
  }

  requestAnimationFrame(update);
}

function shoot(damage, size, color, fromLeft = false) {
  if (fromLeft) {
    // Enemy shoots to the right
    projectiles.push({
      x: leftSquare.x + leftSquare.size,
      y: leftSquare.y + leftSquare.size / 2 - size / 2,
      size: size,
      damage: damage,
      color: color,
      t: 0,
      fromLeft: true
    });
  } else {
    // Player shoots to the left
    projectiles.push({
      x: rightSquare.x,
      y: rightSquare.y + rightSquare.size / 2 - size / 2,
      size: size,
      damage: damage,
      color: color,
      t: 0
    });
  }
}

function handleBigShoot() {
  if (bigMissileCooldown) return;
  shoot(10, 20, 'orange');
  bigMissileCooldown = true;
  const btn = document.getElementById('bigBtn');
  btn.disabled = true;
  cooldownBar.style.display = 'block';
  let elapsed = 0;
  cooldownProgress.style.width = '100%';
  bigCooldownInterval = setInterval(() => {
    elapsed += 100;
    const percent = Math.max(0, 100 - (elapsed / 5000) * 100);
    cooldownProgress.style.width = percent + '%';
    if (elapsed >= 5000) {
      clearInterval(bigCooldownInterval);
      bigMissileCooldown = false;
      btn.disabled = false;
      cooldownBar.style.display = 'none';
    }
  }, 100);
}

function handleSmallShoot() {
  const now = Date.now();
  if (smallMissileCooldown) return;
  if (now - lastSmallShotTime > SMALL_SHOT_INTERVAL) smallShotCount = 0;
  shoot(5, 10, 'cyan');
  lastSmallShotTime = now;
  smallShotCount++;
  if (smallShotCount >= MAX_SMALL_SHOTS) {
    smallMissileCooldown = true;
    const btn = document.getElementById('smallBtn');
    btn.disabled = true;
    smallCooldownBar.style.display = 'block';
    let elapsed = 0;
    smallCooldownProgress.style.width = '100%';
    smallCooldownInterval = setInterval(() => {
      elapsed += 100;
      const percent = Math.max(0, 100 - (elapsed / 2000) * 100);
      smallCooldownProgress.style.width = percent + '%';
      if (elapsed >= 2000) {
        clearInterval(smallCooldownInterval);
        smallMissileCooldown = false;
        btn.disabled = false;
        smallCooldownBar.style.display = 'none';
        smallShotCount = 0;
      }
    }, 100);
  }
}

// Enemy auto-shoot logic
function enemyAutoShoot() {
  const cooldown = 1000 + Math.random() * 1000; // 1-2 seconds
  const missileCount = 1 + Math.floor(Math.random() * 4); // 1-4 missiles
  let launched = 0;
  function launchMissile() {
    // Randomly choose missile type: 5 or 10 damage
    const isBig = Math.random() < 0.5;
    if (isBig) {
      shoot(10, 20, 'yellow', true); // Big missile: 10 damage, larger size, yellow
    } else {
      shoot(5, 10, 'magenta', true); // Small missile: 5 damage, smaller size, magenta
    }
    launched++;
    if (launched < missileCount) {
      setTimeout(launchMissile, 250); // 0.25s between each missile
    }
  }
  setTimeout(() => {
    launchMissile();
    setTimeout(enemyAutoShoot, cooldown);
  }, cooldown);
}

window.handleSmallShoot = handleSmallShoot;
window.handleBigShoot = handleBigShoot;
window.restartGame = restartGame;

update();
enemyAutoShoot();
