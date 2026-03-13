// Algebra Seesaw App - AST/Object Based Edition

// ─── Game State ────────────────────────────────────────────────────────────
// Expressions are now structured objects, not strings.
// A left-side AST object looks like: { coeff: 1, constant: 3, multiplier: 1, divisor: 1 }
// representing: multiplier * (coeff*x + constant) / divisor
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
function updateDifficultyTheme() {
  const box = document.querySelector(".equation-display");
  if (!box) return;
  box.classList.remove("difficulty-easy", "difficulty-medium", "difficulty-hard", "difficulty-very-hard");
  const diff = elements.difficultySelect ? elements.difficultySelect.value : "medium";
  box.classList.add(`difficulty-${diff}`);
}

// AST constructor helper
function createAST(coeff, constant, multiplier = 1, divisor = 1) {
  return { coeff, constant, multiplier, divisor };
}

function generateNewEquation() {
  gameState.solved = false;
  resetInputs();
  updateDifficultyTheme();

  const difficulty = elements.difficultySelect ? elements.difficultySelect.value : "medium";

  let leftAst, rightVal;

  if (difficulty === "easy") {
    // Single operation: x + b = c
    const b = getRandomInt(1, 9);
    const xVal = getRandomInt(1, 9);
    const useAdd = Math.random() < 0.5;

    leftAst = createAST(1, useAdd ? b : -b);
    rightVal = useAdd ? xVal + b : xVal - b;
  }
  else if (difficulty === "medium") {
    // Two operations: ax + b = c
    const a = getRandomInt(2, 4);
    const b = getRandomInt(1, 9);
    const xVal = getRandomInt(2, 9);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const bSigned = sign * b;

    leftAst = createAST(a, bSigned);
    rightVal = a * xVal + bSigned;
  }
  else if (difficulty === "hard") {
    // Hard: ax + b = c (larger numbers)
    const a = getRandomInt(4, 12);
    const b = getRandomInt(10, 50);
    const xVal = getRandomInt(5, 20);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const bSigned = sign * b;

    leftAst = createAST(a, bSigned);
    rightVal = a * xVal + bSigned;
  }
  else if (difficulty === "very-hard") {
    // Very Hard: a(cx + b) = d  OR  (cx + b)/a = d
    const isFraction = Math.random() < 0.5;
    const a = getRandomInt(3, 8); // outer multiplier or divisor
    const c = getRandomInt(2, 5); // inner coefficient for x
    const b = getRandomInt(5, 25); // inner constant
    const xVal = getRandomInt(3, 15);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const bSigned = sign * b;

    // Inner expression is (cx ± b)
    const innerVal = c * xVal + bSigned;

    if (isFraction) {
      // (cx ± b) / a = d
      leftAst = createAST(c, bSigned, 1, a);
      rightVal = innerVal / a;
      // If division doesn't yield whole number, tweak b so it does
      if (innerVal % a !== 0) {
        const remainder = innerVal % a;
        const adjustment = remainder > 0 ? (a - remainder) : -(a + remainder);
        const newInner = innerVal + adjustment;
        rightVal = newInner / a;
        leftAst = createAST(c, bSigned + adjustment, 1, a);
      }
    } else {
      // a(cx ± b) = d
      leftAst = createAST(c, bSigned, a, 1);
      rightVal = a * innerVal;
    }
  }

  gameState.currentEquation = {
    left: leftAst,
    right: rightVal, // Right side remains a simple number for the game scope
  };

  resetSeesaw();
}

// ─── Visual Rendering (AST to HTML string) ──────────────────────────────────
// Returns HTML string representing the AST or number
function renderExpression(expr) {
  // If it's just a number (the right side)
  if (typeof expr === "number") return expr.toString();
  if (typeof expr === "string") return expr;

  const { coeff, constant, multiplier, divisor } = expr;

  // Build the core inner term: e.g. "3x + 5" or "x - 2" or "x"
  let innerHtml = "";
  if (coeff === 1) innerHtml = "x";
  else if (coeff === -1) innerHtml = "-x";
  else if (coeff !== 0) innerHtml = `${coeff}x`;

  if (constant !== 0) {
    if (innerHtml === "") {
      innerHtml = constant.toString();
    } else {
      innerHtml += constant > 0 ? ` + ${constant}` : ` − ${Math.abs(constant)}`;
    }
  }

  if (innerHtml === "") innerHtml = "0"; // edge case: solved to 0?

  // Wrap with multiplier if needed
  let topHtml = innerHtml;
  if (multiplier !== 1) {
    topHtml = `<span class="expr-chunk">${multiplier}<span class="paren-expr">${innerHtml}</span></span>`;
  }

  // Wrap with division if needed
  if (divisor !== 1) {
    return `
      <div class="fraction">
        <div class="numerator">${topHtml}</div>
        <div class="fraction-line"></div>
        <div class="denominator">${divisor}</div>
      </div>
    `;
  }

  // No divisor
  return topHtml;
}

