class DiceRoller {
    constructor() {
        this.selectedPolyhedral = null;
        this.pipDiceCount = 0;
        this.rollHistory = [];
        this.currentPipResults = [];
        this.selectedPipDice = new Set();
        this.bindEvents();
        this.loadHistory();
        this.initializeTheme();
    }

    bindEvents() {
        // Polyhedral die selection
        document.querySelectorAll('.poly-option').forEach(option => {
            option.addEventListener('click', () => {
                const sides = parseInt(option.dataset.sides);
                this.selectPolyhedral(sides, option);
            });
        });

        // Pip dice counter buttons
        document.getElementById('pip-decrease').addEventListener('click', () => this.decreasePipDice());
        document.getElementById('pip-increase').addEventListener('click', () => this.increasePipDice());

        // Roll button
        document.getElementById('roll-btn').addEventListener('click', () => this.rollDice());

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => this.clearAll());

        // Clear history button
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());

        // Export history button
        document.getElementById('export-history').addEventListener('click', () => this.exportHistory());

        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        } else {
            console.error('Theme toggle button not found!');
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isTypingTarget(e.target)) {
                return;
            }

            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.rollDice();
            }
            if (e.code === 'Escape') {
                this.clearAll();
            }
            // Toggle theme with 'T' key
            if (e.code === 'KeyT' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    isTypingTarget(target) {
        if (!target) {
            return false;
        }

        const tagName = target.tagName ? target.tagName.toLowerCase() : '';
        return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
    }

    selectPolyhedral(sides, element) {
        // Remove previous selection
        document.querySelectorAll('.poly-option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selection to clicked element
        element.classList.add('selected');
        this.selectedPolyhedral = sides;

        // Update display
        document.getElementById('selected-poly').innerHTML = `<span>Selected: d${sides}</span>`;
    }

    increasePipDice() {
        if (this.pipDiceCount < 20) {
            this.pipDiceCount++;
            this.updatePipDiceDisplay();
        }
    }

    decreasePipDice() {
        if (this.pipDiceCount > 0) {
            this.pipDiceCount--;
            this.updatePipDiceDisplay();
        }
    }

    updatePipDiceDisplay() {
        const countElement = document.getElementById('pip-count');
        countElement.textContent = this.pipDiceCount;
        
        // Add visual feedback
        countElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            countElement.style.transform = 'scale(1)';
        }, 150);
    }



    rollDice() {
        let totalSum = 0;
        let polyResult = null;
        let pipResults = [];
        let hasActiveDice = false;

        // Roll polyhedral die (first roll only, explosions handled sequentially)
        if (this.selectedPolyhedral) {
            hasActiveDice = true;
            polyResult = [];
            let roll = Math.floor(Math.random() * this.selectedPolyhedral) + 1;
            polyResult.push(roll);
            if (roll !== 1) {
                totalSum += roll;
            }
        }

        // Roll pip dice
        if (this.pipDiceCount > 0) {
            hasActiveDice = true;
            for (let i = 0; i < this.pipDiceCount; i++) {
                const roll = Math.floor(Math.random() * 6) + 1;
                pipResults.push(roll);
                if (roll !== 1) {
                    totalSum += roll;
                }
            }
        }

        // Store current results and reset selections
        this.currentPipResults = pipResults;
        this.lastPolyResult = polyResult;
        this.selectedPipDice.clear();

        if (!hasActiveDice) {
            this.showMessage("Please select dice to roll!");
            return;
        }

        // Display results
        this.displayRoll(polyResult, pipResults, totalSum);

        // Visual feedback
        this.animateRoll();
        
        // Add to history after roll completes
        this.addToHistoryAfterRoll(polyResult, pipResults, totalSum);
    }

    displayRoll(polyResult, pipResults, total) {
        // Display first polyhedral die only (explosions added sequentially)
        const polyDisplay = document.getElementById('poly-dice-display');
        polyDisplay.innerHTML = '';
        
        if (polyResult !== null && polyResult.length > 0) {
            // Only show the first die initially
            const polyVisual = this.createPolyhedralVisual(this.selectedPolyhedral, polyResult[0]);
            polyDisplay.appendChild(polyVisual);
        }

        // Display pip dice results
        const pipDisplay = document.getElementById('pip-dice-display');
        pipDisplay.innerHTML = '';
        
        pipResults.forEach((result, index) => {
            const pipDie = this.createPipDie(result, index);
            pipDisplay.appendChild(pipDie);
        });

        // Display total (will be updated by recalculateTotal)
        const totalElement = document.getElementById('roll-total');
        totalElement.textContent = `Total: ${total}`;
        
        // Calculate and display ones count and doubles
        this.updateDoublesCount();
        this.updateOnesCount();
        this.recalculateTotal();
        
        // Add special styling for critical results
        totalElement.className = 'total';
        if (this.isCriticalRoll(polyResult)) {
            totalElement.classList.add('critical-success');
        } else if (this.isCriticalFailure(polyResult)) {
            totalElement.classList.add('critical-failure');
        }
    }

    createPolyhedralVisual(sides, value) {
        const container = document.createElement('div');
        container.className = 'poly-dice-visual';
        if (value === 1) {
            container.classList.add('excluded-die');
        }
        
        const shape = document.createElement('div');
        shape.className = `poly-result-shape result-d${sides}`;
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'poly-result-value';
        valueDisplay.textContent = value;
        
        container.appendChild(shape);
        container.appendChild(valueDisplay);
        
        return container;
    }

    createPipDie(value, index) {
        const die = document.createElement('div');
        die.className = 'pip-die';
        die.setAttribute('data-value', value);
        die.setAttribute('data-index', index);
        
        if (value === 1) {
            die.classList.add('excluded-die');
        } else if (value >= 4) {
            die.classList.add('selectable-die');
            die.addEventListener('click', () => this.togglePipDieSelection(index));
        }
        
        // Always create exactly 9 pip positions for the 3x3 grid
        for (let i = 1; i <= 9; i++) {
            const pip = document.createElement('div');
            pip.className = 'pip';
            die.appendChild(pip);
        }
        
        return die;
    }

    isCriticalRoll(polyResult) {
        // Check if this is a critical success (max on polyhedral die)
        return polyResult !== null && polyResult.length > 0 && polyResult[0] === this.selectedPolyhedral;
    }

    isCriticalFailure(polyResult) {
        // Check if this is a critical failure (1 on polyhedral die)
        return polyResult !== null && polyResult.length > 0 && polyResult[0] === 1 && this.selectedPolyhedral === 20;
    }

    togglePipDieSelection(index) {
        const die = document.querySelector(`[data-index="${index}"]`);
        if (!die) return;

        if (this.selectedPipDice.has(index)) {
            // Deselect
            this.selectedPipDice.delete(index);
            die.classList.remove('selected-die');
        } else {
            // Select
            this.selectedPipDice.add(index);
            die.classList.add('selected-die');
        }

        this.recalculateTotal();
        this.updateLatestHistoryEntry();
    }

    updateDoublesCount() {
        let hasDoubles = false;
        
        // Get all dice results
        const polyResults = Array.isArray(this.lastPolyResult) ? this.lastPolyResult : [];
        const pipResults = this.currentPipResults || [];
        
        // Check if any polyhedral dice match any pip dice (excluding 1s)
        polyResults.forEach(polyValue => {
            pipResults.forEach(pipValue => {
                if (polyValue === pipValue && polyValue !== 1) {
                    hasDoubles = true;
                }
            });
        });
        
        // Check if any pip dice match each other (excluding 1s)
        for (let i = 0; i < pipResults.length; i++) {
            for (let j = i + 1; j < pipResults.length; j++) {
                if (pipResults[i] === pipResults[j] && pipResults[i] !== 1) {
                    hasDoubles = true;
                }
            }
        }
        
        // Check if any polyhedral dice match each other (including exploded dice, excluding 1s)
        for (let i = 0; i < polyResults.length; i++) {
            for (let j = i + 1; j < polyResults.length; j++) {
                if (polyResults[i] === polyResults[j] && polyResults[i] !== 1) {
                    hasDoubles = true;
                }
            }
        }
        
        // Update doubles display
        const doublesElement = document.getElementById('doubles-count');
        if (hasDoubles) {
            doublesElement.textContent = 'Doubles Rolled: Generate Experience';
        } else {
            doublesElement.textContent = '';
        }
    }

    updateOnesCount() {
        let onesCount = 0;
        
        // Count ones from polyhedral dice
        const polyResults = Array.isArray(this.lastPolyResult) ? this.lastPolyResult : [];
        polyResults.forEach(result => {
            if (result === 1) {
                onesCount++;
            }
        });
        
        // Count ones from pip dice
        this.currentPipResults.forEach(result => {
            if (result === 1) {
                onesCount++;
            }
        });
        
        // Update ones display
        const onesElement = document.getElementById('ones-count');
        if (onesCount > 0) {
            onesElement.textContent = `Take ${onesCount} Composure/Weariness`;
        } else {
            onesElement.textContent = '';
        }
    }

    recalculateTotal() {
        let total = 0;

        // Add polyhedral dice (already calculated, excluding 1s)
        if (this.selectedPolyhedral && this.currentPipResults.length === 0) {
            // If we only have polyhedral dice, use the original calculation
            return;
        }

        // Recalculate from current results
        const polyResults = Array.isArray(this.lastPolyResult) ? this.lastPolyResult : [];
        polyResults.forEach(result => {
            if (result !== 1) {
                total += result;
            }
        });

        // Add pip dice (excluding 1s and selected dice)
        this.currentPipResults.forEach((result, index) => {
            if (result !== 1 && !this.selectedPipDice.has(index)) {
                total += result;
            }
        });

        // Update display
        const totalElement = document.getElementById('roll-total');
        const selectedCount = this.selectedPipDice.size;
        let totalText = `Total: ${total}`;
        if (selectedCount > 0) {
            totalText += ` (${selectedCount} pip dice spent)`;
        }
        totalElement.textContent = totalText;
        
        // Update doubles and ones count
        this.updateDoublesCount();
        this.updateOnesCount();
    }

    addToHistory(polyResult, pipResults, total) {
        const timestamp = new Date().toLocaleTimeString();
        let formula = '';
        
        if (polyResult !== null && polyResult.length > 0) {
            formula += `d${this.selectedPolyhedral}`;
            if (polyResult.length > 1) {
                formula += ` (exploded ${polyResult.length} times)`;
            }
        }
        
        if (pipResults.length > 0) {
            if (formula) formula += ' + ';
            formula += `${pipResults.length}d6 (pips)`;
        }

        // Calculate additional roll details
        const hasDoubles = this.calculateDoubles(polyResult, pipResults);
        const onesCount = this.calculateOnesCount(polyResult, pipResults);
        const selectedPipCount = this.selectedPipDice.size;
        const finalTotal = this.calculateFinalTotal(polyResult, pipResults);

        const historyItem = {
            formula: formula || 'No dice rolled',
            polyResult: polyResult,
            pipResults: pipResults,
            total: total,
            finalTotal: finalTotal,
            hasDoubles: hasDoubles,
            onesCount: onesCount,
            selectedPipCount: selectedPipCount,
            timestamp: timestamp
        };

        this.rollHistory.unshift(historyItem);
        
        // Limit history to 50 items
        if (this.rollHistory.length > 50) {
            this.rollHistory.pop();
        }

        this.updateHistoryDisplay();
        this.saveHistory();
    }

    updateHistoryDisplay() {
        const historyContainer = document.getElementById('roll-history');
        historyContainer.innerHTML = '';

        this.rollHistory.forEach(item => {
            const historyDiv = document.createElement('div');
            historyDiv.className = 'history-item';
            
            // Build details string
            let detailsHtml = '';
            
            // Show final total (different from initial if pips were spent)
            const finalTotal = item.finalTotal !== undefined ? item.finalTotal : item.total;
            detailsHtml += `<div class="history-result">Final Total: ${finalTotal}</div>`;
            
            // Show if initial total was different
            if (item.selectedPipCount > 0 && item.total !== finalTotal) {
                detailsHtml += `<div class="history-initial-total">Initial Total: ${item.total}</div>`;
            }
            
            // Show pip spending
            if (item.selectedPipCount > 0) {
                detailsHtml += `<div class="history-pip-spent">🎯 ${item.selectedPipCount} pip dice spent</div>`;
            }
            
            // Show doubles
            if (item.hasDoubles) {
                detailsHtml += `<div class="history-doubles">⚡ Doubles rolled - Generate XP</div>`;
            }
            
            // Show ones count
            if (item.onesCount > 0) {
                detailsHtml += `<div class="history-ones">💔 ${item.onesCount} ones rolled - Take Composure/Weariness</div>`;
            }
            
            historyDiv.innerHTML = `
                <div class="history-timestamp">${item.timestamp}</div>
                <div class="history-formula">${item.formula}</div>
                ${detailsHtml}
            `;
            historyContainer.appendChild(historyDiv);
        });
    }

    clearAll() {
        // Reset polyhedral selection
        this.selectedPolyhedral = null;
        document.querySelectorAll('.poly-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.getElementById('selected-poly').innerHTML = '<span>No die selected</span>';

        // Reset pip dice count
        this.pipDiceCount = 0;
        document.getElementById('pip-count').textContent = '0';

        // Clear current roll display
        document.getElementById('poly-dice-display').innerHTML = '';
        document.getElementById('pip-dice-display').innerHTML = '';
        document.getElementById('roll-total').textContent = '';
        document.getElementById('doubles-count').textContent = '';
        document.getElementById('ones-count').textContent = '';

        this.showMessage("All dice cleared!");
    }

    clearHistory() {
        this.rollHistory = [];
        this.updateHistoryDisplay();
        this.saveHistory();
        this.showMessage("History cleared!");
    }

    exportHistory() {
        if (this.rollHistory.length === 0) {
            this.showMessage("No history to export!");
            return;
        }

        // Create formatted text output
        let exportText = "═══════════════════════════════════════════\n";
        exportText += "          BEAT SYSTEM DICE ROLLER\n";
        exportText += "              ROLL HISTORY\n";
        exportText += "═══════════════════════════════════════════\n";
        exportText += `Export Date: ${new Date().toLocaleString()}\n`;
        exportText += `Total Rolls: ${this.rollHistory.length}\n`;
        exportText += "═══════════════════════════════════════════\n\n";

        this.rollHistory.forEach((item, index) => {
            exportText += `ROLL #${this.rollHistory.length - index}\n`;
            exportText += `Time: ${item.timestamp}\n`;
            exportText += `Formula: ${item.formula}\n`;
            
            // Show final total (different from initial if pips were spent)
            const finalTotal = item.finalTotal !== undefined ? item.finalTotal : item.total;
            exportText += `Final Total: ${finalTotal}\n`;
            
            // Show if initial total was different
            if (item.selectedPipCount > 0 && item.total !== finalTotal) {
                exportText += `Initial Total: ${item.total}\n`;
            }
            
            // Show pip spending
            if (item.selectedPipCount > 0) {
                exportText += `🎯 ${item.selectedPipCount} pip dice spent\n`;
            }
            
            // Show doubles
            if (item.hasDoubles) {
                exportText += `⚡ Doubles rolled - Generate XP\n`;
            }
            
            // Show ones count
            if (item.onesCount > 0) {
                exportText += `💔 ${item.onesCount} ones rolled - Take Composure/Weariness\n`;
            }
            
            // Show detailed results
            if (item.polyResult && item.polyResult.length > 0) {
                exportText += `Foundation Die Results: ${item.polyResult.join(', ')}`;
                if (item.polyResult.length > 1) {
                    exportText += ` (exploded ${item.polyResult.length} times)`;
                }
                exportText += `\n`;
            }
            
            if (item.pipResults && item.pipResults.length > 0) {
                exportText += `Pip Dice Results: ${item.pipResults.join(', ')}\n`;
            }
            
            exportText += "─────────────────────────────────────────\n\n";
        });

        exportText += "═══════════════════════════════════════════\n";
        exportText += "        End of Roll History Export\n";
        exportText += "═══════════════════════════════════════════";

        // Create blob and download
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create temporary download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        
        // Generate filename with current date and time
        const now = new Date();
        const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeString = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        downloadLink.download = `dice-history-${dateString}-${timeString}.txt`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        this.showMessage(`History exported! (${this.rollHistory.length} rolls)`);
    }

    animateRoll() {
        const rollButton = document.getElementById('roll-btn');
        rollButton.style.transform = 'scale(0.95)';
        rollButton.style.background = 'linear-gradient(45deg, #4c546d, #8b7983)';
        
        setTimeout(() => {
            rollButton.style.transform = 'scale(1)';
            rollButton.style.background = 'linear-gradient(45deg, #6f687a, #a58d89)';
        }, 150);

        // Hide results during animation
        const totalElement = document.getElementById('roll-total');
        const doublesElement = document.getElementById('doubles-count');
        const onesElement = document.getElementById('ones-count');
        
        totalElement.style.opacity = '0';
        doublesElement.style.opacity = '0';
        onesElement.style.opacity = '0';

        // Animate selected polyhedral die
        if (this.selectedPolyhedral) {
            const selectedPoly = document.querySelector('.poly-option.selected');
            if (selectedPoly) {
                selectedPoly.style.transform = 'rotateY(360deg)';
                setTimeout(() => {
                    selectedPoly.style.transform = 'rotateY(0deg)';
                }, 300);
            }
        }

        // Start sequential polyhedral dice animation
        this.animatePolyhedralSequentially(0);

        // Animate pip dice display
        const pipDiceContainer = document.getElementById('pip-dice-display');
        if (pipDiceContainer.children.length > 0) {
            // Immediately hide all pip dice values
            Array.from(pipDiceContainer.children).forEach((die) => {
                die.classList.add('rolling');
            });
            
            Array.from(pipDiceContainer.children).forEach((die, index) => {
                setTimeout(() => {
                    die.style.animation = 'diceRoll 1s ease-in-out 2';
                    // Clear inline animation and rolling class after it completes
                    setTimeout(() => {
                        die.style.animation = '';
                        die.classList.remove('rolling');
                    }, 2000);
                }, index * 150);
            });
        }
    }

    animatePolyhedralSequentially(diceIndex) {
        const polyDisplay = document.getElementById('poly-dice-display');
        
        if (diceIndex === 0) {
            // First die - animate it
            if (polyDisplay.children.length > diceIndex) {
                const polyVisual = polyDisplay.children[diceIndex];
                polyVisual.classList.add('rolling');
                polyVisual.style.animation = 'polyhedralRoll 1s ease-in-out 2';
                
                setTimeout(() => {
                    polyVisual.style.animation = '';
                    polyVisual.classList.remove('rolling');
                    
                    // Update doubles count after initial die animation completes
                    this.updateDoublesCount();
                    
                    // Check if this die exploded and roll next if needed
                    const diceValue = this.lastPolyResult[diceIndex];
                    if (diceValue === this.selectedPolyhedral) {
                        this.rollAndAnimateExplodingDie(diceIndex + 1);
                    } else {
                        // No explosion, show final results with final doubles check
                        this.updateDoublesCount();
                        this.showFinalResults();
                    }
                }, 2000);
            } else {
                this.showFinalResults();
            }
        }
    }

    rollAndAnimateExplodingDie(diceIndex) {
        // Roll the exploding die
        const roll = Math.floor(Math.random() * this.selectedPolyhedral) + 1;
        this.lastPolyResult.push(roll);
        
        // Update total
        if (roll !== 1) {
            // Update the stored total and recalculate display
            this.updateTotalFromResults();
        }
        
        // Create visual for the new die
        const polyVisual = this.createPolyhedralVisual(this.selectedPolyhedral, roll);
        const polyDisplay = document.getElementById('poly-dice-display');
        polyDisplay.appendChild(polyVisual);
        
        // Animate the new die
        polyVisual.classList.add('rolling');
        polyVisual.style.animation = 'polyhedralRoll 1s ease-in-out 2';
        
        setTimeout(() => {
            polyVisual.style.animation = '';
            polyVisual.classList.remove('rolling');
            
            // Update doubles count after animation completes (important for exploded dice doubles)
            this.updateDoublesCount();
            
            // Check if this die also exploded
            if (roll === this.selectedPolyhedral) {
                this.rollAndAnimateExplodingDie(diceIndex + 1);
            } else {
                // No more explosions, show final results with final doubles check
                this.updateDoublesCount();
                this.showFinalResults();
            }
        }, 2000);
    }

    updateTotalFromResults() {
        // Recalculate and update displays based on current results
        this.updateDoublesCount();
        this.updateOnesCount();
        this.recalculateTotal();
    }

    calculateDoubles(polyResult, pipResults) {
        const polyResults = Array.isArray(polyResult) ? polyResult : [];
        const pipResultsArray = pipResults || [];
        
        // Check if any polyhedral dice match any pip dice (excluding 1s)
        for (let polyValue of polyResults) {
            for (let pipValue of pipResultsArray) {
                if (polyValue === pipValue && polyValue !== 1) {
                    return true;
                }
            }
        }
        
        // Check if any pip dice match each other (excluding 1s)
        for (let i = 0; i < pipResultsArray.length; i++) {
            for (let j = i + 1; j < pipResultsArray.length; j++) {
                if (pipResultsArray[i] === pipResultsArray[j] && pipResultsArray[i] !== 1) {
                    return true;
                }
            }
        }
        
        // Check if any polyhedral dice match each other (exploding dice, excluding 1s)
        for (let i = 0; i < polyResults.length; i++) {
            for (let j = i + 1; j < polyResults.length; j++) {
                if (polyResults[i] === polyResults[j] && polyResults[i] !== 1) {
                    return true;
                }
            }
        }
        
        return false;
    }

    calculateOnesCount(polyResult, pipResults) {
        let onesCount = 0;
        
        // Count ones from polyhedral dice
        const polyResults = Array.isArray(polyResult) ? polyResult : [];
        polyResults.forEach(result => {
            if (result === 1) {
                onesCount++;
            }
        });
        
        // Count ones from pip dice
        (pipResults || []).forEach(result => {
            if (result === 1) {
                onesCount++;
            }
        });
        
        return onesCount;
    }

    calculateFinalTotal(polyResult, pipResults) {
        let total = 0;

        // Add polyhedral dice (excluding 1s)
        const polyResults = Array.isArray(polyResult) ? polyResult : [];
        polyResults.forEach(result => {
            if (result !== 1) {
                total += result;
            }
        });

        // Add pip dice (excluding 1s and selected dice)
        (pipResults || []).forEach((result, index) => {
            if (result !== 1 && !this.selectedPipDice.has(index)) {
                total += result;
            }
        });

        return total;
    }

    updateLatestHistoryEntry() {
        // Update the most recent history entry when pip dice selection changes
        if (this.rollHistory.length > 0) {
            const latestEntry = this.rollHistory[0];
            latestEntry.selectedPipCount = this.selectedPipDice.size;
            latestEntry.finalTotal = this.calculateFinalTotal(latestEntry.polyResult, latestEntry.pipResults);
            
            this.updateHistoryDisplay();
            this.saveHistory();
        }
    }

    addToHistoryAfterRoll(polyResult, pipResults, totalSum) {
        // Calculate timing based on pip dice animation
        const pipDiceCount = pipResults.length;
        const pipAnimationTime = pipDiceCount > 0 ? 2000 : 1000; // Wait for animations
        
        setTimeout(() => {
            this.addToHistory(polyResult, pipResults, totalSum);
        }, pipAnimationTime);
    }

    showFinalResults() {
        // Calculate timing based on pip dice animation
        const pipDiceCount = this.currentPipResults.length;
        const pipAnimationTime = pipDiceCount > 0 ? 2000 : 0;
        
        setTimeout(() => {
            const totalElement = document.getElementById('roll-total');
            const doublesElement = document.getElementById('doubles-count');
            const onesElement = document.getElementById('ones-count');
            
            totalElement.style.opacity = '1';
            doublesElement.style.opacity = '1';
            onesElement.style.opacity = '1';
        }, Math.max(0, pipAnimationTime - 1700)); // Show results near end of pip animation
    }

    showMessage(message) {
        // Create temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(45deg, #8b7983, #6f687a);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'lexia', serif;
            font-weight: bold;
            z-index: 999;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            max-width: 300px;
            word-wrap: break-word;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        // Remove message after 3 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
                document.head.removeChild(style);
            }, 300);
        }, 3000);
    }

    saveHistory() {
        try {
            localStorage.setItem('diceRollerHistory', JSON.stringify(this.rollHistory));
        } catch (e) {
            console.warn('Could not save history to localStorage:', e);
        }
    }

    loadHistory() {
        try {
            const savedHistory = localStorage.getItem('diceRollerHistory');
            if (savedHistory) {
                this.rollHistory = JSON.parse(savedHistory);
                this.updateHistoryDisplay();
            }
        } catch (e) {
            console.warn('Could not load history from localStorage:', e);
            this.rollHistory = [];
        }
    }

    // Theme Management
    initializeTheme() {
        // Check for saved theme preference or default to 'dark'
        const savedTheme = localStorage.getItem('diceRollerTheme') || 'dark';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        let currentTheme = 'dark';
        if (document.body.classList.contains('light-mode')) {
            currentTheme = 'light';
        } else if (document.body.classList.contains('high-contrast-mode')) {
            currentTheme = 'high-contrast';
        }
        
        let newTheme;
        switch (currentTheme) {
            case 'dark':
                newTheme = 'light';
                break;
            case 'light':
                newTheme = 'high-contrast';
                break;
            case 'high-contrast':
                newTheme = 'dark';
                break;
            default:
                newTheme = 'dark';
        }
        
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        const body = document.body;
        const toggleButton = document.getElementById('theme-toggle');
        
        if (!toggleButton) {
            console.error('Theme toggle button not found in setTheme!');
            return;
        }
        
        const toggleIcon = toggleButton.querySelector('.theme-toggle-icon');
        const toggleText = toggleButton.querySelector('.theme-toggle-text');

        // Remove all theme classes first
        body.classList.remove('light-mode', 'high-contrast-mode');
        
        switch (theme) {
            case 'light':
                body.classList.add('light-mode');
                if (toggleIcon) toggleIcon.textContent = '☀️';
                if (toggleText) toggleText.textContent = 'Light Mode';
                break;
            case 'high-contrast':
                body.classList.add('high-contrast-mode');
                if (toggleIcon) toggleIcon.textContent = '🎯';
                if (toggleText) toggleText.textContent = 'High Contrast';
                break;
            case 'dark':
            default:
                // Dark mode is the default (no classes needed)
                if (toggleIcon) toggleIcon.textContent = '🌙';
                if (toggleText) toggleText.textContent = 'Dark Mode';
                break;
        }

        // Save theme preference
        localStorage.setItem('diceRollerTheme', theme);
        console.log('Theme set to:', theme);
    }
}

// Advanced dice notation parser (for future features)
class DiceNotationParser {
    static parse(notation) {
        // Parse dice notation like "2d6+3", "1d20", "4d6k3" (keep highest 3)
        const regex = /(\d*)d(\d+)([kl]\d+)?([+-]\d+)?/i;
        const match = notation.match(regex);
        
        if (!match) return null;
        
        return {
            count: parseInt(match[1]) || 1,
            sides: parseInt(match[2]),
            modifier: match[4] ? parseInt(match[4]) : 0,
            special: match[3] // For future features like "keep highest"
        };
    }
}

// Statistics tracker (for future features)
class DiceStatistics {
    static calculateStats(history) {
        if (history.length === 0) return null;
        
        const totals = history.map(roll => roll.total);
        const sum = totals.reduce((a, b) => a + b, 0);
        const average = sum / totals.length;
        const max = Math.max(...totals);
        const min = Math.min(...totals);
        
        return { average, max, min, totalRolls: history.length };
    }
}

// Initialize the dice roller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DiceRoller();
    console.log('🎲 RPG Dice Roller initialized! Press Space/Enter to roll, Escape to clear, T to toggle theme.');
});