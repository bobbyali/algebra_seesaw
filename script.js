// Algebra Seesaw App

// ─── Game State ────────────────────────────────────────────────────────────
let gameState = {
  currentEquation: null,
  solved: false,
  questionsAttempted: 0,
  solvedCount: 0,
  leftOp: "+",
  rightOp: "+",
};

// ─── DOM Elements ───────────────────────────────────────────────────────────
let elements = {};

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  elements = {
    leftWeight: document.getElementById("left-weight"),
    rightWeight: document.getElementById("right-weight"),
    seesawArm: document.getElementById("seesaw-arm"),
    balanceIndicator: document.getElementById("balance-indicator"),
    leftValue: document.getElementById("left-value"),
    rightValue: document.getElementById("right-value"),
    goButton: document.getElementById("go-button"),
    resetButton: document.getElementById("reset-button"),
    message: document.getElementById("message"),
    currentEquation: document.getElementById("current-equation"),
    questionsAttempted: document.getElementById("questions-attempted"),
    solvedCount: document.getElementById("solved-count"),
    difficultySelect: document.getElementById("difficulty-select"),
  };

  // Operator button groups
  document.querySelectorAll(".op-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const side = btn.dataset.side; // "left" or "right"
      // Deactivate siblings
      document.querySelectorAll(`.op-btn[data-side="${side}"]`).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // Track in state
      if (side === "left") gameState.leftOp = btn.dataset.op;
      else gameState.rightOp = btn.dataset.op;
    });
  });

  elements.goButton.addEventListener("click", handleGoButtonClick);
  elements.resetButton.addEventListener("click", () => {
    generateNewEquation();
    updateDisplay();
  });

  // Changing difficulty instantly generates a new problem at that level
  elements.difficultySelect.addEventListener("change", () => {
    generateNewEquation();
    updateDisplay();
  });

  generateNewEquation();
  updateDisplay();
});

// ─── Equation Generation ─────────────────────────────────────────────────────
// Apply a colour theme to the equation box based on current difficulty
function updateDifficultyTheme() {
  const box = document.querySelector(".equation-display");
  if (!box) return;
  box.classList.remove("difficulty-easy", "difficulty-medium", "difficulty-hard");
  const diff = elements.difficultySelect ? elements.difficultySelect.value : "medium";
  box.classList.add(`difficulty-${diff}`);
}

function generateNewEquation() {
  gameState.solved = false;
  resetInputs();
  updateDifficultyTheme();

  const difficulty = elements.difficultySelect
    ? elements.difficultySelect.value
    : "medium";

  if (difficulty === "easy") {
    // Single operation to solve: x + b = c  OR  x - b = c
    const b = getRandomInt(1, 9);
    const xVal = getRandomInt(1, 9);
    const useAdd = Math.random() < 0.5;
    gameState.currentEquation = {
      left: useAdd ? `x + ${b}` : `x - ${b}`,
      right: useAdd ? xVal + b : xVal - b,
    };

  } else if (difficulty === "medium") {
    // Two operations to solve: ax + b = c  (a=2..3, small numbers)
    const a = getRandomInt(2, 3);
    const b = getRandomInt(1, 9);
    const xVal = getRandomInt(2, 9);
    const c = a * xVal + b;
    const sign = Math.random() < 0.5 ? "+" : "-";
    const bSigned = sign === "+" ? b : -b;
    gameState.currentEquation = {
      left: sign === "+" ? `${a}x + ${b}` : `${a}x - ${b}`,
      right: a * xVal + bSigned,
    };

  } else {
    // Hard: three operations to solve: ax + b = c  (a=3..9, larger numbers)
    // Student must: subtract b, then divide by a (two visible steps, but with bigger numbers)
    // We deliberately make coefficients and constants larger (double-digit range)
    const a = getRandomInt(4, 12);
    const b = getRandomInt(10, 50);
    const xVal = getRandomInt(5, 20);
    const sign = Math.random() < 0.5 ? "+" : "-";
    const bVal = sign === "+" ? b : -b;
    gameState.currentEquation = {
      left: sign === "+" ? `${a}x + ${b}` : `${a}x - ${b}`,
      right: a * xVal + bVal,
    };
  }

  resetSeesaw();
}

