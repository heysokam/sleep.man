# Sleep Log Presentation Application - Todo List

## Overview
This application will visualize sleep patterns using a bar chart representation where:
- Hours of the day are displayed on the Y-axis (0-24)
- Days of the selected time period are displayed on the X-axis
- Sleep blocks are represented by white rectangles with gray borders
- The background is dark gray for contrast
- Data is accessed through a JSON file containing sleep records
- Special emphasis on supporting non-24-hour sleep-wake cycles and unorthodox sleep schedules
- Built using vanilla Web Components (no React, Angular, Vue, or other frameworks)

## Project Setup

### 1. Initialize Project Structure
- [x] Create project directory
- [x] Initialize a new Vite + TypeScript project
  - [x] Configure for vanilla Web Components (no framework)
  - [x] Set up TypeScript configuration for Web Components
- [x] Install and configure Tailwind CSS
- [x] Create basic folder structure (src, components, utils, types, etc.)
- [x] Set up custom elements registry and base component class

### 2. Define Data Types and Models
- [x] Create TypeScript interfaces for sleep data:
  ```typescript
  interface SleepRecord {
    sleep: string;    // ISO datetime string for sleep start
    wake: string;     // ISO datetime string for wake time
    rating: number;   // Sleep quality rating (e.g., 1-5)
    note: string;     // Optional notes about the sleep
  }
  ```
- [x] Create utility functions for date/time manipulation
- [x] Create sample JSON data file with sleep records
- [x] Convert CSV data to JSON format for use in the application

### 3. Core Web Components Development

#### 3.1 Chart Component
- [x] Create a base chart custom element (`<sleep-chart>`) with proper scaling
  - [x] Define component API and attributes
  - [x] Set up lifecycle callbacks (connectedCallback, attributeChangedCallback, etc.)
- [x] Implement Y-axis with 24-hour time display (Completed)
  - [ ] Add option to extend beyond 24 hours for visualizing non-24-hour cycles
  - [ ] Support for continuous time representation (not just 0-24 hours)
  - [x] Add option to configure the day start time (not just 00:00)
  - [x] Add multi-timezone display (EU, NY, LA)
- [x] Implement X-axis with dates
  - [ ] Allow for variable time scales (hours, days, weeks)
  - [ ] Support for non-standard day lengths (>24 hours)
- [x] Add grid lines for better readability
  - [ ] Include option for 24-hour grid or custom period grid
- [x] Implement responsive design for different screen sizes
- [ ] Create custom events for component interactions

#### 3.2 Sleep Block Component (Completed)
- [x] Create sleep blocks within the chart component
  - [x] Define data attributes for sleep details (sleep time, wake time, quality, etc.)
- [x] Calculate position and size based on sleep and wake times
  - [x] Support for sleep periods that exceed 24 hours
  - [x] Handle free-running sleep patterns with progressive daily shifts
- [x] Style blocks with white fill and gray border
  - [ ] Consider color coding or patterns to indicate sleep quality
  - [x] Add visual indicators for sleep onset drift patterns
  - [x] Use CSS classes for styling
- [x] Add hover effects to display sleep details
  - [x] Show time since previous sleep period
  - [x] Display drift from previous day's sleep onset
- [x] Handle edge cases
  - [x] Sleep spanning multiple days
  - [x] Irregular sleep patterns
  - [x] Ultra-short or ultra-long sleep periods

#### 3.3 Data Loading and Processing (Partially Completed)
- [x] Implement data loading directly in the chart component
  - [x] Fetch and parse JSON data
  - [x] Add error handling for data loading failures
- [x] Implement data parsing and validation
  - [x] Add error handling for malformed data
- [x] Convert ISO datetime strings to JavaScript Date objects
- [x] Calculate basic sleep metrics:
  - [x] Sleep duration
  - [x] Average sleep per day (total and visible data)
  - [ ] Time between sleep periods
  - [x] Sleep onset drift (daily change in sleep time)
  - [x] Natural cycle length (may be different from 24 hours)
  - [ ] Sleep regularity index
