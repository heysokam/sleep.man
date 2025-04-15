const fs = require('fs');

// Read the CSV file
const csvData = fs.readFileSync('data.csv', 'utf8');

// Parse CSV
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',').map(header => header.trim());

// Initialize JSON array
const jsonData = [];

// Process each line
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue; // Skip empty lines
  
  const values = line.split(',').map(value => value.trim());
  
  // Extract date, sleep time, wake time, and note
  const dateStr = values[0]; // Format: MM/DD/YY
  const sleepTimeStr = values[1]; // Format: HH:MM
  const wakeTimeStr = values[2]; // Format: HH:MM
  const note = values[4] || ''; // Note might be empty
  
  // Parse date components
  const [month, day, year] = dateStr.split('/').map(num => parseInt(num));
  
  // Create ISO date strings
  // For sleep time, we need to determine if it's on the date or the day before
  let sleepDate = new Date(2000 + year, month - 1, day);
  let [sleepHours, sleepMinutes] = sleepTimeStr.split(':').map(num => parseInt(num));
  
  // If sleep time is in the evening (after 12:00), it's on the same date
  // If sleep time is in the morning (before 12:00), it's on the next date
  // This is a simplification - we're assuming sleep times after 12:00 are PM
  if (sleepHours < 12) {
    // Assume it's AM of the next day
    sleepDate.setDate(sleepDate.getDate() + 1);
  }
  
  sleepDate.setHours(sleepHours, sleepMinutes, 0);
  
  // For wake time, we need to determine if it's on the same date or the next day
  let wakeDate = new Date(sleepDate);
  let [wakeHours, wakeMinutes] = wakeTimeStr.split(':').map(num => parseInt(num));
  
  // If wake time is earlier than sleep time, it's the next day
  if (wakeHours < sleepHours || (wakeHours === sleepHours && wakeMinutes < sleepMinutes)) {
    wakeDate.setDate(wakeDate.getDate() + 1);
  }
  
  wakeDate.setHours(wakeHours, wakeMinutes, 0);
  
  // Create the JSON object
  const sleepRecord = {
    sleep: sleepDate.toISOString(),
    wake: wakeDate.toISOString(),
    rating: 3, // Default rating since it's not in the CSV
    note: note
  };
  
  jsonData.push(sleepRecord);
}

// Write to JSON file
fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 2));

console.log(`Converted ${jsonData.length} sleep records to data.json`);
