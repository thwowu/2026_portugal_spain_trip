export function validateItinerary(phases) {
  // day should be contiguous 1..N
  const days = phases.flatMap((p) => p.days.map((d) => d.day)).sort((a, b) => a - b)
  for (let i = 0; i < days.length; i++) {
    const expected = i + 1
    if (days[i] !== expected) {
      throw new Error(`Itinerary day numbers must be contiguous starting at 1. Missing Day ${expected}.`)
    }
  }
}