- [x] Handle timezone considerations (Completed)
- [x] Implement algorithms to detect non-24-hour patterns
  - [x] Calculate free-running period length
  - [x] Identify progressive phase delays or advances
- [ ] Create a metrics calculator component that can be reused across the application

### 4. UI/UX Features

#### 4.1 Trend Lines (Completed)
- [x] Implement trend lines connecting consecutive sleep and wake times
  - [x] Create separate trend lines for sleep onset and wake times
  - [x] Use different colors for sleep (magenta) and wake (cyan) trend lines
  - [x] Handle wrapping of trend lines when they cross midnight
  - [x] Add data points at each sleep and wake time
  - [x] Distinguish between main sleep periods and naps
  - [x] Add legend explaining the trend line colors and symbols
- [x] Ensure trend lines remain visible at all times (not just on hover)
- [x] Implement proper handling of sleep periods that wrap around midnight

#### 4.2 Chart Configuration Controls (Partially Completed)
- [ ] Create a chart configuration panel custom element (`<chart-config-panel>`)
  - [ ] Define component API with attributes for various chart settings
  - [ ] Implement shadow DOM and internal template
  - [ ] Add custom events for configuration changes
- [x] Create day start time selector
  - [x] Add time input or dropdown for selecting hour (0-23)
  - [x] Update chart display based on selected hour
  - [ ] Provide visual preview of how the chart will appear
- [x] Add option to limit number of displayed entries
  - [x] Add numeric input for specifying maximum entries to show
  - [x] Filter data based on the specified limit
  - [x] Update chart to show only the most recent entries
- [x] Add toggles for chart elements visibility
  - [x] Add toggle for sleep blocks
  - [x] Add toggle for sleep trend lines
  - [x] Add toggle for wake trend lines
  - [x] Add legend with toggle controls
- [ ] Add option to toggle between 12-hour and 24-hour time format
- [ ] Create controls for visual customization (colors, grid density, etc.)

#### 4.3 Time Period Selection
- [ ] Create a time period selector custom element (`<time-period-selector>`)
  - [ ] Define component API with attributes for range type and dates
  - [ ] Implement shadow DOM and internal template
  - [ ] Add custom events for selection changes
- [ ] Create controls to select date range (week, month, custom)
  - [ ] Add option for non-standard periods (e.g., 10-day view, 30-day view)
  - [ ] Support for viewing by natural cycle length instead of calendar days
- [ ] Implement pagination for navigating through time periods
  - [ ] Allow navigation by sleep cycles rather than just calendar days
  - [ ] Create navigation buttons as separate components
- [ ] Add quick navigation to current week/month
- [ ] Implement zoom functionality to focus on specific time ranges
  - [ ] Create a zoom control custom element
- [ ] Add option to view data in continuous time rather than day-by-day format

#### 4.4 Sleep Details Panel
- [ ] Create a sleep details custom element (`<sleep-details-panel>`)
  - [ ] Define component API for receiving selected sleep data
  - [ ] Implement shadow DOM for styling encapsulation
  - [ ] Add event listeners for sleep block selection
- [ ] Show sleep duration, quality rating, and notes
  - [ ] Create sub-components for different types of data visualization
- [ ] Add visual indicators for sleep quality
  - [ ] Create a rating component with customizable display options

#### 4.5 Statistics and Insights (Partially Completed)
- [ ] Create a statistics dashboard custom element (`<sleep-statistics>`)
  - [ ] Define component API for receiving sleep data
  - [ ] Implement shadow DOM and templating
  - [ ] Create modular design for different statistic types
- [ ] Calculate and display average sleep metrics:
  - [ ] Sleep duration
  - [ ] Sleep onset time and variability
  - [ ] Wake time and variability
- [ ] Create a sleep patterns component (`<sleep-patterns-analysis>`)
  - [ ] Show sleep pattern consistency metrics
  - [ ] Regularity index
  - [ ] Cycle-to-cycle stability