// ─── Math Operations on AST (with unwrapping constraint) ────────────────────
// Returns { success: boolean, newAst: object, error: string }
function applyOperationAlgebraic(ast, op, value) {
  let { coeff, constant, multiplier, divisor } = ast;

  if (op === "+") {
    if (divisor !== 1) return { success: false, error: "Clear the division first!" };
    if (multiplier !== 1) return { success: false, error: "Clear the multiplication first!" };
    constant += value;
  } else if (op === "-") {
    if (divisor !== 1) return { success: false, error: "Clear the division first!" };
    if (multiplier !== 1) return { success: false, error: "Clear the multiplication first!" };
    constant -= value;
  } else if (op === "*") {
    // If there is a divisor, and student is multiplying by that divisor, it clears
    if (divisor > 1) {
      if (value === divisor) {
        divisor = 1; // Unwrapped!
      } else if (divisor % value === 0) {
        divisor /= value; // Partial cancel
      } else {
        multiplier *= value; // Just piles on
      }
    } else {
      multiplier *= value;
      // Distribute immediately if just a coefficient and constant
      if (multiplier !== 1 && coeff % 1 === 0 && constant % 1 === 0) {
        coeff *= multiplier;
        constant *= multiplier;
        multiplier = 1;
      }
    }
  } else if (op === "/") {
    if (value === 0) return { success: false, error: "Cannot divide by zero!" };

    // If there is a multiplier, and student divides by it, it clears
    if (multiplier > 1) {
      if (value === multiplier) {
        multiplier = 1; // Unwrapped!
      } else if (multiplier % value === 0) {
        multiplier /= value; // Partial cancel
      } else {
        divisor *= value;
      }
    } else {
      // Divide everything directly if it divides evenly
      if (coeff % value === 0 && constant % value === 0) {
        coeff /= value;
        constant /= value;
      } else {
        // Stack a fraction
        divisor *= value;
      }
    }
  }

  return {
    success: true,
    newAst: createAST(coeff, constant, multiplier, divisor)
  };
}

// ─── Input Helpers ───────────────────────────────────────────────────────────
function resetInputs() {
  document.querySelectorAll(".op-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.op === "+");
  });
  gameState.leftOp = "+";
  gameState.rightOp = "+";
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

// ─── Seesaw ──────────────────────────────────────────────────────────────────
function resetSeesaw() {
  elements.seesawArm.style.transition = "transform 0.5s ease";
  elements.seesawArm.style.transform = "rotate(0deg)";
  elements.balanceIndicator.textContent = "⚖️ Balanced";
  elements.balanceIndicator.className = "balance-indicator";
}

function animateSeesawBalance() {
  const tilt = Math.random() < 0.5 ? -12 : 12;
  elements.seesawArm.style.transition = "transform 0.4s ease";
  elements.seesawArm.style.transform = `rotate(${tilt}deg)`;
  setTimeout(() => {
    elements.seesawArm.style.transition = "transform 0.5s ease";
    elements.seesawArm.style.transform = "rotate(0deg)";
  }, 500);
}

// ─── Go Button Handler ────────────────────────────────────────────────────────
function handleGoButtonClick() {
  if (!validateInputs()) return;

  const leftOp = gameState.leftOp;
  const rightOp = gameState.rightOp;
  const leftVal = parseFloat(elements.leftValue.value);
  const rightVal = parseFloat(elements.rightValue.value);

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

  if (leftOp === "/" && leftVal === 0) {
    showMessage("❌ You cannot divide by zero!", "error");
    return;
  }

  // Attempt the operation on the AST
  const leftResult = applyOperationAlgebraic(gameState.currentEquation.left, leftOp, leftVal);

  // Guard the unwrapping constraint
  if (!leftResult.success) {
    showMessage(`❌ ${leftResult.error}`, "error");
    return;
  }

  // Apply to right side
  let rightExpr = gameState.currentEquation.right;
  if (rightOp === "+") rightExpr += rightVal;
  else if (rightOp === "-") rightExpr -= rightVal;
  else if (rightOp === "*") rightExpr *= rightVal;
  else if (rightOp === "/") rightExpr /= rightVal;

  // Update state
  gameState.currentEquation.left = leftResult.newAst;
  gameState.currentEquation.right = rightExpr;

  animateSeesawBalance();

  // Check for win condition: is the LHS just x? (coeff=±1, const=0, mult=1, div=1)
  const ast = gameState.currentEquation.left;
  const isXIsolated = Math.abs(ast.coeff) === 1 && ast.constant === 0 && ast.multiplier === 1 && ast.divisor === 1;

  if (isXIsolated) {
    const xValue = ast.coeff === 1 ? rightExpr : -rightExpr;
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

  // Balanced, go on
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
    const leftHtml = renderExpression(gameState.currentEquation.left);
    const rightHtml = renderExpression(gameState.currentEquation.right);

    // We update innerHTML now because the fractions use DOM elements
    elements.currentEquation.innerHTML = `${leftHtml} <div class="equals-sign" style="margin: 0 10px;">=</div> ${rightHtml}`;
    elements.leftWeight.innerHTML = leftHtml;
    elements.rightWeight.innerHTML = rightHtml;
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
