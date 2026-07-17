// Pure logic for picking the best room for a student out of a candidate list.
// Kept framework-free so it can be unit tested without touching MongoDB.

/**
 * Scores a room against a student's preferences. Higher score = better match.
 * Filters out rooms that are full or gender-mismatched before scoring.
 */
function findBestRoom(rooms, { preferredRoomType, preferredFloor, studentGender }) {
  const eligible = rooms.filter((room) => {
    const hasSpace = (room.capacity - room.occupants.length) > 0;
    const notMaintenance = room.status === 'active';
    const genderOk = !room.hostelGender || room.hostelGender === 'co-ed' || room.hostelGender === studentGender;
    return hasSpace && notMaintenance && genderOk;
  });

  if (eligible.length === 0) return null;

  const scored = eligible.map((room) => {
    let score = 0;
    if (preferredRoomType && room.roomType === preferredRoomType) score += 2;
    if (preferredFloor !== null && preferredFloor !== undefined && room.floor === preferredFloor) score += 1;
    // Prefer rooms that are more full (efficient packing) as a tiebreaker
    score += room.occupants.length / room.capacity;
    return { room, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].room;
}

/**
 * Computes the next waitlist position for a hostel/roomType queue.
 */
function nextWaitlistPosition(existingWaitlistedAllocations) {
  if (!existingWaitlistedAllocations || existingWaitlistedAllocations.length === 0) return 1;
  const maxPos = Math.max(...existingWaitlistedAllocations.map((a) => a.waitlistPosition || 0));
  return maxPos + 1;
}

/**
 * Validates whether two allocations can be swapped:
 * - both must currently be 'allocated'
 * - both rooms must belong to a hostel matching each student's gender category
 *   (checked by caller passing in the right gender flags)
 */
function canSwap(allocationA, allocationB) {
  if (!allocationA || !allocationB) return { ok: false, reason: 'Both allocations must exist' };
  if (allocationA.status !== 'allocated' || allocationB.status !== 'allocated') {
    return { ok: false, reason: 'Both students must currently be allocated to swap rooms' };
  }
  if (String(allocationA.room) === String(allocationB.room)) {
    return { ok: false, reason: 'Students are already in the same room' };
  }
  return { ok: true };
}

module.exports = { findBestRoom, nextWaitlistPosition, canSwap };
