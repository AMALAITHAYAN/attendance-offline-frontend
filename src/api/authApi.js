import axiosClient from "./axiosClient";

export async function loginApi(email, password) {
  const { data } = await axiosClient.post("/api/auth/login", { email, password });
  return data; // { token, user }
}

export async function registerApi(payload) {
  // payload: {name,email,password,role}
  const { data } = await axiosClient.post("/api/auth/register", payload);
  return data; // user
}
