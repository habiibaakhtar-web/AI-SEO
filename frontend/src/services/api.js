import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 35000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

export function getErrorMessage(error) {
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (error.code === "ECONNABORTED")
    return "This is taking longer than expected. Please try again.";
  return "We could not connect right now. Please try again.";
}
