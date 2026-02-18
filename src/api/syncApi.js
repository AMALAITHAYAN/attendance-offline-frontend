import axiosClient from "./axiosClient";

export async function offlineSyncApi(records) {
  // Backend expects raw JSON array: List<OfflineAttendanceRequest>
  const { data } = await axiosClient.post("/api/offline-sync", records);
  return data; // OfflineSyncResponse
}
