// Configured HTTP client. No business logic lives here.
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Ramène le corps d'erreur structuré de l'API à un simple Error, pour que les
// hooks puissent le remonter sans rien savoir du transport.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.error?.message ??
      error?.message ??
      'Erreur réseau inconnue'
    return Promise.reject(new Error(message))
  },
)
