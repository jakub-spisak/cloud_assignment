import { getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Požiadavka zlyhala.');
  }
  return data;
}

function withAuth(headers = {}) {
  const token = getToken();
  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    : headers;
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return handleResponse(response);
}

export async function fetchMe() {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: withAuth()
  });

  return handleResponse(response);
}

export async function fetchNotes() {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    headers: withAuth()
  });
  return handleResponse(response);
}

export async function fetchNote(id) {
  const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    headers: withAuth()
  });
  return handleResponse(response);
}

export async function uploadNote({ file, title, subject }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title || '');
  formData.append('subject', subject || '');

  const response = await fetch(`${API_BASE_URL}/api/notes/process`, {
    method: 'POST',
    headers: withAuth(),
    body: formData
  });

  return handleResponse(response);
}

export async function deleteNote(id) {
  const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
    method: 'DELETE',
    headers: withAuth()
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Mazanie zlyhalo.');
  }
}
