/**
 * Format time (HH:MM)
 * @param hour Hour (0-23)
 * @param minute Minute (0-59)
 * @returns Formatted time string (HH:MM)
 */
export const formatTime = (hour: number, minute: number): string => {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

/**
 * Parse time string to hours and minutes
 * @param timeStr Time string (HH:MM)
 * @returns Object with hour and minute
 */
export const parseTime = (timeStr: string): { hour: number; minute: number } => {
  const [hourStr, minuteStr] = timeStr.split(":")
  return {
    hour: Number.parseInt(hourStr, 10),
    minute: Number.parseInt(minuteStr, 10),
  }
}

/**
 * Add minutes to a time string
 * @param timeStr Time string (HH:MM)
 * @param minutesToAdd Minutes to add
 * @returns New time string (HH:MM)
 */
export const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  const { hour, minute } = parseTime(timeStr)

  let newMinute = minute + minutesToAdd
  let newHour = hour + Math.floor(newMinute / 60)
  newMinute = newMinute % 60
  newHour = newHour % 24 // Handle 24-hour wrap-around

  return formatTime(newHour, newMinute)
}

/**
 * Calculate the number of operators needed based on call volume and response rate
 * @param callVolume Number of calls
 * @param responseRate Average calls per hour per operator
 * @returns Number of operators needed
 */
export const calculateOperatorsNeeded = (callVolume: number, responseRate: number): number => {
  if (responseRate <= 0) return 0
  return Math.ceil(callVolume / responseRate)
}

/**
 * Calculate the optimal distribution of operators across provinces
 * @param totalOperatorsNeeded Total operators needed
 * @param provinces Array of provinces with operator counts
 * @param workingHours Array of hours when provinces are working
 * @returns Optimal distribution of operators
 */
export const calculateOptimalDistribution = (
  totalOperatorsNeeded: number,
  provinces: Array<{ id: string; name: string; operators: number; work_start_time: number; work_end_time: number }>,
  workingHours: number[],
): Record<string, number> => {
  // Filter provinces that are working during these hours
  const workingProvinces = provinces.filter((province) =>
    workingHours.some((hour) => hour >= province.work_start_time && hour < province.work_end_time),
  )

  if (workingProvinces.length === 0) return {}

  // Calculate total available operators
  const totalAvailableOperators = workingProvinces.reduce((sum, province) => sum + province.operators, 0)

  // If we need more operators than available, distribute proportionally
  const distribution: Record<string, number> = {}

  if (totalOperatorsNeeded >= totalAvailableOperators) {
    // Use all available operators
    workingProvinces.forEach((province) => {
      distribution[province.id] = province.operators
    })
  } else {
    // Distribute proportionally based on province capacity
    workingProvinces.forEach((province) => {
      const share = province.operators / totalAvailableOperators
      distribution[province.id] = Math.min(Math.ceil(totalOperatorsNeeded * share), province.operators)
    })

    // Ensure we're not assigning more operators than needed
    let assignedOperators = Object.values(distribution).reduce((sum, count) => sum + count, 0)

    // If we've assigned too many, reduce from provinces with the most operators
    if (assignedOperators > totalOperatorsNeeded) {
      const sortedProvinces = [...workingProvinces].sort((a, b) => distribution[b.id] - distribution[a.id])

      for (const province of sortedProvinces) {
        if (assignedOperators <= totalOperatorsNeeded) break

        const excess = assignedOperators - totalOperatorsNeeded
        const reduction = Math.min(excess, distribution[province.id] - 1)

        if (reduction > 0) {
          distribution[province.id] -= reduction
          assignedOperators -= reduction
        }
      }
    }
  }

  return distribution
}

/**
 * Generate operator shifts with staggered start times and breaks
 * @param province Province information
 * @param operatorCount Number of operators to schedule
 * @returns Array of operator shifts
 */
export interface OperatorShift {
  shiftId: number
  startTime: string
  endTime: string
  duration: number
  breakSchedule: {
    firstBreak: string
    secondBreak: string
    thirdBreak: string
    fourthBreak: string
  }
}

export const generateOperatorShifts = (
  province: { work_start_time: number; work_end_time: number },
  operatorCount: number,
  shiftDuration = 420, // 7 hours in minutes
): OperatorShift[] => {
  const shifts: OperatorShift[] = []

  // If no operators, return empty array
  if (operatorCount <= 0) return shifts

  // Generate shifts for each operator with staggered start times
  for (let i = 0; i < operatorCount; i++) {
    // Calculate staggered start time (15-minute intervals)
    const startHour = province.work_start_time
    const startMinute = (i * 15) % 60
    const hourOffset = Math.floor((i * 15) / 60)
    const actualStartHour = startHour + hourOffset

    // Ensure we don't exceed work end time
    if (actualStartHour >= province.work_end_time) continue

    const startTime = formatTime(actualStartHour, startMinute)

    // Calculate end time based on fixed duration
    const endMinutes = (actualStartHour * 60 + startMinute + shiftDuration) % (24 * 60)
    const endHour = Math.floor(endMinutes / 60)
    const endMinute = endMinutes % 60
    const endTime = formatTime(endHour, endMinute)

    // Calculate break times - distribute breaks evenly throughout the shift
    // Each break is 10 minutes long
    const breakInterval = Math.floor(shiftDuration / 5) // 4 breaks, 5 work segments

    const breakTimes = []
    for (let j = 0; j < 4; j++) {
      // Break starts after (j+1)*breakInterval minutes of work
      const breakStartMinutes = (actualStartHour * 60 + startMinute + (j + 1) * breakInterval) % (24 * 60)
      const breakStartHour = Math.floor(breakStartMinutes / 60)
      const breakStartMinute = breakStartMinutes % 60

      // Break ends 10 minutes later
      const breakEndMinutes = (breakStartMinutes + 10) % (24 * 60)
      const breakEndHour = Math.floor(breakEndMinutes / 60)
      const breakEndMinute = breakEndMinutes % 60

      breakTimes.push({
        start: formatTime(breakStartHour, breakStartMinute),
        end: formatTime(breakEndHour, breakEndMinute),
      })
    }

    shifts.push({
      shiftId: i + 1,
      startTime,
      endTime,
      duration: shiftDuration,
      breakSchedule: {
        firstBreak: `${breakTimes[0].start}-${breakTimes[0].end}`,
        secondBreak: `${breakTimes[1].start}-${breakTimes[1].end}`,
        thirdBreak: `${breakTimes[2].start}-${breakTimes[2].end}`,
        fourthBreak: `${breakTimes[3].start}-${breakTimes[3].end}`,
      },
    })
  }

  return shifts
}

/**
 * Check if an operator is on break during a specific hour
 * @param shift Operator shift
 * @param hour Hour to check
 * @returns True if operator is on break during this hour
 */
export const isOperatorOnBreak = (shift: OperatorShift, hour: number): boolean => {
  const checkBreakTime = (breakTime: string): boolean => {
    const [start] = breakTime.split("-")
    const { hour: breakHour } = parseTime(start)
    return breakHour === hour
  }

  return (
    checkBreakTime(shift.breakSchedule.firstBreak) ||
    checkBreakTime(shift.breakSchedule.secondBreak) ||
    checkBreakTime(shift.breakSchedule.thirdBreak) ||
    checkBreakTime(shift.breakSchedule.fourthBreak)
  )
}
