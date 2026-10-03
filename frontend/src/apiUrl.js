const configured = import.meta.env.VITE_API_URL;
const fallback = import.meta.env.PROD
  ? 'https://leadflow-7cxt.onrender.com'
  : 'http://localhost:5000';

export const API_URL = String(configured || fallback).replace(/\/$/, '');
