# BEAT System Dice Roller

A specialized dice rolling interface designed for the BEAT tabletop RPG system. Features dramatic animations, exploding dice mechanics, and BEAT-specific rule implementations with a sleek cyberpunk-inspired UI.

## Features

### 🎲 BEAT System Dice Mechanics
- **Foundation Die**: Select from d4, d6, d8, d10, d12, or d20 polyhedral dice
- **Exploding Dice**: Foundation dice explode on maximum rolls with sequential animations
- **Pip Dice**: Roll multiple d6 "pip dice" for additional effects
- **Selective Spending**: Pip dice showing 4+ can be clicked to spend for special actions
- **Exclusion Rules**: All dice showing 1 are excluded from totals

### ⚡ BEAT System Rules
- **Composure/Weariness**: Automatically counts 1s rolled and displays penalty
- **Doubles Detection**: Identifies matching values (excluding 1s) that give opponents a BEAT
- **Dynamic Totals**: Real-time calculation as pip dice are spent or unspent
- **Sequential Explosions**: Exploding dice roll and animate one at a time for authentic suspense

### 🎨 Dramatic Interface
- **Dark Fantasy Aesthetic**: Dark gradients with neon accent colors using the Museo and Lexia fonts
- **Cinematic Animations**: 3-second rolling sequences with hidden results for maximum suspense
- **Energy Effects**: High-value pip dice (4+) pulse and shake with energy
- **Visual Feedback**: Clear indicators for excluded dice, selectable dice, and spent dice

### 📊 Game Management
- **Roll History**: Tracks your last 50 rolls with detailed breakdowns
- **Keyboard Shortcuts**: 
  - `Space` or `Enter`: Roll dice
  - `Escape`: Clear all dice
- **Local Storage**: Automatically saves and loads roll history
- **Real-time Updates**: Totals and rule effects update as you interact with dice

## Quick Start

1. Open `index.html` in any modern web browser
2. Select a Foundation Die (d4 through d20)
3. Adjust Pip Dice count using +/- buttons
4. Click "ROLL DICE" or press Space/Enter
5. Watch the dramatic rolling animation
6. Click on pip dice showing 4+ to spend them for actions
7. View automatic rule calculations (Composure/Weariness, BEAT opportunities)

## BEAT System Mechanics Explained

### Foundation Dice
- Choose one polyhedral die (d4-d20) based on your character's ability
- **Exploding**: If you roll the maximum value, roll another die of the same type
- **Exclusion**: 1s don't count toward your total but cause Composure/Weariness

### Pip Dice
- Roll multiple d6 to represent additional effort, equipment, or circumstances  
- **Selective Spending**: Dice showing 4+ can be spent for special actions or bonuses
- **Energy Animation**: High-value dice pulse and shake to show their potential

### Rule Automation
- **Doubles = BEAT**: When any dice show matching values (except 1s), your opponent gets a BEAT
- **1s = Consequences**: All 1s are automatically counted for Composure/Weariness penalties
- **Dynamic Totals**: Your total updates in real-time as you spend pip dice

## File Structure

```
BEAT Dice Roller/
├── index.html      # Main HTML structure and BEAT system layout
├── styles.css      # Cyberpunk styling and dramatic animations  
├── script.js       # BEAT mechanics and sequential dice logic
└── README.md       # This documentation
```

## Browser Compatibility

- Chrome 80+ (recommended for best animation performance)
- Firefox 75+
- Safari 13+
- Edge 80+

## Customization

### Modifying Dice Ranges
Edit the dice selection limits in the `increasePipDice()` and `selectPolyhedral()` functions.

### Animation Timing
Adjust the 3-second animation duration in the `animateRoll()` and related animation methods.

### Visual Theme
Modify the cyberpunk color palette in `styles.css` - the design uses the BEAT system's signature dark blues and warm accent colors.

## Technical Features

The codebase includes advanced implementations for:
- Sequential exploding dice with proper animation timing
- Real-time rule calculation and display
- Sophisticated pip dice interaction system
- Persistent roll history with BEAT system context

## Usage Tips

1. **Dramatic Timing**: Let the full 3-second animation play for maximum table impact
2. **Strategic Spending**: Consider which pip dice to spend before committing to actions
3. **Rule Integration**: The automated rule calculations help maintain game flow
4. **History Tracking**: Use roll history to review important game moments
5. **Mobile Ready**: Touch-friendly interface perfect for tablet gaming sessions

## Development

Built with vanilla HTML, CSS, and JavaScript specifically for the BEAT system. Features cinematic animations, responsive design, and zero external dependencies beyond Google Fonts for the signature Orbitron typeface.

---

*Designed specifically for the BEAT tabletop RPG system*