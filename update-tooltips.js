// Script to update the tooltips in sleep-chart.ts
const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src/components/sleep-chart.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the first tooltip
const tooltipRegex1 = /const tooltip = `\${isPredicted \? '⚠️ PREDICTED ' : ''}\${isMainSleep \? 'Main Sleep' : 'Nap'}\\nSleep: \${sleepTime\.toLocaleTimeString\(\)}\${sleepDriftStr}\\nWake: \${wakeTime\.toLocaleTimeString\(\)}\${wakeDriftStr}\\nRating: \${record\.rating}\/5\\nNote: \${record\.note}`;/g;
content = content.replace(tooltipRegex1, 'const tooltip = this.formatTooltip(record, sleepTime, wakeTime, isMainSleep, isPredicted, sleepDriftStr, wakeDriftStr);');

// Find and replace the second tooltip
const tooltipRegex2 = /block\.title = `\${isPredicted \? '⚠️ PREDICTED ' : ''}\${isMainSleep \? 'Main Sleep' : 'Nap'}\\nSleep: \${sleepTime\.toLocaleTimeString\(\)}\${sleepDriftStr}\\nWake: \${wakeTime\.toLocaleTimeString\(\)}\${wakeDriftStr}\\nRating: \${record\.rating}\/5\\nNote: \${record\.note}`;/g;
content = content.replace(tooltipRegex2, 'block.title = this.formatTooltip(record, sleepTime, wakeTime, isMainSleep, isPredicted, sleepDriftStr, wakeDriftStr);');

// Write the file back
fs.writeFileSync(filePath, content, 'utf8');

console.log('Tooltips updated successfully!');
