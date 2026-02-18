import axiosClient from "./axiosClient";

export async function listAttendanceBySessionApi(sessionId) {
  const { data } = await axiosClient.get(`/api/attendance/session/${encodeURIComponent(sessionId)}`);
  return data; // AttendanceSummaryDTO[]
}

export async function getSessionSummaryApi(sessionId) {
  const { data } = await axiosClient.get(`/api/reports/session/${encodeURIComponent(sessionId)}/summary`);
  return data;
}
