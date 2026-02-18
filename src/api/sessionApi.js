import axiosClient from "./axiosClient";

export async function startSessionApi(req) {
  // req fields must match backend StartSessionRequest
  const { data } = await axiosClient.post("/api/session/start", req);
  return data;
}

export async function closeSessionApi(sessionId) {
  const { data } = await axiosClient.put(`/api/session/${encodeURIComponent(sessionId)}/close`);
  return data;
}

export async function getSessionApi(sessionId) {
  const { data } = await axiosClient.get(`/api/session/${encodeURIComponent(sessionId)}`);
  return data;
}

export async function getSessionTeacherViewApi(sessionId) {
  const { data } = await axiosClient.get(`/api/session/${encodeURIComponent(sessionId)}/teacher-view?includeSecret=true`);
  return data;
}
