// server.js
const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON en requests
app.use(express.json());

// Servir archivos estáticos de la carpeta "public"
app.use(express.static(path.join(__dirname, "public")));

// normaliza distintas posibles claves a: { title, artist, duration, requestedBy }
function normalizeSong(raw) {
  if (!raw) return { title: '', artist: '', duration: '', requestedBy: '' };
  if (typeof raw === 'string') return { title: raw, artist: '', duration: '', requestedBy: '' };
  const keys = Object.keys(raw || {});
  const find = (...names) => {
    for (const n of names) {
      if (raw[n] !== undefined) return raw[n];
      const k = keys.find(k => k.toLowerCase() === n.toLowerCase());
      if (k) return raw[k];
    }
    return undefined;
  };
  return {
    title: find('title', 'titulo', 'name', 'song', 'track') || '',
    artist: find('artist', 'artista', 'author', 'by', 'singer') || '',
    duration: find('duration', 'duracion', 'length', 'time') || '',
    requestedBy: find('requestedBy', 'requester', 'usuario', 'user', 'requested_by') || ''
  };
}

// extrae una lista de canciones desde estructuras comunes
function extractSongs(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed.map(normalizeSong);
  if (typeof parsed === 'object') {
    const candidates = ['queue', 'songs', 'items', 'tracks', 'list'];
    for (const c of candidates) if (Array.isArray(parsed[c])) return parsed[c].map(normalizeSong);
    for (const v of Object.values(parsed)) if (Array.isArray(v)) return v.map(normalizeSong);
    return [normalizeSong(parsed)];
  }
  return [];
}

// endpoint que devuelve la cola directamente desde Songify v2
app.get('/cola', async (req, res) => {
  try {
    const SONGIFY_UUID = "007dea0d-6420-419b-a2cd-8b09cbea010e";
    const response = await fetch(`https://api.songify.rocks/v2/queue?uuid=${SONGIFY_UUID}`);
    const raw = await response.json();

    const songs = extractSongs(raw);
    return res.json({ success: true, source: 'songify', songs });
  } catch (err) {
    console.error("Error consultando Songify:", err);
    return res.status(500).json({ success: false, error: 'No se pudo obtener la cola desde Songify' });
  }
});

// fallback: servir index.html desde "public"
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
