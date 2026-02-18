import { putPending, getAllPending, deletePending } from "./IndexedDBService";

export async function saveOfflineAttendance(item) {
  // Ensure stable unique key
  const id = item.id || `${item.sessionId}_${item.studentId}`;
  await putPending({ ...item, id });
  return id;
}

export async function listOfflineAttendance() {
  return await getAllPending();
}

export async function removeOfflineAttendance(id) {
  await deletePending(id);
}