- [x] Create a non-24-hour analysis component
  - [x] Calculate free-running period (tau)
  - [x] Measure daily drift in sleep onset
  - [x] Display overall and current drift values
  - [ ] Detect entrainment attempts and temporary synchronizations
  - [ ] Identify phase jumps or abrupt shifts
  - [ ] Add more detailed non-24 metrics (phase angle, stability index)
- [x] Create a trends visualization component (implemented directly in sleep-chart)
  - [x] Visualize sleep quality trends over time
  - [ ] Generate insights about optimal sleep windows based on quality ratings

### 5. Advanced Features

#### 5.1 Data Entry Form
- [ ] Create a sleep record form custom element (`<sleep-record-form>`)
  - [ ] Define component API for creating/editing records
  - [ ] Implement shadow DOM and form template
  - [ ] Add form validation and error handling
- [ ] Create date/time picker components
  - [ ] Implement custom datetime input with validation
  - [ ] Support for different time formats
- [ ] Implement validation for sleep/wake times
  - [ ] Create validation utility functions
  - [ ] Add visual feedback for validation errors
- [ ] Add ability to edit existing records
  - [ ] Create edit mode with pre-populated fields
  - [ ] Implement optimistic updates
- [ ] Implement deletion of records
  - [ ] Add confirmation dialog component
  - [ ] Handle cascading updates to visualizations

#### 5.2 Data Persistence
- [ ] Implement saving changes to JSON file
- [ ] Add export functionality (CSV, PDF)
- [ ] Consider implementing local storage backup

#### 5.3 Sleep Prediction (Completed)
- [x] Implement sleep prediction functionality
  - [x] Create a configuration panel for prediction settings
    - [x] Add input for number of days to predict (default: 30)
    - [x] Add input for number of days to use in the average calculation
    - [x] Set averaging days to total number of days in dataset by default
  - [x] Develop algorithm to predict future sleep entries
    - [x] Calculate average daily drift based on specified number of past days
    - [x] Account for non-24-hour patterns in predictions
    - [x] Ensure predictions are based on offset from real 24h clock
    - [x] Calculate wake time first using visible drift, then calculate sleep time backwards
  - [x] Visualize predicted sleep entries
    - [x] Display predicted entries to the right of real data
    - [x] Use distinct styling for predicted entries (monochrome with dashed borders)
    - [x] Omit trend marks/lines for predicted entries
    - [x] Implement hover functionality to show predicted date/time details
  - [x] Add toggle to show/hide predictions (enabled by default)
  - [x] Ensure predictions are never saved to the JSON data file

#### 5.4 Pattern Analysis
- [ ] Implement advanced algorithms to detect sleep pattern irregularities
  - [ ] Fourier analysis to identify underlying rhythms
  - [ ] Pattern matching for known circadian disorders
  - [ ] Machine learning approaches for personalized pattern detection
- [ ] Add visualization of ideal vs. actual sleep patterns
  - [ ] Compare to standard 24-hour patterns
  - [ ] Compare to personalized optimal pattern
  - [ ] Show entrainment targets for non-24-hour rhythms
- [ ] Calculate sleep debt and recovery periods
  - [ ] Account for individual's natural cycle length
  - [ ] Track cumulative sleep debt over variable time periods
- [ ] Comprehensive non-24-hour sleep-wake disorder analysis
  - [ ] Detect free-running patterns with period >24 hours
  - [ ] Identify temporary entrainment periods
  - [ ] Calculate phase angle between sleep propensity and external time
  - [ ] Suggest potential interventions based on pattern analysis

### 6. Testing and Optimization

- [ ] Write unit tests for core functionality
- [ ] Perform cross-browser testing
- [ ] Optimize performance for large datasets
- [ ] Ensure accessibility compliance

### 7. Documentation

- [ ] Create user documentation
- [ ] Add inline code documentation
- [ ] Create README with setup instructions
- [ ] Document data format specifications

## Implementation Notes

### Sleep Block Calculation Logic (Completed)
1. Convert sleep and wake times to Date objects
2. Calculate the hour and minute for positioning on Y-axis
3. Calculate the day index for positioning on X-axis
4. Handle sleep periods that cross midnight
5. Calculate duration for determining block height

