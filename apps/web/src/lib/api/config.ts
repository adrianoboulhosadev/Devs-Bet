import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

// Main client: sends the cookie (withCredentials) and the Bearer via interceptor.
export const api = axios.create({ baseURL: API_URL, withCredentials: true })

// Client exclusive to /refresh: has NO interceptors (avoids a 401 loop).
export const refreshClient = axios.create({ baseURL: API_URL, withCredentials: true })
