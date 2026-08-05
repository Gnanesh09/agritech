import axios from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  console.error("NEXT_PUBLIC_API_URL environment variable is not set");
}

const api = axios.create({
  baseURL: `${apiUrl}/api`,
  withCredentials: true,
});

export default api;