### Configurable Day Start Time Implementation (Completed)
1. Add configuration option for day start time
   - Create a UI control to select the hour (0-23) when the day should start
   - Default to 0 (midnight) for backward compatibility
   - Store the setting in a component property
2. Modify Y-axis rendering
   - Adjust the hour labels to start from the configured day start time
   - Ensure the 24-hour cycle is maintained (e.g., if start time is 4:00, show 4:00-3:59)
   - Update grid lines to align with the new hour positions
3. Adjust sleep block positioning
   - Recalculate the vertical position of sleep blocks based on the new day start time
   - Adjust the wrapping logic for blocks that cross the new day boundary
   - Ensure blocks that span across the new day boundary are properly split
4. Update trend line calculations
   - Adjust the wrapping logic for trend lines based on the new day boundary
   - Ensure trend lines connect properly across the new day boundary
5. Modify hover information
   - Update the time display in tooltips to reflect the new day context
   - Ensure the day attribution is correct based on the new day boundary

### Entry Limit Implementation (Completed)
1. Add configuration option for maximum entries to display
   - Create a numeric input field for specifying the maximum number of entries
   - Default to 0 (show all entries)
   - Store the setting in a component property
2. Filter data in rendering methods
   - Add filtering logic to all rendering methods (sleep blocks, X-axis, trend lines)
   - Use slice(-maxEntries) to show only the most recent entries when a limit is set
   - Maintain the same filtering logic across all visualization components
3. Update UI when the value changes
   - Re-render the chart components when the maximum entries setting changes
   - Ensure consistent behavior when switching between limited and unlimited views

### Sleep Prediction Implementation (Completed)
1. Calculate the average daily drift in sleep onset and wake times
   - For each sleep entry, calculate the time difference from the previous day's entry
   - Average these differences over the specified number of past days
   - Account for both sleep onset and wake time drift separately
   - Default to 24h30m drift if not enough data is available
2. Generate predicted sleep entries
   - Start from the last real sleep entry
   - Apply the calculated average drift to generate future entries
   - Create predicted entries for the specified number of days
   - Include average rating from past entries
   - Compute wake time first using visible drift, then calculate sleep time by working backwards
3. Visualize predicted entries
   - Use monochrome styling with dashed borders to distinguish from real data
   - Position entries to the right of real data on the timeline
   - Add warning indicator in tooltips for predicted entries
   - Show dots for predicted entries but omit trend lines
4. User configuration
   - Added controls in the top-right corner of the chart
   - Toggle checkbox to show/hide predictions (enabled by default)
   - Input field for number of days to predict (default: 30)
   - Input field for number of past days to use for averaging (default: total days in dataset)
5. Implementation details
   - Predictions are generated on-the-fly and never saved to the JSON data file
   - Used transparent backgrounds with white/gray dashed borders for predicted entries
   - Added predicted entries to the legend with appropriate styling
   - Recalculate predictions whenever real data or configuration changes

## Implementation Details

#### Non-24 Analysis Box Implementation (Completed)
1. Add information display in the bottom-right corner
   - Created a container for non-24 specific metrics and analysis
   - Styled with semi-transparent background to match other UI elements
   - Updates dynamically when data or settings change
2. Calculate and display key non-24 metrics
   - Cycle length (number of days to complete a full loop back to the same time)
   - Total drift (how much the sleep cycle drifts from a standard 24h day)
   - Visualized drift (drift calculated from only the currently displayed entries)
   - Average sleep per day (both total and visible data)
3. Improved formatting and clarity
   - Fixed drift calculation to show only the drift part (e.g., +30m instead of +24h 30m)
   - Added plus/minus signs to drift values to clearly show direction
   - Used more descriptive labels to explain what each value represents
   - Added tooltip to explain what "visualized drift" means
   - Formatted sleep duration as '6h 30m' without '/day' suffix
   - Separated drift values from sleep values with a soft separator
