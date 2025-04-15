// Define the interface for sleep data
interface SleepRecord {
  sleep: string;    // ISO datetime string for sleep start
  wake: string;     // ISO datetime string for wake time
  rating: number;   // Sleep quality rating (e.g., 1-5)
  note: string;     // Optional notes about the sleep
}

interface PredictedSleepRecord extends SleepRecord {
  isPredicted: boolean; // Flag to indicate this is a predicted entry
}

export class SleepChart extends HTMLElement {
  private sleepData: SleepRecord[] = [];
  private dayStartHour: number = 17; // Default to 17:00
  private maxEntries: number = 90; // Default to 0 (show all entries)
  private showPredictions: boolean = true; // Whether to show predicted entries
  private predictionDays: number = 30; // Number of days to predict
  private averagingDays: number = 14; // Number of past days to use for averaging

  // Visibility toggles for different chart elements
  private showSleepTrendLines: boolean = false; // Whether to show sleep trend lines
  private showWakeTrendLines: boolean = false; // Whether to show wake trend lines
  private showSleepBlocks: boolean = true; // Whether to show sleep blocks

  constructor() {
    super();
    // Initialize the component with empty structure
    this.innerHTML = this.createTemplate();
  }

  async connectedCallback() {
    // Add event listeners for highlighting
    this.setupHighlightEvents();

    // Add temporary UI for day start hour configuration
    this.addDayStartControl();

    // Add prediction controls
    this.addPredictionControls();

    // Load data when the component is added to the DOM
    // Do this last so we can update the UI with the correct values
    await this.loadData();
  }

  /**
   * Updates the non-24 info box with drift calculations
   */
  private updateNon24Info() {
    const infoBox = this.querySelector('.non24-info');
    if (!infoBox || this.sleepData.length < 2) {
      return;
    }

    // Get all main sleep entries
    const allMainSleepEntries = this.getMainSleepEntries(this.sleepData);

    // Calculate drift for all entries
    const allDriftData = this.calculateDrift(allMainSleepEntries);

    // Calculate drift for displayed entries
    const displayedData = this.maxEntries > 0 && this.sleepData.length > this.maxEntries
      ? this.sleepData.slice(-this.maxEntries)
      : this.sleepData;
    const displayedMainSleepEntries = this.getMainSleepEntries(displayedData);
    const displayedDriftData = this.calculateDrift(displayedMainSleepEntries);

    // Format time values for display (weeks and days)
    const formatDays = (days: number) => {
      if (days === 0) return 'N/A';
      if (days === 1) return '1 day';

      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;

      if (weeks === 0) return `${days} days`;
      if (remainingDays === 0) return `${weeks}w`;
      return `${weeks}w ${remainingDays}d`;
    };

    // We'll use our formatDrift method to format the drift values

    // Calculate total drift from 24h day
    const totalDrift = allDriftData.sleepDrift;
    const totalDriftFormatted = this.formatDrift(totalDrift);

    // Calculate visualized drift (based on displayed entries)
    const visualizedDrift = displayedDriftData.sleepDrift;
    const visualizedDriftFormatted = this.formatDrift(visualizedDrift);

    // Calculate cycle length (days to complete a full loop back to the same time)
    // This is calculated as 24h / (drift per day)
    const HOURS_IN_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Get the drift amount in milliseconds (ignoring the 24h part)
    // We need to handle the case where drift might be > 24h or < -24h
    const driftPerDay = totalDrift % HOURS_IN_DAY;
    const adjustedDrift = driftPerDay === 0 ? totalDrift : driftPerDay;

    // Calculate how many days it takes to complete a full 24h cycle
    // If drift is 0, then it's exactly 24h (1 day)
    // If drift is very small, it could be a very large number of days
    let cycleDays;
    if (Math.abs(adjustedDrift) < 60000) { // Less than 1 minute drift
      cycleDays = 0; // Effectively no drift
    } else {
      cycleDays = Math.abs(Math.round(HOURS_IN_DAY / adjustedDrift));
    }

    const cycleDaysFormatted = formatDays(cycleDays);

    // Calculate average sleep per day
    // Group all entries by date (including naps)
    const entriesByDay = new Map<string, SleepRecord[]>();

    // Process all sleep data
    this.sleepData.forEach(record => {
      const sleepTime = new Date(record.sleep);
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!entriesByDay.has(dateStr)) {
        entriesByDay.set(dateStr, []);
      }
      entriesByDay.get(dateStr)?.push(record);
    });

    // Calculate total sleep time for each day
    let totalSleepTimeAllDays = 0;
    let dayCount = 0;

    entriesByDay.forEach((entries) => {
      let totalSleepTimeForDay = 0;

      // Calculate total sleep time for this day (including naps)
      entries.forEach(entry => {
        const sleepTime = new Date(entry.sleep).getTime();
        const wakeTime = new Date(entry.wake).getTime();
        const sleepDuration = wakeTime - sleepTime;

        // Add to the total for this day
        totalSleepTimeForDay += sleepDuration;
      });

      // Add to the overall total
      totalSleepTimeAllDays += totalSleepTimeForDay;
      dayCount++;
    });

    // Calculate average sleep per day (all data)
    const avgSleepPerDayMs = totalSleepTimeAllDays / dayCount;
    const avgSleepPerDayHours = avgSleepPerDayMs / (1000 * 60 * 60);
    const avgSleepPerDayFormatted = `${Math.floor(avgSleepPerDayHours)}h ${Math.round((avgSleepPerDayHours % 1) * 60)}m`;

    console.log('Total sleep calculation:', {
      totalSleepTimeAllDays,
      dayCount,
      avgSleepPerDayMs,
      avgSleepPerDayHours,
      avgSleepPerDayFormatted
    });

    // Calculate average sleep per day for visible data
    const visibleData = this.maxEntries > 0 && this.sleepData.length > this.maxEntries
      ? this.sleepData.slice(-this.maxEntries)
      : this.sleepData;

    // Group visible entries by date
    const visibleEntriesByDay = new Map<string, SleepRecord[]>();

