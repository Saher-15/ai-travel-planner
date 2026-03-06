function toISODate(d) {
  return d.toISOString().split("T")[0];
}

function pick(arr, i) {
  return arr[i % arr.length];
}

export function generateBasicItinerary({ destination, startDate, endDate, preferences = {} }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid startDate or endDate (use YYYY-MM-DD)");
  }
  if (start > end) {
    throw new Error("startDate must be <= endDate");
  }

  const pace = preferences.pace || "moderate";
  const budget = preferences.budget || "mid";
  const interests = Array.isArray(preferences.interests) ? preferences.interests : [];

  const themes = interests.length ? interests : ["sightseeing", "food", "culture"];

  const morningTemplates = [
    "Top landmark + photos",
    "Old town walking tour",
    "Museum / history spot",
    "Local market visit",
    "Panoramic viewpoint",
  ];

  const afternoonTemplates = [
    "Lunch + neighborhood exploration",
    "Shopping street + coffee break",
    "Garden/park + chill time",
    "Second attraction nearby",
    "Local experience (small tour)",
  ];

  const eveningTemplates = [
    "Sunset + dinner",
    "City center stroll + gelato/dessert",
    "Night viewpoint + calm walk",
    "Dinner in a famous area",
    "Light nightlife (optional)",
  ];

  const paceNote =
    pace === "packed"
      ? "Packed day — start early, short breaks."
      : pace === "relaxed"
      ? "Relaxed day — long breaks, flexible timing."
      : "Moderate pace — balanced activities + breaks.";

  const days = [];
  let dayNumber = 1;
  const cur = new Date(start);

  while (cur <= end) {
    const dateStr = toISODate(cur);
    const theme = pick(themes, dayNumber - 1);

    days.push({
      day: dayNumber,
      date: dateStr,
      title: `${destination}: ${theme} day`,
      morning: [
        {
          title: `${pick(morningTemplates, dayNumber - 1)} in ${destination}`,
          durationHours: pace === "packed" ? 3 : 2,
          notes: paceNote,
          location: destination,
        },
      ],
      afternoon: [
        {
          title: `${pick(afternoonTemplates, dayNumber - 1)} in ${destination}`,
          durationHours: pace === "packed" ? 4 : 3,
          notes: budget === "low" ? "Prefer free/low-cost spots." : "Mix of free and paid activities.",
          location: destination,
        },
      ],
      evening: [
        {
          title: `${pick(eveningTemplates, dayNumber - 1)} in ${destination}`,
          durationHours: 2,
          notes: "Keep it flexible depending on energy.",
          location: destination,
        },
      ],
      foodSuggestion:
        budget === "high"
          ? "Try a highly-rated restaurant (reserve if possible)."
          : budget === "low"
          ? "Try street food / local bakery."
          : "Try a popular local restaurant.",
      backupPlan: "If weather is bad: choose a museum, indoor market, or shopping arcade.",
    });

    cur.setDate(cur.getDate() + 1);
    dayNumber++;
  }

  return {
    tripSummary: {
      destination,
      startDate,
      endDate,
      days: days.length,
      style: pace,
      budget,
    },
    days,
    tips: [
      "Check opening hours and book top attractions in advance.",
      "Group activities by area to reduce travel time.",
      budget === "low" ? "Use public transport + free attractions to save money." : "Mix paid attractions with free walks.",
    ],
  };
}