export const PLAN_LIMITS = {
  free: {
    aiPerMonth: 3,
    maxTrips: 5,
    pdf: false,
    aiPacking: false,
    sharing: false,
  },
  explorer: {
    aiPerMonth: 20,
    maxTrips: Infinity,
    pdf: true,
    aiPacking: true,
    sharing: true,
  },
  pro: {
    aiPerMonth: Infinity,
    maxTrips: Infinity,
    pdf: true,
    aiPacking: true,
    sharing: true,
  },
};

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/** Returns true if user's AI quota is still in the current calendar month */
export function isSameMonth(date) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