4. Implemented cycle length calculation
   - Calculated as 24h divided by the daily drift amount
   - Shows how many days it takes for the sleep cycle to loop completely
   - Handles edge cases like very small drift values
   - Displays in weeks and days format (e.g., '4w 5d') for better readability
5. Enhanced sleep entry tooltips
   - Added drift information inline with sleep and wake times
   - Shows drift compared to previous day's entry in parentheses
   - Made tooltips appear faster with data-bs-toggle attribute
   - Improved tooltip formatting for better readability
   - Display sleep/wake times in 24-hour format
6. Improved prediction averaging
   - Set averaging days to use total number of days in the dataset by default
   - Added tooltip to explain the default behavior
   - Ensures predictions are based on all available historical data

### Timezone Implementation (Completed)
1. Multi-timezone display
   - Added timezone headers at the top of the chart
   - Implemented three timezone columns: EU, NY, and LA
   - Display hour values in 24-hour format with leading zeros
   - Added visual separators between timezone columns
2. Y-axis formatting
   - Formatted hours with leading zeros (e.g., '00' instead of '0')
   - Displayed all three timezones simultaneously for each hour
   - Ensured proper alignment with the chart grid
3. Timezone calculations
   - Used JavaScript's built-in timezone conversion capabilities
   - Properly handled daylight saving time differences
   - Maintained consistent display across timezone changes
4. Visual design
   - Added subtle borders between timezone columns
   - Used consistent styling with the rest of the chart
   - Ensured readability with appropriate text size and contrast

### Future Enhancements for Non-24-Hour Sleep-Wake Patterns
- [x] Implement visualization that highlights when sleep onset progressively delays
- [x] Add trend lines to show sleep onset drift over time
- [x] Calculate and display the average daily drift in sleep onset time
- [x] Provide visual indicators when patterns suggest non-24-hour rhythms
- [x] Support for visualizing free-running periods (tau) that differ from 24 hours
- [x] Implement sleep prediction based on calculated drift
- [ ] Implement tools to measure phase angle between sleep times and external time
- [ ] Add visualization of entrainment attempts and temporary synchronizations
- [ ] Include reference information about non-24-hour sleep-wake disorder
  - [ ] Typical free-running periods (24.2-25.5 hours in sighted individuals)
  - [ ] Common patterns in blind vs. sighted individuals
  - [ ] Relationship between sleep quality and alignment with natural rhythm
- [ ] Provide options to view data in both 24-hour format and natural cycle length format

### Color Scheme
- Background: Dark gray (#222222)
- Grid lines: Medium gray (#444444)
- Sleep blocks: White (#FFFFFF) with light gray border (#AAAAAA)
- Text: Light gray (#DDDDDD)
- Accent colors for UI elements: Blue (#3B82F6)
- Sleep quality indicators: Color gradient from red (poor) to green (excellent)

## Resources

### Development Resources
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Web Components Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) - MDN guide to Web Components
- [Custom Elements](https://developers.google.com/web/fundamentals/web-components/customelements) - Google's guide to Custom Elements
- [Shadow DOM](https://developers.google.com/web/fundamentals/web-components/shadowdom) - Understanding Shadow DOM
- [HTML Templates](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) - Using HTML templates
- [Date-fns Library](https://date-fns.org/) - Useful for date manipulations
- [D3.js](https://d3js.org/) - Library for data visualization (can be used with Web Components)

### Sleep and Circadian Rhythm Resources
- [Non-24-Hour Sleep-Wake Disorder](https://en.wikipedia.org/wiki/Non-24-hour_sleep%E2%80%93wake_disorder) - Wikipedia article
- [Clinical analyses of sighted patients with non-24-hour sleep-wake syndrome](https://pubmed.ncbi.nlm.nih.gov/16218077/) - Research paper
- [Circadian Rhythm Sleep Disorders](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2082099/) - AASM review
- [Sensitivity of the human circadian pacemaker to nocturnal light](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2270041/) - Research on light effects
- [Entrainment of free-running circadian rhythms by melatonin in blind people](https://doi.org/10.1056/NEJM200010123431503) - Research on melatonin