// ─── Expression Simplification ────────────────────────────────────────────────
// Parse an algebraic expression of the form: [coeff]x [+/-] [constant]
// Returns { coeff, constant } numbers, or null if not parseable.
function parseExpr(expr) {
  const s = expr.toString().trim();
  // Match forms like: x, -x, 2x, -3x, x + 5, 3x - 7, -2x + 10, etc.
  // Group 1: optional leading sign + coefficient + 'x'
  // Group 2: optional constant part  (sign + number)
  const re = /^([+-]?\s*\d*)\s*x\s*([+-]\s*\d+)?$/;
  const m = s.replace(/\s+/g, " ").match(/^([+-]?\s*\d*)\s*x\s*([+-]\s*\d+)?$/);
  if (!m) return null;

  let coeff = 1;
  const rawCoeff = m[1].replace(/\s/g, "");
  if (rawCoeff === "" || rawCoeff === "+") coeff = 1;
  else if (rawCoeff === "-") coeff = -1;
  else coeff = parseFloat(rawCoeff);

  let constant = 0;
  if (m[2]) {
    constant = parseFloat(m[2].replace(/\s/g, ""));
  }

  return { coeff, constant };
}

// Format a parsed expr back into a friendly string like "3x + 5", "x - 2", "x"
function formatExpr(coeff, constant) {
  let left = "";
  if (coeff === 1) left = "x";
  else if (coeff === -1) left = "-x";
  else left = `${coeff}x`;

  if (constant === 0) return left;
  if (constant > 0) return `${left} + ${constant}`;
  return `${left} - ${Math.abs(constant)}`;
}

// Apply operation to an algebraic expression, simplifying constants
function applyOperationAlgebraic(expr, op, value) {
  const parsed = parseExpr(expr);
  if (!parsed) {
    // Fallback: just append (shouldn't happen with generated equations)
    return `${expr} ${op} ${value}`;
  }

  let { coeff, constant } = parsed;

  if (op === "+") {
    constant += value;
  } else if (op === "-") {
    constant -= value;
  } else if (op === "*") {
    coeff *= value;
    constant *= value;
  } else if (op === "/") {
    if (value === 0) return expr; // guard
    // Only divide if it divides evenly
    if (coeff % value === 0 && constant % value === 0) {
      coeff /= value;
      constant /= value;
    } else {
      // Show fraction form for non-clean division
      return `(${expr}) ÷ ${value}`;
    }
  }

  return formatExpr(coeff, constant);
}

// Apply operation to a pure numeric expression (the right side)
function applyOperationNumeric(expr, op, value) {
  const num = parseFloat(expr);
  if (isNaN(num)) return expr;
  switch (op) {
    case "+": return (num + value).toString();
    case "-": return (num - value).toString();
    case "*": return (num * value).toString();
    case "/": return value === 0 ? expr : (num / value).toString();
    default: return expr;
  }
}

// ─── Seesaw ──────────────────────────────────────────────────────────────────
function resetSeesaw() {
  elements.seesawArm.style.transition = "transform 0.5s ease";
  elements.seesawArm.style.transform = "rotate(0deg)";
  elements.balanceIndicator.textContent = "⚖️ Balanced";
  elements.balanceIndicator.className = "balance-indicator";
}

// Two-phase animation: tip one side randomly, then rebalance
function animateSeesawBalance() {
  // Randomly tip left or right first
  const tilt = Math.random() < 0.5 ? -12 : 12;
  elements.seesawArm.style.transition = "transform 0.4s ease";
  elements.seesawArm.style.transform = `rotate(${tilt}deg)`;

  // Phase 2: rebalance
  setTimeout(() => {
    elements.seesawArm.style.transition = "transform 0.5s ease";
    elements.seesawArm.style.transform = "rotate(0deg)";
  }, 500);
}

// ─── Input Helpers ───────────────────────────────────────────────────────────
function resetInputs() {
  // Reset operator buttons to "+"
  document.querySelectorAll(".op-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.op === "+");
  });
  gameState.leftOp = "+";
  gameState.rightOp = "+";

  // Reset values to 0
  if (elements.leftValue) elements.leftValue.value = "0";
  if (elements.rightValue) elements.rightValue.value = "0";

  showMessage("Enter operations on both sides and click Go!", "info");
}

