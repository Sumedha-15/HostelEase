// Core fee-engine logic, kept separate from controllers so it's unit-testable
// and reused by both the fee module and the visitor-gating logic.

const LATE_FINE_PER_WEEK = 50; // flat fine applied per week overdue
const MAX_LATE_FINE = 500;

/**
 * Computes the total payable amount for a fee record.
 */
function computeTotal({ roomRent, messCharges = 0, otherCharges = 0, lateFine = 0 }) {
  return roomRent + messCharges + otherCharges + lateFine;
}

/**
 * Given a due date, calculates the late fine that should apply *today*.
 * Grows by LATE_FINE_PER_WEEK for every week past the due date, capped at MAX_LATE_FINE.
 */
function calculateLateFine(dueDate, referenceDate = new Date()) {
  const due = new Date(dueDate);
  const now = new Date(referenceDate);
  if (now <= due) return 0;

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksLate = Math.ceil((now - due) / msPerWeek);
  return Math.min(weeksLate * LATE_FINE_PER_WEEK, MAX_LATE_FINE);
}

/**
 * Derives the correct status string from amounts + due date.
 */
function deriveStatus({ totalAmount, amountPaid, dueDate }, referenceDate = new Date()) {
  if (amountPaid >= totalAmount) return 'paid';
  if (amountPaid > 0) return 'partial';
  if (new Date(referenceDate) > new Date(dueDate)) return 'overdue';
  return 'unpaid';
}

/**
 * A student is a "fee defaulter" if they have any fee record overdue by
 * more than the given grace period (in days). This flag is what the
 * visitor module checks before letting a warden approve a new visitor,
 * and what the dashboard uses to build the defaulters list.
 */
function isDefaulter(feeRecords, gracePeriodDays = 14, referenceDate = new Date()) {
  const now = new Date(referenceDate);
  return feeRecords.some((record) => {
    if (record.status === 'paid') return false;
    const graceDeadline = new Date(record.dueDate);
    graceDeadline.setDate(graceDeadline.getDate() + gracePeriodDays);
    return now > graceDeadline;
  });
}

module.exports = {
  LATE_FINE_PER_WEEK,
  MAX_LATE_FINE,
  computeTotal,
  calculateLateFine,
  deriveStatus,
  isDefaulter,
};