    visibleData.forEach(record => {
      const sleepTime = new Date(record.sleep);
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!visibleEntriesByDay.has(dateStr)) {
        visibleEntriesByDay.set(dateStr, []);
      }
      visibleEntriesByDay.get(dateStr)?.push(record);
    });

    // Calculate total sleep time for visible data
    let totalSleepTimeVisibleDays = 0;
    let visibleDayCount = 0;

    visibleEntriesByDay.forEach((entries) => {
      let totalSleepTimeForDay = 0;

      // Calculate total sleep time for this day (including naps)
      entries.forEach(entry => {
        const sleepTime = new Date(entry.sleep).getTime();
        const wakeTime = new Date(entry.wake).getTime();
        const sleepDuration = wakeTime - sleepTime;

        // Add to the total for this day
        totalSleepTimeForDay += sleepDuration;
      });

      // Add to the visible total
      totalSleepTimeVisibleDays += totalSleepTimeForDay;
      visibleDayCount++;
    });

    // Calculate average sleep per day (visible data)
    const avgSleepPerDayVisibleMs = totalSleepTimeVisibleDays / visibleDayCount;
    const avgSleepPerDayVisibleHours = avgSleepPerDayVisibleMs / (1000 * 60 * 60);
    const avgSleepPerDayVisibleFormatted = `${Math.floor(avgSleepPerDayVisibleHours)}h ${Math.round((avgSleepPerDayVisibleHours % 1) * 60)}m`;

    console.log('Visible sleep calculation:', {
      totalSleepTimeVisibleDays,
      visibleDayCount,
      avgSleepPerDayVisibleMs,
      avgSleepPerDayVisibleHours,
      avgSleepPerDayVisibleFormatted,
      maxEntries: this.maxEntries,
      totalEntries: this.sleepData.length,
      visibleEntries: visibleData.length
    });

    // Update the info box content
    infoBox.innerHTML = `
      <div class="font-bold mb-1 border-b border-gray-600 pb-1">Non-24 Analysis</div>
      <div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
        <div>Cycle length:</div>
        <div>${cycleDaysFormatted}</div>

        <div>Drift: Total</div>
        <div>${totalDriftFormatted}</div>

        <div class="flex items-center">
          <span>Drift: Visible:</span>
          <span class="ml-1 text-xs text-gray-400 cursor-help" title="Drift calculated from currently displayed entries only">[?]</span>
        </div>
        <div>${visualizedDriftFormatted}</div>

        <div class="col-span-2 border-t border-gray-700 my-1"></div>

        <div>Sleep: Total</div>
        <div>${avgSleepPerDayFormatted}</div>

        <div class="flex items-center">
          <span>Sleep: Visible:</span>
          <span class="ml-1 text-xs text-gray-400 cursor-help" title="Average sleep calculated from currently displayed entries only">[?]</span>
        </div>
        <div>${avgSleepPerDayVisibleFormatted}</div>
      </div>
    `;
  }

  /**
   * Sets the hour at which the day starts (0-23) and updates the chart
   */
  public setDayStartHour(hour: number) {
    // Validate input
    if (hour < 0 || hour > 23 || !Number.isInteger(hour)) {
      console.error('Day start hour must be an integer between 0 and 23');
      return;
    }

    // Update the property
    this.dayStartHour = hour;

    // Re-render the chart components
    this.renderYAxis();
    this.renderSleepBlocks();
    this.renderXAxis();
    this.renderTrendLines();
    this.updateNon24Info();
  }

  /**
   * Sets the maximum number of entries to display and updates the chart
   * @param count Number of entries to display (0 = all entries)
   */
  public setMaxEntries(count: number) {
    // Validate input
    if (count < 0 || !Number.isInteger(count)) {
      console.error('Max entries must be a non-negative integer');
      return;
    }

    // Update the property
    this.maxEntries = count;

    // Re-render the chart components
    this.renderSleepBlocks();
    this.renderXAxis();
    this.renderTrendLines();
    this.updateNon24Info();
  }

  /**
   * Sets whether to show predicted sleep entries
   * @param show Whether to show predictions
   */
  public setShowPredictions(show: boolean) {
    this.showPredictions = show;

    // Re-render the chart components
    this.renderSleepBlocks();
    this.renderXAxis();
    this.renderTrendLines();
    this.updateNon24Info();
  }

  /**
   * Sets whether to show sleep trend lines
   * @param show Whether to show sleep trend lines
   */
  public setShowSleepTrendLines(show: boolean) {
    this.showSleepTrendLines = show;

    // Re-render trend lines with the new setting
    this.renderTrendLines();
  }

  /**
   * Sets whether to show wake trend lines
   * @param show Whether to show wake trend lines
   */
  public setShowWakeTrendLines(show: boolean) {
    this.showWakeTrendLines = show;

    // Re-render trend lines with the new setting
    this.renderTrendLines();
  }

  /**
   * Sets whether to show sleep blocks
   * @param show Whether to show sleep blocks
   */
  public setShowSleepBlocks(show: boolean) {
    this.showSleepBlocks = show;

    // Get the sleep blocks container
    const sleepBlocksContainer = this.querySelector('.sleep-blocks');
    if (!sleepBlocksContainer) return;

    // Clear existing content
    sleepBlocksContainer.innerHTML = '';

    // Render sleep blocks (which will also render trend lines)
    this.renderSleepBlocks();
  }

  /**
   * Sets the number of days to predict
   * @param days Number of days to predict
   */
  public setPredictionDays(days: number) {
    // Validate input
    if (days < 0 || !Number.isInteger(days)) {
      console.error('Prediction days must be a non-negative integer');
      return;
    }

    this.predictionDays = days;

    // Re-render if predictions are shown
    if (this.showPredictions) {
      this.renderSleepBlocks();
      this.renderXAxis();
      this.renderTrendLines();
      this.updateNon24Info();
    }
  }

  /**
   * Sets the number of past days to use for averaging
   * @param days Number of past days to use for averaging
   */
  public setAveragingDays(days: number) {
    // Validate input
    if (days < 1 || !Number.isInteger(days)) {
      console.error('Averaging days must be a positive integer');
      return;
    }

    this.averagingDays = days;

    // Re-render if predictions are shown
    if (this.showPredictions) {
      this.renderSleepBlocks();
      this.renderXAxis();
      this.renderTrendLines();
      this.updateNon24Info();
    }
  }

  /**
   * Generates predicted sleep entries based on past data
   * @returns Array of predicted sleep entries
   */
  private generatePredictions(): PredictedSleepRecord[] {
    if (this.sleepData.length === 0 || !this.showPredictions || this.predictionDays === 0) {
      return [];
    }

    // Get the main sleep entries (one per day) from the past
    const mainSleepEntries = this.getMainSleepEntries(this.sleepData);

    if (mainSleepEntries.length === 0) {
      return [];
    }

    // Calculate the average daily drift in sleep and wake times
    // Use the displayed entries for visible drift calculation
    const displayedData = this.maxEntries > 0 && this.sleepData.length > this.maxEntries
      ? this.sleepData.slice(-this.maxEntries)
      : this.sleepData;
    const displayedMainSleepEntries = this.getMainSleepEntries(displayedData);

    // Log the displayed entries for debugging
    console.log('Displayed entries for drift calculation:', displayedMainSleepEntries.map(entry => {
      return {
        sleep: new Date(entry.sleep).toLocaleString(),
        wake: new Date(entry.wake).toLocaleString()
      };
    }));

    // Calculate drift between consecutive entries for debugging
    for (let i = 1; i < displayedMainSleepEntries.length; i++) {
      const prevEntry = displayedMainSleepEntries[i-1];
      const currEntry = displayedMainSleepEntries[i];
      const drift = this.calculateEntryDrift(prevEntry, currEntry);
      console.log(`Drift between entries ${i-1} and ${i}:`, {
        sleepDrift: this.formatDrift(drift.sleepDrift),
        wakeDrift: this.formatDrift(drift.wakeDrift),
        prevSleep: new Date(prevEntry.sleep).toLocaleString(),
        currSleep: new Date(currEntry.sleep).toLocaleString(),
        prevWake: new Date(prevEntry.wake).toLocaleString(),
        currWake: new Date(currEntry.wake).toLocaleString()
      });
    }

    const visibleDriftData = this.calculateDrift(displayedMainSleepEntries);

    // Calculate average sleep duration for visible main sleep entries
    // This ensures predictions use the same data that's currently visible
    let totalSleepDuration = 0;
    displayedMainSleepEntries.forEach(entry => {
      const sleepTime = new Date(entry.sleep).getTime();
      const wakeTime = new Date(entry.wake).getTime();
      totalSleepDuration += wakeTime - sleepTime;
    });
    const avgSleepDuration = totalSleepDuration / displayedMainSleepEntries.length;

    console.log('Average sleep duration calculation:', {
      totalSleepDuration,
      entriesCount: displayedMainSleepEntries.length,
      avgSleepDurationHours: avgSleepDuration / (1000 * 60 * 60)
    });

    // Get the last entry from the visible data, not from all data
    // This ensures predictions are based on what's currently visible
    const lastVisibleEntry = displayedMainSleepEntries[displayedMainSleepEntries.length - 1];
    const lastWakeTime = new Date(lastVisibleEntry.wake);

    // Log data for debugging
    console.log('Prediction data:', {
      visibleSleepDrift: this.formatDrift(visibleDriftData.sleepDrift),
      visibleWakeDrift: this.formatDrift(visibleDriftData.wakeDrift),
      avgSleepDuration: `${(avgSleepDuration / (1000 * 60 * 60)).toFixed(2)} hours`,
      lastWakeTime: lastWakeTime.toLocaleString(),
      avgRating: visibleDriftData.avgRating
    });

    // Generate predictions
    const predictions: PredictedSleepRecord[] = [];

    // Calculate the milliseconds in a day
    const HOURS_IN_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Store the previous wake time to build predictions from
    let prevWakeTime = lastWakeTime;

    // Get the last few entries to analyze the pattern
    const lastFewEntries = displayedMainSleepEntries.slice(-5);
    console.log('Last few entries for pattern analysis:', lastFewEntries.map(entry => {
      return {
        sleep: new Date(entry.sleep).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        wake: new Date(entry.wake).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date: new Date(entry.sleep).toLocaleDateString()
      };
    }));

    // Get the last entry's sleep time hour and minute to use as a base pattern
    const lastSleepTime = new Date(lastVisibleEntry.sleep);
    const lastSleepHour = lastSleepTime.getHours();
    const lastSleepMinute = lastSleepTime.getMinutes();
    console.log('Last sleep time:', lastSleepTime);
    console.log('Last sleep time pattern:', `${lastSleepHour.toString().padStart(2, '0')}:${lastSleepMinute.toString().padStart(2, '0')}`);
    console.log('Last visible entry:', {
      sleep: new Date(lastVisibleEntry.sleep).toLocaleString(),
      wake: new Date(lastVisibleEntry.wake).toLocaleString(),
      sleepUTC: new Date(lastVisibleEntry.sleep).toISOString(),
      sleepHours: new Date(lastVisibleEntry.sleep).getHours(),
      sleepMinutes: new Date(lastVisibleEntry.sleep).getMinutes()
    });

    // Log the visible drift data
    console.log('Visible drift data:', {
      sleepDrift: this.formatDrift(visibleDriftData.sleepDrift),
      wakeDrift: this.formatDrift(visibleDriftData.wakeDrift),
      sleepDriftMs: visibleDriftData.sleepDrift,
      wakeDriftMs: visibleDriftData.wakeDrift
    });

    // Generate predictions for the specified number of days
    for (let i = 0; i < this.predictionDays; i++) {
      // Start with a date 24 hours after the previous wake time
      const nextDate = new Date(prevWakeTime.getTime() + HOURS_IN_DAY);
      console.log(`Prediction ${i+1} - Base date:`, nextDate.toLocaleString());

      // Create the next wake time by setting the hour and minute to match the sleep time pattern
      // This should make the wake time closer to the desired 00:10 pattern
      const nextWakeTime = new Date(nextDate);
      nextWakeTime.setHours(lastSleepHour);
      nextWakeTime.setMinutes(lastSleepMinute);
      console.log(`Prediction ${i+1} - Using hour:${lastSleepHour}, minute:${lastSleepMinute}`);

      console.log(`Prediction ${i+1} - After setting to pattern time:`, nextWakeTime.toLocaleString());

      // Apply the visible drift to the wake time
      const driftAmount = visibleDriftData.sleepDrift * (i + 1);
      nextWakeTime.setTime(nextWakeTime.getTime() + driftAmount);

      console.log(`Prediction ${i+1} - After applying drift:`, {
        wakeTime: nextWakeTime.toLocaleString(),
        driftAmount: this.formatDrift(driftAmount)
      });

      // Calculate the next sleep time by subtracting the average sleep duration from the wake time
      const nextSleepTime = new Date(nextWakeTime.getTime() - avgSleepDuration);

      // Create a predicted entry
      const predictedEntry: PredictedSleepRecord = {
        sleep: nextSleepTime.toISOString(),
        wake: nextWakeTime.toISOString(),
        rating: Math.round(visibleDriftData.avgRating), // Use average rating from past entries
        note: 'Predicted entry',
        isPredicted: true
      };

      // Log prediction for debugging
      console.log(`Prediction ${i+1}:`, {
        sleep: nextSleepTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        wake: nextWakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        sleepDuration: `${(avgSleepDuration / (1000 * 60 * 60)).toFixed(2)} hours`,
        driftFromLast: this.formatDrift(visibleDriftData.sleepDrift),
        totalDriftFromOriginal: this.formatDrift(visibleDriftData.sleepDrift * (i + 1))
      });

      // Update the previous wake time for the next iteration
      prevWakeTime = nextWakeTime;

      predictions.push(predictedEntry);
    }

    return predictions;
  }

  /**
   * Gets the main sleep entry for each day (longest sleep period)
   * @param data Array of sleep records
   * @returns Array of main sleep entries
   */
  private getMainSleepEntries(data: SleepRecord[]): SleepRecord[] {
    // Group entries by date (day)
    const entriesByDay = new Map<string, SleepRecord[]>();

    data.forEach(record => {
      const sleepTime = new Date(record.sleep);
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!entriesByDay.has(dateStr)) {
        entriesByDay.set(dateStr, []);
      }
      entriesByDay.get(dateStr)?.push(record);
    });

    // For each day, find the longest sleep period (main sleep)
    const mainSleepEntries: SleepRecord[] = [];

    entriesByDay.forEach(entries => {
      if (entries.length === 0) return;

      // If only one entry for the day, it's the main sleep
      if (entries.length === 1) {
        mainSleepEntries.push(entries[0]);
        return;
      }

      // Find the longest sleep period for this day
      let longestDuration = 0;
      let longestEntry = entries[0];

      entries.forEach(entry => {
        const sleepTime = new Date(entry.sleep);
        const wakeTime = new Date(entry.wake);

        let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
        let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;
        if (wakeHour < sleepHour) wakeHour += 24; // Handle overnight sleep
        const duration = wakeHour - sleepHour;

        if (duration > longestDuration) {
          longestDuration = duration;
          longestEntry = entry;
        }
      });

      mainSleepEntries.push(longestEntry);
    });

    // Sort by date
    mainSleepEntries.sort((a, b) => {
      return new Date(a.sleep).getTime() - new Date(b.sleep).getTime();
    });

    // Limit to the most recent entries for averaging
    // If averagingDays equals the number of unique dates, use all entries
    const uniqueDatesCount = new Set(mainSleepEntries.map(entry => {
      const sleepTime = new Date(entry.sleep);
      return sleepTime.toISOString().split('T')[0];
    })).size;

    // Only slice if averagingDays is less than the total number of unique dates
    const entriesToUse = this.averagingDays < uniqueDatesCount && mainSleepEntries.length > this.averagingDays
      ? mainSleepEntries.slice(-this.averagingDays)
      : mainSleepEntries;

    return entriesToUse;
  }

  /**
   * Formats a drift value in milliseconds to a human-readable string
   * @param driftMs Drift in milliseconds
   * @returns Formatted drift string with sign (e.g., "+30m" or "-1h 15m")
   */
  private formatDrift(driftMs: number): string {
    const sign = driftMs >= 0 ? '+' : '-';
    const absDrift = Math.abs(driftMs);

    // Get just the drift part (not the full 24h + drift)
    const hours = Math.floor(absDrift / (60 * 60 * 1000)) % 24; // Modulo 24 to get just the drift
    const minutes = Math.floor((absDrift % (60 * 60 * 1000)) / (60 * 1000));

    if (hours === 0) {
      return `${sign}${minutes}m`;
    } else if (minutes === 0) {
      return `${sign}${hours}h`;
    } else {
      return `${sign}${hours}h ${minutes}m`;
    }
  }

  /**
   * Formats a tooltip for a sleep record
   */
  private formatTooltip(record: SleepRecord | PredictedSleepRecord, sleepTime: Date, wakeTime: Date, isMainSleep: unknown, isPredicted: unknown, sleepDriftStr: string = '', wakeDriftStr: string = ''): string {
    // Convert unknown to boolean
    const isMainSleepBool = Boolean(isMainSleep);
    const isPredictedBool = Boolean(isPredicted);
    // Calculate sleep duration
    const sleepDuration = wakeTime.getTime() - sleepTime.getTime();
    const sleepHours = Math.floor(sleepDuration / (1000 * 60 * 60));
    const sleepMinutes = Math.floor((sleepDuration % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = `${sleepHours}h${sleepMinutes.toString().padStart(2, '0')}m`;

    // Format times in 24-hour format
    const sleepTimeStr = sleepTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const wakeTimeStr = wakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return `${isPredictedBool ? '⚠️ PREDICTED ' : ''}${isMainSleepBool ? 'Main Sleep' : 'Nap'}
Time: ${durationStr}
Sleep: ${sleepTimeStr}${sleepDriftStr}
Wake: ${wakeTimeStr}${wakeDriftStr}
Rating: ${record.rating}/5
Note: ${record.note}`;
  }

  /**
   * Calculates drift between two sleep entries
   * @param prevEntry Previous sleep entry
   * @param currEntry Current sleep entry
   * @returns Object with sleep and wake drifts
   */
  private calculateEntryDrift(prevEntry: SleepRecord, currEntry: SleepRecord): { sleepDrift: number, wakeDrift: number } {
    const prevSleepTime = new Date(prevEntry.sleep).getTime();
    const currSleepTime = new Date(currEntry.sleep).getTime();
    const prevWakeTime = new Date(prevEntry.wake).getTime();
    const currWakeTime = new Date(currEntry.wake).getTime();

    // Calculate raw drift
    let sleepDrift = currSleepTime - prevSleepTime;
    let wakeDrift = currWakeTime - prevWakeTime;

    // Adjust to show just the drift part (not the full 24h + drift)
    const HOURS_IN_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // Ensure we get a positive value first, then take modulo again to handle negative drifts
    sleepDrift = ((sleepDrift % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
    wakeDrift = ((wakeDrift % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;

    // If the drift is more than 12 hours, it's likely going backwards (negative drift)
    if (sleepDrift > 12 * 60 * 60 * 1000) {
      sleepDrift = sleepDrift - HOURS_IN_DAY;
    }
    if (wakeDrift > 12 * 60 * 60 * 1000) {
      wakeDrift = wakeDrift - HOURS_IN_DAY;
    }

    return {
      sleepDrift: sleepDrift,
      wakeDrift: wakeDrift
    };
  }

  /**
   * Calculates the average daily drift in sleep and wake times
   * @param entries Array of main sleep entries
   * @returns Object with sleep drift, wake drift, and average rating
   */
  private calculateDrift(entries: SleepRecord[]): { sleepDrift: number, wakeDrift: number, avgRating: number } {
    if (entries.length < 2) {
      // Default to 30 minutes drift if not enough data
      return {
        sleepDrift: 30 * 60 * 1000, // 30m in milliseconds (drift beyond 24h)
        wakeDrift: 30 * 60 * 1000, // 30m in milliseconds (drift beyond 24h)
        avgRating: 3
      };
    }

    let totalSleepDrift = 0;
    let totalWakeDrift = 0;
    let totalRating = 0;

    // Calculate drift between consecutive entries
    for (let i = 1; i < entries.length; i++) {
      const prevSleepTime = new Date(entries[i-1].sleep).getTime();
      const currSleepTime = new Date(entries[i].sleep).getTime();
      const prevWakeTime = new Date(entries[i-1].wake).getTime();
      const currWakeTime = new Date(entries[i].wake).getTime();

      // Calculate raw time differences
      let sleepDiff = currSleepTime - prevSleepTime;
      let wakeDiff = currWakeTime - prevWakeTime;

      // Adjust to get the drift part (modulo 24 hours)
      const HOURS_IN_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      sleepDiff = ((sleepDiff % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
      wakeDiff = ((wakeDiff % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;

      // If the drift is more than 12 hours, it's likely going backwards (negative drift)
      if (sleepDiff > 12 * 60 * 60 * 1000) {
        sleepDiff = sleepDiff - HOURS_IN_DAY;
      }
      if (wakeDiff > 12 * 60 * 60 * 1000) {
        wakeDiff = wakeDiff - HOURS_IN_DAY;
      }

      totalSleepDrift += sleepDiff;
      totalWakeDrift += wakeDiff;
      totalRating += entries[i].rating;
    }

    // Calculate averages
    const avgSleepDrift = totalSleepDrift / (entries.length - 1);
    const avgWakeDrift = totalWakeDrift / (entries.length - 1);
    const avgRating = totalRating / entries.length;

    return {
      sleepDrift: avgSleepDrift,
      wakeDrift: avgWakeDrift,
      avgRating: avgRating
    };
  }

  /**
   * Adds a temporary UI control for setting the day start hour
   * This will be replaced with a proper custom element later
   */
  private addDayStartControl() {
    const container = document.createElement('div');
    container.className = 'absolute top-2 left-20 bg-black bg-opacity-70 p-2 rounded z-20 flex items-center gap-4';
    container.innerHTML = `
      <div class="flex items-center">
        <label for="day-start-hour" class="text-white text-xs mr-2">Day starts at:</label>
        <select id="day-start-hour" class="bg-gray-800 text-white text-xs p-1 rounded">
          ${Array.from({length: 24}, (_, i) =>
            `<option value="${i}" ${i === this.dayStartHour ? 'selected' : ''}>${i.toString().padStart(2, '0')}:00</option>`
          ).join('')}
        </select>
      </div>

      <div class="flex items-center">
        <label for="max-entries" class="text-white text-xs mr-2">Show entries:</label>
        <input
          type="number"
          id="max-entries"
          class="bg-gray-800 text-white text-xs p-1 rounded w-16"
          min="0"
          step="1"
          value="${this.maxEntries || ''}"
          placeholder="All"
        />
      </div>
    `;

    // Add event listeners
    const dayStartSelect = container.querySelector('#day-start-hour') as HTMLSelectElement;
    dayStartSelect.addEventListener('change', () => {
      const hour = parseInt(dayStartSelect.value, 10);
      this.setDayStartHour(hour);
    });

    const maxEntriesInput = container.querySelector('#max-entries') as HTMLInputElement;
    maxEntriesInput.addEventListener('change', () => {
      const value = maxEntriesInput.value.trim();
      const count = value === '' ? 0 : parseInt(value, 10);
      this.setMaxEntries(count);
    });

    this.appendChild(container);
  }

  private addPredictionControls() {
    const container = document.createElement('div');
    container.className = 'absolute top-2 right-2 bg-black bg-opacity-70 p-2 rounded z-20 flex items-center gap-4';
    container.innerHTML = `
      <div class="flex items-center">
        <input
          type="checkbox"
          id="show-predictions"
          class="bg-gray-800 text-white mr-2"
          ${this.showPredictions ? 'checked' : ''}
        />
        <label for="prediction-days" class="text-white text-xs mr-2">Days to predict:</label>
        <input
          type="number"
          id="prediction-days"
          class="bg-gray-800 text-white text-xs p-1 rounded w-12"
          min="1"
          step="1"
          value="${this.predictionDays}"
          ${!this.showPredictions ? 'disabled' : ''}
        />
      </div>

      <div class="flex items-center">
        <label for="averaging-days" class="text-white text-xs mr-2">Averaging days:</label>
        <input
          type="number"
          id="averaging-days"
          class="bg-gray-800 text-white text-xs p-1 rounded w-12"
          min="1"
          step="1"
          value="${this.averagingDays}"
          placeholder="All days"
          title="Default: All available days"
          ${!this.showPredictions ? 'disabled' : ''}
        />
      </div>
    `;

    // Add event listeners
    const showPredictionsCheckbox = container.querySelector('#show-predictions') as HTMLInputElement;
    showPredictionsCheckbox.addEventListener('change', () => {
      this.setShowPredictions(showPredictionsCheckbox.checked);

      // Enable/disable prediction inputs
      const predictionDaysInput = container.querySelector('#prediction-days') as HTMLInputElement;
      const averagingDaysInput = container.querySelector('#averaging-days') as HTMLInputElement;

      predictionDaysInput.disabled = !showPredictionsCheckbox.checked;
      averagingDaysInput.disabled = !showPredictionsCheckbox.checked;
    });

    const predictionDaysInput = container.querySelector('#prediction-days') as HTMLInputElement;
    predictionDaysInput.addEventListener('change', () => {
      const days = parseInt(predictionDaysInput.value, 10);
      this.setPredictionDays(days);
    });

    const averagingDaysInput = container.querySelector('#averaging-days') as HTMLInputElement;
    averagingDaysInput.addEventListener('change', () => {
      const days = parseInt(averagingDaysInput.value, 10);
      this.setAveragingDays(days);
    });

    this.appendChild(container);
  }

  private setupHighlightEvents() {
    const sleepBlocksContainer = this.querySelector('.sleep-blocks');
    const verticalHighlight = this.querySelector('.vertical-highlight');
    const horizontalHighlight = this.querySelector('.horizontal-highlight');

    if (!sleepBlocksContainer || !verticalHighlight || !horizontalHighlight) return;

    // Add event delegation for sleep blocks
    sleepBlocksContainer.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('sleep-block')) return;

      // Get the left position and width from the target block
      const left = target.style.left;
      const width = target.style.width;

      // Get the sleep and wake times for the horizontal highlights
      const sleepTime = new Date(target.dataset.sleep || '');
      const wakeTime = new Date(target.dataset.wake || '');
      let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
      let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;

      // Adjust hours based on day start hour
      sleepHour = (sleepHour - this.dayStartHour + 24) % 24;
      wakeHour = (wakeHour - this.dayStartHour + 24) % 24;

      // Calculate positions for sleep and wake time highlights
      let sleepTop = (sleepHour / 24) * 100;
      let wakeTop = (wakeHour / 24) * 100;

      // Handle wrapped blocks
      if (wakeHour < sleepHour) {
        wakeTop = (wakeHour / 24) * 100;
      }

      // Format times for display in 24-hour format
      const sleepTimeStr = sleepTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const wakeTimeStr = wakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dateStr = sleepTime.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // We don't need to find the index anymore since trend lines are permanent

      // Show and position the vertical highlight
      verticalHighlight.classList.remove('hidden');
      verticalHighlight.innerHTML = `
        <div class="bg-white bg-opacity-10 absolute h-full" style="left: ${left}; width: ${width};"></div>
        <div class="absolute text-xs text-white bg-black bg-opacity-70 px-1 py-0.5 rounded" style="left: calc(${left} + ${width}/2); bottom: 5px; transform: translateX(-50%)">${dateStr}</div>
      `;

      // We don't need to calculate anything here anymore since trend lines are permanent

      // Show and position the horizontal highlights for both sleep and wake times
      horizontalHighlight.classList.remove('hidden');
      horizontalHighlight.innerHTML = `
        <div class="absolute w-full h-0.5 bg-white" style="top: ${sleepTop}%;">
          <span class="absolute left-0 -mt-5 text-xs text-white bg-black bg-opacity-70 px-1 py-0.5 rounded">Sleep: ${sleepTimeStr}</span>
        </div>
        <div class="absolute w-full h-0.5 bg-white" style="top: ${wakeTop}%;">
          <span class="absolute left-0 mt-1 text-xs text-white bg-black bg-opacity-70 px-1 py-0.5 rounded">Wake: ${wakeTimeStr}</span>
        </div>
      `;
    });

    sleepBlocksContainer.addEventListener('mouseout', () => {
      // Hide the highlights when not hovering over any sleep block
      verticalHighlight.classList.add('hidden');
      horizontalHighlight.classList.add('hidden');
    });
  }







  private createTemplate(): string {
    return `
      <div class="sleep-chart-container w-full h-full bg-[#1a1a1a] relative overflow-hidden">
        <div class="chart-area w-full h-full relative">
          <div class="y-axis absolute left-0 top-0 bottom-0 w-20 border-r border-[#333333]">
            ${this.generateYAxisLabels()}
          </div>
          <div class="x-axis absolute left-20 right-0 bottom-0 h-10 border-t border-[#333333]"></div>
          <div class="sleep-blocks absolute left-20 top-0 right-0 bottom-10"></div>
          <div class="vertical-highlight absolute hidden left-20 top-0 right-0 bottom-10 pointer-events-none"></div>
          <div class="horizontal-highlight absolute hidden left-20 top-0 right-0 bottom-10 pointer-events-none"></div>
          <div class="non24-info absolute bottom-12 right-2 bg-black bg-opacity-70 p-2 rounded z-20 text-white text-xs"></div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Y-axis with hour labels adjusted for the day start hour
   */
  private renderYAxis() {
    const yAxis = this.querySelector('.y-axis');
    if (!yAxis) return;

    // Clear existing labels
    yAxis.innerHTML = '';

    // We'll add timezone headers at the bottom instead

    // Add new labels with a bit of top padding to account for the header
    for (let i = 0; i < 24; i++) {
      // Calculate the actual hour based on day start hour
      const hour = (this.dayStartHour + i) % 24;

      // Calculate position (0% is top, 100% is bottom)
      // Add a small offset to account for the header
      const position = (i / 24) * 100;

      // Create a date object for this hour to get timezone-specific times
      const date = new Date();
      date.setHours(hour, 0, 0, 0);

      // Format times for different timezones (hour only)
      // EU timezone (CET/CEST)
      const euTime = hour.toString().padStart(2, '0');

      // NY timezone (EST/EDT)
      const nyHour = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
      const nyTime = nyHour.toString().padStart(2, '0');

      // LA timezone (PST/PDT)
      const laHour = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getHours();
      const laTime = laHour.toString().padStart(2, '0');

      // Create the label container
      const labelContainer = document.createElement('div');
      labelContainer.className = 'absolute left-0 text-[#cccccc] text-xs w-full';

      // Add a small top margin to the first hour to avoid overlap with the header
      if (i === 0) {
        labelContainer.style.top = `calc(${position}% + 4px)`;
      } else {
        labelContainer.style.top = `${position}%`;
      }

      // Show all three timezones with more visible separators
      labelContainer.innerHTML = `
        <div class="grid grid-cols-3 gap-0">
          <div class="text-center border-r border-[#555555]">${euTime}</div>
          <div class="text-center border-r border-[#555555]">${nyTime}</div>
          <div class="text-center">${laTime}</div>
        </div>
      `;

      yAxis.appendChild(labelContainer);
    }

    // Add timezone headers at the bottom of the Y-axis
    const timezoneHeader = document.createElement('div');
    timezoneHeader.className = 'absolute bottom-0 left-0 w-full text-[#cccccc] text-xs border-t border-[#333333]';
    timezoneHeader.innerHTML = `
      <div class="grid grid-cols-3 gap-0 h-6 items-center">
        <div class="text-center border-r border-[#555555]">EU</div>
        <div class="text-center border-r border-[#555555]">NY</div>
        <div class="text-center">LA</div>
      </div>
    `;
    yAxis.appendChild(timezoneHeader);

    // Add grid lines if needed
    // ...
  }

  /**
   * Generates Y-axis labels for initial render
   * This will be replaced by renderYAxis after the component is connected
   */
  private generateYAxisLabels(): string {
    // Start with an empty string for labels
    let labels = '';

    // Add hour labels
    for (let i = 0; i < 24; i += 1) {
      // Calculate the actual hour based on day start hour
      const hour = (this.dayStartHour + i) % 24;

      // Create a date object for this hour to get timezone-specific times
      const date = new Date();
      date.setHours(hour, 0, 0, 0);

      // Format times for different timezones (hour only)
      // EU timezone (CET/CEST)
      const euTime = hour.toString().padStart(2, '0');

      // NY timezone (EST/EDT)
      const nyHour = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
      const nyTime = nyHour.toString().padStart(2, '0');

      // LA timezone (PST/PDT)
      const laHour = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })).getHours();
      const laTime = laHour.toString().padStart(2, '0');

      const position = (i / 24) * 100;

      // Add a small top margin to the first hour to avoid overlap with the header
      const topPosition = i === 0 ? `calc(${position}% + 4px)` : `${position}%`;

      labels += `
        <div class="absolute left-0 text-[#cccccc] text-xs w-full" style="top: ${topPosition}">
          <div class="grid grid-cols-3 gap-0">
            <div class="text-center border-r border-[#555555]">${euTime}</div>
            <div class="text-center border-r border-[#555555]">${nyTime}</div>
            <div class="text-center">${laTime}</div>
          </div>
        </div>
      `;
    }
    return labels;
  }

  private async loadData(): Promise<void> {
    try {
      const response = await fetch('/data.json');
      if (!response.ok) {
        throw new Error('Failed to load data');
      }

      this.sleepData = await response.json();

      // Calculate the number of unique days in the data for averaging
      const uniqueDates = new Set<string>();
      this.sleepData.forEach(record => {
        const sleepTime = new Date(record.sleep);
        const dateStr = sleepTime.toISOString().split('T')[0];
        uniqueDates.add(dateStr);
      });

      // Set the averaging days to the total number of days in the data
      this.averagingDays = uniqueDates.size;

      // Update the averaging days input if it exists
      const averagingDaysInput = this.querySelector('#averaging-days') as HTMLInputElement;
      if (averagingDaysInput) {
        averagingDaysInput.value = this.averagingDays.toString();
      }

      this.renderSleepBlocks();
      this.renderXAxis();
      this.renderTrendLines(); // Add trend lines after loading data
      this.updateNon24Info(); // Update non-24 info box
    } catch (error) {
      console.error('Error loading sleep data:', error);
      this.showError('Failed to load sleep data');
    }
  }

  private renderTrendLines() {
    const sleepBlocksContainer = this.querySelector('.sleep-blocks');
    if (!sleepBlocksContainer || this.sleepData.length <= 1) return;

    // Create a container for the trend lines
    const trendLinesContainer = document.createElement('div');
    trendLinesContainer.className = 'absolute inset-0 z-10 pointer-events-none';

    // Create SVG paths for the trend lines with wrapping
    let sleepSegments: {start: {x: number, y: number}, end: {x: number, y: number}}[] = [];
    let wakeSegments: {start: {x: number, y: number}, end: {x: number, y: number}}[] = [];

    // Filter data based on maxEntries setting
    const filteredData = this.maxEntries > 0
      ? [...this.sleepData].slice(-this.maxEntries)
      : this.sleepData;

    // Generate predictions if enabled
    const predictedEntries = this.showPredictions ? this.generatePredictions() : [];

    // For trend lines, we only use real data (not predictions)
    // For dots, we'll use both real and predicted data
    const realData = filteredData;

    // Group entries by date (day) for real data (for trend lines)
    const entriesByDay = new Map<string, number[]>();
    const uniqueDates: string[] = [];

    // First, collect all unique dates from real data (for trend lines)
    realData.forEach((record, index) => {
      const sleepTime = new Date(record.sleep);
      const wakeTime = new Date(record.wake);

      // Get hours for time calculations
      let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
      let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;
      if (wakeHour < sleepHour) wakeHour += 24; // Handle overnight sleep

      // Get date string (without time) for grouping
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!entriesByDay.has(dateStr)) {
        entriesByDay.set(dateStr, []);
        uniqueDates.push(dateStr);
      }
      entriesByDay.get(dateStr)?.push(index);
    });

    // Now, collect unique dates from predicted entries (for dots only)
    if (this.showPredictions) {
      predictedEntries.forEach(record => {
        const sleepTime = new Date(record.sleep);
        const dateStr = sleepTime.toISOString().split('T')[0];

        if (!uniqueDates.includes(dateStr)) {
          uniqueDates.push(dateStr);
        }
      });
    }

    // Sort dates chronologically
    uniqueDates.sort();

    // Calculate block width based on number of unique days
    const blockWidth = 100 / uniqueDates.length;

    // For each day, find the longest sleep period (main sleep)
    const mainSleepIndices: number[] = [];
    const mainSleepDayIndices: number[] = [];

    uniqueDates.forEach((dateStr, dayIndex) => {
      const indices = entriesByDay.get(dateStr) || [];

      if (indices.length === 0) return;

      // If only one entry for the day, it's the main sleep
      if (indices.length === 1) {
        mainSleepIndices.push(indices[0]);
        mainSleepDayIndices.push(dayIndex);
        return;
      }

      // Find the longest sleep period for this day
      let longestDuration = 0;
      let longestIndex = indices[0];

      indices.forEach(index => {
        const record = filteredData[index];
        const sleepTime = new Date(record.sleep);
        const wakeTime = new Date(record.wake);

        let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
        let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;
        if (wakeHour < sleepHour) wakeHour += 24; // Handle overnight sleep
        const duration = wakeHour - sleepHour;

        if (duration > longestDuration) {
          longestDuration = duration;
          longestIndex = index;
        }
      });

      mainSleepIndices.push(longestIndex);
      mainSleepDayIndices.push(dayIndex);
    });

    // Now create trend lines only for main sleep periods
    for (let i = 0; i < mainSleepDayIndices.length - 1; i++) {
      const currentDayIndex = mainSleepDayIndices[i];
      const nextDayIndex = mainSleepDayIndices[i + 1];

      const currentIndex = mainSleepIndices[i];
      const nextIndex = mainSleepIndices[i + 1];

      const currentRecord = filteredData[currentIndex];
      const nextRecord = filteredData[nextIndex];

      // Current entry
      const currentSleepTime = new Date(currentRecord.sleep);
      const currentWakeTime = new Date(currentRecord.wake);
      let currentSleepHour = currentSleepTime.getHours() + currentSleepTime.getMinutes() / 60;
      let currentWakeHour = currentWakeTime.getHours() + currentWakeTime.getMinutes() / 60;

      // Adjust hours based on day start hour
      currentSleepHour = (currentSleepHour - this.dayStartHour + 24) % 24;
      currentWakeHour = (currentWakeHour - this.dayStartHour + 24) % 24;

      // Next entry
      const nextSleepTime = new Date(nextRecord.sleep);
      const nextWakeTime = new Date(nextRecord.wake);
      let nextSleepHour = nextSleepTime.getHours() + nextSleepTime.getMinutes() / 60;
      let nextWakeHour = nextWakeTime.getHours() + nextWakeTime.getMinutes() / 60;

      // Adjust hours based on day start hour
      nextSleepHour = (nextSleepHour - this.dayStartHour + 24) % 24;
      nextWakeHour = (nextWakeHour - this.dayStartHour + 24) % 24;

      // Calculate positions using day indices instead of record indices
      const currentX = currentDayIndex * blockWidth + blockWidth / 2;
      const nextX = nextDayIndex * blockWidth + blockWidth / 2;

      const currentSleepY = (currentSleepHour / 24) * 100;
      const currentWakeY = (currentWakeHour / 24) * 100;
      const nextSleepY = (nextSleepHour / 24) * 100;
      const nextWakeY = (nextWakeHour / 24) * 100;

      // Check if we need to wrap the sleep line
      if (Math.abs(nextSleepY - currentSleepY) > 50) {
        // The line would cross the midnight boundary, so split it
        if (nextSleepY < currentSleepY) {
          // Next sleep time is earlier (e.g., 23:00 -> 1:00)
          // Add a segment from current to bottom
          sleepSegments.push({
            start: {x: currentX, y: currentSleepY},
            end: {x: currentX + (nextX - currentX) / 2, y: 100}
          });
          // Add a segment from top to next
          sleepSegments.push({
            start: {x: currentX + (nextX - currentX) / 2, y: 0},
            end: {x: nextX, y: nextSleepY}
          });
        } else {
          // Next sleep time is later (e.g., 1:00 -> 23:00)
          // Add a segment from current to top
          sleepSegments.push({
            start: {x: currentX, y: currentSleepY},
            end: {x: currentX + (nextX - currentX) / 2, y: 0}
          });
          // Add a segment from bottom to next
          sleepSegments.push({
            start: {x: currentX + (nextX - currentX) / 2, y: 100},
            end: {x: nextX, y: nextSleepY}
          });
        }
      } else {
        // No wrapping needed for sleep line
        sleepSegments.push({
          start: {x: currentX, y: currentSleepY},
          end: {x: nextX, y: nextSleepY}
        });
      }

      // Check if we need to wrap the wake line
      if (Math.abs(nextWakeY - currentWakeY) > 50) {
        // The line would cross the midnight boundary, so split it
        if (nextWakeY < currentWakeY) {
          // Next wake time is earlier (e.g., 23:00 -> 1:00)
          // Add a segment from current to bottom
          wakeSegments.push({
            start: {x: currentX, y: currentWakeY},
            end: {x: currentX + (nextX - currentX) / 2, y: 100}
          });
          // Add a segment from top to next
          wakeSegments.push({
            start: {x: currentX + (nextX - currentX) / 2, y: 0},
            end: {x: nextX, y: nextWakeY}
          });
        } else {
          // Next wake time is later (e.g., 1:00 -> 23:00)
          // Add a segment from current to top
          wakeSegments.push({
            start: {x: currentX, y: currentWakeY},
            end: {x: currentX + (nextX - currentX) / 2, y: 0}
          });
          // Add a segment from bottom to next
          wakeSegments.push({
            start: {x: currentX + (nextX - currentX) / 2, y: 100},
            end: {x: nextX, y: nextWakeY}
          });
        }
      } else {
        // No wrapping needed for wake line
        wakeSegments.push({
          start: {x: currentX, y: currentWakeY},
          end: {x: nextX, y: nextWakeY}
        });
      }
    }

    // Create the SVG content
    trendLinesContainer.innerHTML = `
      <svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <!-- Sleep time connection lines -->
        ${this.showSleepTrendLines ? sleepSegments.map(segment =>
          `<line x1="${segment.start.x}%" y1="${segment.start.y}%" x2="${segment.end.x}%" y2="${segment.end.y}%" stroke="#FF00FF" stroke-width="1" stroke-opacity="0.6" />`
        ).join('') : ''}

        <!-- Wake time connection lines -->
        ${this.showWakeTrendLines ? wakeSegments.map(segment =>
          `<line x1="${segment.start.x}%" y1="${segment.start.y}%" x2="${segment.end.x}%" y2="${segment.end.y}%" stroke="#00FFFF" stroke-width="1" stroke-opacity="0.6" />`
        ).join('') : ''}

        <!-- Dots for each data point -->
        <!-- First, add dots for real data -->
        ${uniqueDates.map((dateStr, dayIndex) => {
          const indices = entriesByDay.get(dateStr) || [];
          const x = (dayIndex * (100 / uniqueDates.length)) + ((100 / uniqueDates.length) / 2);

          return indices.map(i => {
            const record = realData[i];
            const sleepTime = new Date(record.sleep);
            const wakeTime = new Date(record.wake);
            let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
            let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;

            // Adjust hours based on day start hour
            sleepHour = (sleepHour - this.dayStartHour + 24) % 24;
            wakeHour = (wakeHour - this.dayStartHour + 24) % 24;

            const sleepY = (sleepHour / 24) * 100;
            const wakeY = (wakeHour / 24) * 100;

            // Check if this is a main sleep period or a nap
            const isMainSleep = mainSleepIndices.includes(i);

            // Use different colors/sizes for main sleep vs naps
            const sleepFill = isMainSleep ? "#FF00FF" : "#FF99FF";
            const wakeFill = isMainSleep ? "#00FFFF" : "#99FFFF";
            const dotSize = isMainSleep ? 3 : 2;

            // Only show dots if their corresponding trend lines are visible
            return `
              ${this.showSleepTrendLines ? `<circle cx="${x}%" cy="${sleepY}%" r="${dotSize}" fill="${sleepFill}" />` : ''}
              ${this.showWakeTrendLines ? `<circle cx="${x}%" cy="${wakeY}%" r="${dotSize}" fill="${wakeFill}" />` : ''}
            `;
          }).join('');
        }).join('')}

        <!-- Then, add dots for predicted data with different styling -->
        ${this.showPredictions ? predictedEntries.map(record => {
          const sleepTime = new Date(record.sleep);
          const wakeTime = new Date(record.wake);

          // Get date string for positioning on X-axis
          const dateStr = sleepTime.toISOString().split('T')[0];

          // Find the day index for this date
          let dayIndex = uniqueDates.indexOf(dateStr);

          // If date doesn't exist in uniqueDates, add it at the end
          if (dayIndex === -1) {
            uniqueDates.push(dateStr);
            dayIndex = uniqueDates.length - 1;
          }

          const x = (dayIndex * (100 / uniqueDates.length)) + ((100 / uniqueDates.length) / 2);

          // Calculate Y positions
          let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
          let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;

          // Adjust hours based on day start hour
          sleepHour = (sleepHour - this.dayStartHour + 24) % 24;
          wakeHour = (wakeHour - this.dayStartHour + 24) % 24;

          const sleepY = (sleepHour / 24) * 100;
          const wakeY = (wakeHour / 24) * 100;

          // Use different styling for predicted entries - monochrome
          // Hollow circles with dashed borders
          // Only show dots if their corresponding trend lines are visible
          return `
            ${this.showSleepTrendLines ? `<circle cx="${x}%" cy="${sleepY}%" r="3" fill="none" stroke="white" stroke-width="1" stroke-dasharray="2,1" />` : ''}
            ${this.showWakeTrendLines ? `<circle cx="${x}%" cy="${wakeY}%" r="3" fill="none" stroke="#AAAAAA" stroke-width="1" stroke-dasharray="2,1" />` : ''}
          `;
        }).join('') : ''}

        <!-- Legend will be added separately -->
      </svg>
    `;

    // Remove existing trend lines container if it exists
    const existingTrendLines = this.querySelector('.trend-lines-container');
    if (existingTrendLines) {
      existingTrendLines.remove();
    }

    // Add class to the trend lines container for easier selection
    trendLinesContainer.classList.add('trend-lines-container');

    // Add to the container
    sleepBlocksContainer.appendChild(trendLinesContainer);

    // Remove existing legend if it exists
    const existingLegend = this.querySelector('.legend-container');
    if (existingLegend) {
      existingLegend.remove();
    }

    // Add legend as a separate HTML element at the bottom left
    const legendContainer = document.createElement('div');
    legendContainer.className = 'legend-container absolute bottom-12 left-20 bg-black bg-opacity-50 p-2 rounded z-20';
    legendContainer.innerHTML = `
      <div class="text-white text-xs grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1 items-center">
        <input type="checkbox" id="show-sleep-trend" class="w-3 h-3" ${this.showSleepTrendLines ? 'checked' : ''}>
        <div class="flex items-center">
          <div class="w-3 h-0.5 bg-[#FF00FF] opacity-60 mr-1"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-[#FF00FF]"></div>
        </div>
        <div>Sleep Trend</div>

        <input type="checkbox" id="show-wake-trend" class="w-3 h-3" ${this.showWakeTrendLines ? 'checked' : ''}>
        <div class="flex items-center">
          <div class="w-3 h-0.5 bg-[#00FFFF] opacity-60 mr-1"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-[#00FFFF]"></div>
        </div>
        <div>Wake Trend</div>

        <input type="checkbox" id="show-sleep-blocks" class="w-3 h-3" ${this.showSleepBlocks ? 'checked' : ''}>
        <div class="flex items-center">
          <div class="w-3 h-3 bg-white border border-[#444444] rounded-sm"></div>
        </div>
        <div>Sleep Blocks</div>

        ${this.showPredictions ? `
        <div></div>
        <div class="flex items-center mt-2">
          <div class="w-1.5 h-1.5 rounded-full border border-white mr-1"></div>
        </div>
        <div>Predicted Sleep</div>

        <div></div>
        <div class="flex items-center">
          <div class="w-1.5 h-1.5 rounded-full border border-gray-400 mr-1"></div>
        </div>
        <div>Predicted Wake</div>
        ` : ''}
      </div>
    `;

    this.querySelector('.chart-area')?.appendChild(legendContainer);

    // Add event listeners for the checkboxes
    const sleepTrendCheckbox = legendContainer.querySelector('#show-sleep-trend') as HTMLInputElement;
    sleepTrendCheckbox?.addEventListener('change', () => {
      this.setShowSleepTrendLines(sleepTrendCheckbox.checked);
    });

    const wakeTrendCheckbox = legendContainer.querySelector('#show-wake-trend') as HTMLInputElement;
    wakeTrendCheckbox?.addEventListener('change', () => {
      this.setShowWakeTrendLines(wakeTrendCheckbox.checked);
    });

    const sleepBlocksCheckbox = legendContainer.querySelector('#show-sleep-blocks') as HTMLInputElement;
    sleepBlocksCheckbox?.addEventListener('change', () => {
      this.setShowSleepBlocks(sleepBlocksCheckbox.checked);
    });
  }

  private showError(message: string) {
    const chartArea = this.querySelector('.chart-area');
    if (chartArea) {
      chartArea.innerHTML = `
        <div class="flex items-center justify-center w-full h-full">
          <div class="text-red-500 text-center">
            <p class="text-xl">Error</p>
            <p>${message}</p>
          </div>
        </div>
      `;
    }
  }

  private renderXAxis() {
    const xAxis = this.querySelector('.x-axis');
    if (!xAxis || this.sleepData.length === 0) return;

    // Clear existing labels
    xAxis.innerHTML = '';

    // Filter data based on maxEntries setting
    const filteredData = this.maxEntries > 0
      ? [...this.sleepData].slice(-this.maxEntries)
      : this.sleepData;

    // Generate predictions if enabled
    const predictedEntries = this.showPredictions ? this.generatePredictions() : [];

    // Combine real and predicted data
    const combinedData = [...filteredData, ...predictedEntries];

    // Group entries by date (day)
    const entriesByDay = new Map<string, number[]>();
    const uniqueDates: string[] = [];

    combinedData.forEach((record, index) => {
      const sleepTime = new Date(record.sleep);

      // Get date string (without time) for grouping
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!entriesByDay.has(dateStr)) {
        entriesByDay.set(dateStr, []);
        uniqueDates.push(dateStr);
      }
      entriesByDay.get(dateStr)?.push(index);
    });

    // Sort dates chronologically
    uniqueDates.sort();

    // For large datasets, only show labels for every 5th day
    const labelInterval = uniqueDates.length > 30 ? 5 : 1;

    // Create labels for selected days
    uniqueDates.forEach((dateStr, dayIndex) => {
      if (dayIndex % labelInterval !== 0 && dayIndex !== uniqueDates.length - 1) return;

      const date = new Date(dateStr);
      const dayLabel = document.createElement('div');
      dayLabel.className = 'x-axis-label absolute bottom-2 text-[#cccccc] text-xs transform -translate-x-1/2';
      dayLabel.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      // Position label
      const position = ((dayIndex + 0.5) / uniqueDates.length) * 100;
      dayLabel.style.left = `${position}%`;

      xAxis.appendChild(dayLabel);
    });
  }

  private renderSleepBlocks() {
    const sleepBlocksContainer = this.querySelector('.sleep-blocks');
    if (!sleepBlocksContainer || this.sleepData.length === 0) return;

    // Clear existing blocks
    sleepBlocksContainer.innerHTML = '';

    // Always render trend lines, even if sleep blocks are hidden
    // This ensures trend lines are still visible when sleep blocks are toggled off
    this.renderTrendLines();

    // If sleep blocks are hidden, don't render them
    if (!this.showSleepBlocks) return;

    // Filter data based on maxEntries setting
    const filteredData = this.maxEntries > 0
      ? [...this.sleepData].slice(-this.maxEntries)
      : this.sleepData;

    // Generate predictions if enabled
    const predictedEntries = this.showPredictions ? this.generatePredictions() : [];

    // Combine real and predicted data
    const combinedData = [...filteredData, ...predictedEntries];

    // Group entries by date (day)
    const entriesByDay = new Map<string, number[]>();
    const uniqueDates: string[] = [];

    combinedData.forEach((record, index) => {
      const sleepTime = new Date(record.sleep);

      // Get date string (without time) for grouping
      const dateStr = sleepTime.toISOString().split('T')[0];

      if (!entriesByDay.has(dateStr)) {
        entriesByDay.set(dateStr, []);
        uniqueDates.push(dateStr);
      }
      entriesByDay.get(dateStr)?.push(index);
    });

    // Sort dates chronologically
    uniqueDates.sort();

    // Calculate block width based on number of unique days
    const blockWidth = (100 / uniqueDates.length);

    // For each day, find the longest sleep period (main sleep)
    const mainSleepIndices: number[] = [];

    entriesByDay.forEach((indices) => {
      if (indices.length === 0) return;

      // If only one entry for the day, it's the main sleep
      if (indices.length === 1) {
        mainSleepIndices.push(indices[0]);
        return;
      }

      // Find the longest sleep period for this day
      let longestDuration = 0;
      let longestIndex = indices[0];

      indices.forEach(index => {
        const record = combinedData[index];
        const sleepTime = new Date(record.sleep);
        const wakeTime = new Date(record.wake);

        let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
        let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;
        if (wakeHour < sleepHour) wakeHour += 24; // Handle overnight sleep
        const duration = wakeHour - sleepHour;

        if (duration > longestDuration) {
          longestDuration = duration;
          longestIndex = index;
        }
      });

      mainSleepIndices.push(longestIndex);
    });

    // Create blocks for each sleep record, grouped by day
    uniqueDates.forEach((dateStr, dayIndex) => {
      const indices = entriesByDay.get(dateStr) || [];

      // Calculate the left position for this day's column
      const left = dayIndex * blockWidth;

      // Process each sleep record for this day
      indices.forEach(index => {
        const record = combinedData[index];
        const sleepTime = new Date(record.sleep);
        const wakeTime = new Date(record.wake);

        // Calculate position and size
        let sleepHour = sleepTime.getHours() + sleepTime.getMinutes() / 60;
        let wakeHour = wakeTime.getHours() + wakeTime.getMinutes() / 60;

        // Adjust hours based on day start hour
        sleepHour = (sleepHour - this.dayStartHour + 24) % 24;
        wakeHour = (wakeHour - this.dayStartHour + 24) % 24;

        // Handle sleep periods that cross the day boundary
        let durationHours = wakeHour - sleepHour;
        if (durationHours < 0) {
          durationHours += 24;
        }

        const top = (sleepHour / 24) * 100;
        const height = (durationHours / 24) * 100;

        // Check if this is a predicted entry
        const isPredicted = 'isPredicted' in record && record.isPredicted;

        // Check if this is a main sleep period or a nap
        const isMainSleep = mainSleepIndices.includes(index);

        // Set styling based on whether it's predicted and main/nap
        let bgColor, borderColor;

        if (isPredicted) {
          // Predicted entries have transparent background with dashed border in monochrome
          bgColor = 'bg-transparent';
          borderColor = isMainSleep ? 'border-white border-dashed' : 'border-gray-400 border-dashed';
        } else {
          // Real entries have white background
          bgColor = isMainSleep ? 'bg-white' : 'bg-white bg-opacity-70';
          borderColor = isMainSleep ? 'border-[#444444]' : 'border-[#777777]';
        }

        // Check if the block extends beyond the bottom of the chart
        const exceedsBottom = top + height > 100;

        if (exceedsBottom) {
          // Create two blocks: one at the bottom and one wrapping to the top
          const bottomHeight = 100 - top;
          const topHeight = height - bottomHeight;

          // Bottom part of the sleep block
          const bottomBlock = document.createElement('div');
          bottomBlock.className = `sleep-block absolute ${bgColor} border ${borderColor} rounded-sm`;
          bottomBlock.style.top = `${top}%`;
          bottomBlock.style.height = `${bottomHeight}%`;
          bottomBlock.style.left = `${left}%`;
          bottomBlock.style.width = `${blockWidth}%`;
          bottomBlock.classList.add('hover:border-white', 'hover:shadow-lg', 'hover:z-10');
          // Make tooltip show up faster
          bottomBlock.dataset.bsToggle = 'tooltip';

          // Top part of the sleep block (wrapped)
          const topBlock = document.createElement('div');
          topBlock.className = `sleep-block absolute ${bgColor} border ${borderColor} rounded-sm`;
          topBlock.style.top = '0';
          topBlock.style.height = `${topHeight}%`;
          topBlock.style.left = `${left}%`;
          topBlock.style.width = `${blockWidth}%`;
          topBlock.classList.add('hover:border-white', 'hover:shadow-lg', 'hover:z-10');
          topBlock.dataset.isWrapped = 'true';
          // Make tooltip show up faster
          topBlock.dataset.bsToggle = 'tooltip';

          // Calculate drift from previous entry if possible
          let sleepDriftStr = '';
          let wakeDriftStr = '';
          if (!isPredicted && dayIndex > 0) {
            // Find the previous day's main sleep entry
            const prevDayIndex = dayIndex - 1;
            const prevDateStr = uniqueDates[prevDayIndex];
            const prevIndices = entriesByDay.get(prevDateStr) || [];

            // Find the main sleep entry from the previous day
            const prevMainIndex = prevIndices.find(idx => mainSleepIndices.includes(idx));
            if (prevMainIndex !== undefined) {
              const prevRecord = combinedData[prevMainIndex];
              const driftData = this.calculateEntryDrift(prevRecord, record);

              sleepDriftStr = ` (${this.formatDrift(driftData.sleepDrift)} drift)`;
              wakeDriftStr = ` (${this.formatDrift(driftData.wakeDrift)} drift)`;
            }
          }

          // Add data attributes and tooltip to both blocks
          const tooltip = this.formatTooltip(record, sleepTime, wakeTime, isMainSleep, isPredicted, sleepDriftStr, wakeDriftStr);

          for (const block of [bottomBlock, topBlock]) {
            block.dataset.sleep = record.sleep;
            block.dataset.wake = record.wake;
            block.dataset.rating = record.rating.toString();
            block.dataset.note = record.note;
            block.dataset.isMainSleep = isMainSleep.toString();
            block.dataset.dayIndex = dayIndex.toString();
            block.title = tooltip;
          }

          // Add to container
          sleepBlocksContainer.appendChild(bottomBlock);
          sleepBlocksContainer.appendChild(topBlock);
        } else {
          // Create a single block for sleep periods that don't wrap
          const block = document.createElement('div');
          block.className = `sleep-block absolute ${bgColor} border ${borderColor} rounded-sm`;
          block.style.top = `${top}%`;
          block.style.height = `${height}%`;
          block.style.left = `${left}%`;
          block.style.width = `${blockWidth}%`;

          // Add hover effect with Tailwind classes
          block.classList.add('hover:border-white', 'hover:shadow-lg', 'hover:z-10');

          // Make tooltip show up faster
          block.dataset.bsToggle = 'tooltip';

          // Add data attributes for details
          block.dataset.sleep = record.sleep;
          block.dataset.wake = record.wake;
          block.dataset.rating = record.rating.toString();
          block.dataset.note = record.note;
          block.dataset.isMainSleep = isMainSleep.toString();
          block.dataset.dayIndex = dayIndex.toString();

          // Calculate drift from previous entry if possible
          let sleepDriftStr = '';
          let wakeDriftStr = '';
          if (!isPredicted && dayIndex > 0) {
            // Find the previous day's main sleep entry
            const prevDayIndex = dayIndex - 1;
            const prevDateStr = uniqueDates[prevDayIndex];
            const prevIndices = entriesByDay.get(prevDateStr) || [];

            // Find the main sleep entry from the previous day
            const prevMainIndex = prevIndices.find(idx => mainSleepIndices.includes(idx));
            if (prevMainIndex !== undefined) {
              const prevRecord = combinedData[prevMainIndex];
              const driftData = this.calculateEntryDrift(prevRecord, record);

              sleepDriftStr = ` (${this.formatDrift(driftData.sleepDrift)} drift)`;
              wakeDriftStr = ` (${this.formatDrift(driftData.wakeDrift)} drift)`;
            }
          }

          // Add tooltip with sleep details
          block.title = this.formatTooltip(record, sleepTime, wakeTime, isMainSleep, isPredicted, sleepDriftStr, wakeDriftStr);

          // Add to container
          sleepBlocksContainer.appendChild(block);
        }
      });
    });
  }
}

// Register the custom element
customElements.define('sleep-chart', SleepChart);