function validateInputs() {
  const leftVal = elements.leftValue.value.trim();
  const rightVal = elements.rightValue.value.trim();

  if (leftVal === "" || isNaN(leftVal)) {
    showMessage("Please enter a number on the left side.", "error");
    return false;
  }
  if (rightVal === "" || isNaN(rightVal)) {
    showMessage("Please enter a number on the right side.", "error");
    return false;
  }
  return true;
}

// ─── Go Button Handler ────────────────────────────────────────────────────────
function handleGoButtonClick() {
  if (!validateInputs()) return;

  const leftOp = gameState.leftOp;
  const rightOp = gameState.rightOp;
  const leftVal = parseFloat(elements.leftValue.value);
  const rightVal = parseFloat(elements.rightValue.value);

  // Balance check: same op and value on both sides
  const isBalanced = leftOp === rightOp && leftVal === rightVal;

  if (!isBalanced) {
    elements.seesawArm.style.transition = "transform 0.4s ease";
    elements.seesawArm.style.transform = "rotate(15deg)";
    elements.balanceIndicator.textContent = "⚠️ Not Balanced!";
    elements.balanceIndicator.className = "balance-indicator error";
    showMessage("❌ Oops! You must do the same thing to both sides. Try again!", "error");

    setTimeout(() => {
      resetInputs();
      updateDisplay();
      elements.seesawArm.style.transition = "transform 0.5s ease";
      elements.seesawArm.style.transform = "rotate(0deg)";
      elements.balanceIndicator.textContent = "⚖️ Balanced";
      elements.balanceIndicator.className = "balance-indicator";
    }, 2000);
    return;
  }

  // Division by zero guard
  if (leftOp === "/" && leftVal === 0) {
    showMessage("❌ You cannot divide by zero!", "error");
    return;
  }

  // Apply operations
  const leftExpr = gameState.currentEquation.left.toString();
  const rightExpr = gameState.currentEquation.right.toString();

  const newLeft = leftExpr.includes("x")
    ? applyOperationAlgebraic(leftExpr, leftOp, leftVal)
    : applyOperationNumeric(leftExpr, leftOp, leftVal);

  const newRight = applyOperationNumeric(rightExpr, rightOp, rightVal);

  // Update state
  gameState.currentEquation.left = newLeft;
  gameState.currentEquation.right = newRight;

  // Seesaw animation (tip then rebalance)
  animateSeesawBalance();

  // Check for win: x isolated (e.g. "x", "-x", "2x" where coeff is 1 and const is 0)
  const parsed = parseExpr(newLeft.toString().trim());
  const isXIsolated = parsed && parsed.constant === 0 && Math.abs(parsed.coeff) === 1;

  if (isXIsolated) {
    const xValue = parsed.coeff === 1 ? parseFloat(newRight) : -parseFloat(newRight);
    gameState.solvedCount++;
    gameState.questionsAttempted++;

    setTimeout(() => {
      elements.balanceIndicator.textContent = "🎉 Solved!";
      elements.balanceIndicator.className = "balance-indicator solved";
      showMessage(`🎉 Amazing! x = ${xValue}. You solved it!`, "success");
      updateDisplay();
    }, 600);

    setTimeout(() => {
      generateNewEquation();
      updateDisplay();
      resetSeesaw();
    }, 3600);
    return;
  }

  // Balanced, not yet solved
  setTimeout(() => {
    elements.balanceIndicator.textContent = "⚖️ Perfectly Balanced!";
    elements.balanceIndicator.className = "balance-indicator success";
    showMessage("✅ Great! Equation is still balanced. Keep going!", "success");
    updateDisplay();
  }, 600);
}

// ─── Display ─────────────────────────────────────────────────────────────────
function updateDisplay() {
  if (gameState.currentEquation) {
    const leftStr = gameState.currentEquation.left.toString();
    const rightStr = gameState.currentEquation.right.toString();
    elements.currentEquation.textContent = `${leftStr} = ${rightStr}`;
    elements.leftWeight.textContent = leftStr;
    elements.rightWeight.textContent = rightStr;
  }
  elements.questionsAttempted.textContent = gameState.questionsAttempted || "0";
  elements.solvedCount.textContent = gameState.solvedCount || "0";
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function showMessage(text, type) {
  elements.message.textContent = text;
  elements.message.className = `message ${type}`;
  setTimeout(() => {
    if (elements.message.textContent === text) {
      elements.message.textContent = "";
      elements.message.className = "message";
    }
  }, type === "error" ? 2500 : type === "success" ? 4000 : 2000);
}
