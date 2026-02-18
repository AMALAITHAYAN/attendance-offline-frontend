import axios from "axios";

// In CRA dev, we set "proxy" in package.json to http://localhost:8080
// For other environments (e.g., mobile WebView), set REACT_APP_API_BASE, e.g.:
//   REACT_APP_API_BASE=http://192.168.1.5:8080
const baseURL = process.env.REACT_APP_API_BASE || "";

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
