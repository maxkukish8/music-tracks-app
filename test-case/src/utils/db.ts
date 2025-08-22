// test-case/src/utils/db.ts
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { Track, QueryParams, BatchDeleteResponse } from '../types';
import config from '../config';

/**
 * Database file paths
 */
interface DbPaths {
  tracksDir: string;
  uploadsDir: string;
  genresFile: string;
}

/**
 * Result of getTracks with pagination
 */
interface GetTracksResult {
  tracks: Track[];
  total: number;
}

/* -------------------------- GLITCH/ENV-FIRST PATHS -------------------------- */

// Базова директорія для даних: ENV → config → .data
const DEFAULT_DATA_DIR = process.env.DATA_DIR || (config as any)?.storage?.baseDir || path.join(process.cwd(), '.data');

// Даємо можливість перекрити кожен шлях окремо через ENV.
// Якщо ENV немає — беремо з config.storage, якщо й там немає — з DEFAULT_DATA_DIR.
const TRACKS_DIR =
    process.env.TRACKS_DIR ||
    (config as any)?.storage?.tracksDir ||
    path.join(DEFAULT_DATA_DIR, 'tracks');

const UPLOADS_DIR =
    process.env.UPLOADS_DIR ||
    (config as any)?.storage?.uploadsDir ||
    path.join(DEFAULT_DATA_DIR, 'uploads');

const GENRES_FILE =
    process.env.GENRES_FILE ||
    (config as any)?.storage?.genresFile ||
    path.join(DEFAULT_DATA_DIR, 'genres.json');

// Логування шляхів — тільки в деві
if ((config as any)?.isDevelopment) {
  console.log('[storage] Using paths:');
  console.log('  DATA_DIR  :', DEFAULT_DATA_DIR);
  console.log('  TRACKS_DIR:', TRACKS_DIR);
  console.log('  UPLOADS_DIR:', UPLOADS_DIR);
  console.log('  GENRES_FILE:', GENRES_FILE);
}

/* --------------------------------- INIT DB --------------------------------- */

export const initializeDb = async (): Promise<void> => {
  try {
    await fsp.mkdir(TRACKS_DIR, { recursive: true });
    await fsp.mkdir(UPLOADS_DIR, { recursive: true });

    // Якщо genres.json відсутній — спробуємо скопіювати із data-initial/genres.json
    try {
      await fsp.access(GENRES_FILE, fs.constants.F_OK);
    } catch {
      const initialDir = path.join(process.cwd(), 'data-initial');
      const initialGenres = path.join(initialDir, 'genres.json');

      let seeded = false;
      try {
        await fsp.access(initialGenres, fs.constants.F_OK);
        await fsp.copyFile(initialGenres, GENRES_FILE);
        seeded = true;
        if ((config as any)?.isDevelopment) {
          console.log('[storage] Seeded genres from data-initial/genres.json');
        }
      } catch {
        // ignore, підемо на дефолтні жанри нижче
      }

      if (!seeded) {
        const defaultGenres = [
          'Rock', 'Pop', 'Hip Hop', 'Jazz', 'Classical', 'Electronic',
          'R&B', 'Country', 'Folk', 'Reggae', 'Metal', 'Blues', 'Indie'
        ];
        await fsp.writeFile(GENRES_FILE, JSON.stringify(defaultGenres, null, 2), 'utf-8');
        if ((config as any)?.isDevelopment) {
          console.log('[storage] Created default genres.json');
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/* --------------------------------- QUERIES --------------------------------- */

export const getGenres = async (): Promise<string[]> => {
  try {
    const data = await fsp.readFile(GENRES_FILE, 'utf-8');
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Failed to read genres:', error);
    return [];
  }
};

export const getTracks = async (params: QueryParams = {}): Promise<GetTracksResult> => {
  try {
    const files = await fsp.readdir(TRACKS_DIR);
    let tracks: Track[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fsp.readFile(path.join(TRACKS_DIR, file), 'utf-8');
        tracks.push(JSON.parse(content));
      }
    }

    // Filtering
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      tracks = tracks.filter(track =>
          track.title.toLowerCase().includes(searchLower) ||
          track.artist.toLowerCase().includes(searchLower) ||
          (track.album && track.album.toLowerCase().includes(searchLower))
      );
    }

    if (params.genre) {
      tracks = tracks.filter(track => track.genres.includes(params.genre as string));
    }

    if (params.artist) {
      const artistLower = (params.artist as string).toLowerCase();
      tracks = tracks.filter(track => track.artist.toLowerCase().includes(artistLower));
    }

    // Sorting
    if (params.sort) {
      const sortField = params.sort as keyof Track;
      const sortOrder = (params.order || 'asc') as 'asc' | 'desc';

      tracks.sort((a, b) => {
        const valueA = (a[sortField] ?? '') as string;
        const valueB = (b[sortField] ?? '') as string;

        if (typeof valueA === 'string' && typeof valueB === 'string') {
          return sortOrder === 'asc'
              ? valueA.localeCompare(valueB)
              : valueB.localeCompare(valueA);
        }
        return 0;
      });
    } else {
      // За замовчуванням — новіші зверху
      tracks.sort(
          (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = tracks.length;

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      tracks: tracks.slice(start, end),
      total
    };
  } catch (error) {
    console.error('Failed to read tracks:', error);
    return { tracks: [], total: 0 };
  }
};

export const getTrackBySlug = async (slug: string): Promise<Track | null> => {
  try {
    const files = await fsp.readdir(TRACKS_DIR);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fsp.readFile(path.join(TRACKS_DIR, file), 'utf-8');
        const track: Track = JSON.parse(content);
        if (track.slug === slug) return track;
      }
    }
    return null;
  } catch (error) {
    console.error(`Failed to get track by slug ${slug}:`, error);
    return null;
  }
};

export const getTrackById = async (id: string): Promise<Track | null> => {
  try {
    const filePath = path.join(TRACKS_DIR, `${id}.json`);
    const content = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Track;
  } catch {
    return null;
  }
};

export const createTrack = async (
    track: Omit<Track, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Track> => {
  const id = Date.now().toString();
  const now = new Date().toISOString();

  const newTrack: Track = {
    ...track,
    id,
    createdAt: now,
    updatedAt: now
  };

  await fsp.writeFile(
      path.join(TRACKS_DIR, `${id}.json`),
      JSON.stringify(newTrack, null, 2),
      'utf-8'
  );

  return newTrack;
};

export const updateTrack = async (
    id: string,
    updates: Partial<Track>
): Promise<Track | null> => {
  try {
    const track = await getTrackById(id);
    if (!track) return null;

    const updatedTrack: Track = {
      ...track,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await fsp.writeFile(
        path.join(TRACKS_DIR, `${id}.json`),
        JSON.stringify(updatedTrack, null, 2),
        'utf-8'
    );

    return updatedTrack;
  } catch (error) {
    console.error(`Failed to update track ${id}:`, error);
    return null;
  }
};

export const deleteTrack = async (id: string): Promise<boolean> => {
  try {
    const track = await getTrackById(id);
    if (!track) return false;

    // Видаляємо JSON треку
    try {
      await fsp.unlink(path.join(TRACKS_DIR, `${id}.json`));
    } catch (e) {
      // якщо файлу не було — не валимо все
    }

    // Видаляємо пов’язаний аудіофайл, якщо є
    if (track.audioFile) {
      try {
        await fsp.unlink(path.join(UPLOADS_DIR, track.audioFile));
      } catch (error) {
        console.error(`Failed to delete audio file for track ${id}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error(`Failed to delete track ${id}:`, error);
    return false;
  }
};

export const deleteMultipleTracks = async (ids: string[]): Promise<BatchDeleteResponse> => {
  const results: BatchDeleteResponse = { success: [], failed: [] };

  for (const id of ids) {
    const success = await deleteTrack(id);
    if (success) results.success.push(id);
    else results.failed.push(id);
  }

  return results;
};

export const saveAudioFile = async (
    id: string,
    fileName: string,
    buffer: Buffer
): Promise<string> => {
  const fileExt = path.extname(fileName);
  const safeFileName = `${id}${fileExt}`;
  const filePath = path.join(UPLOADS_DIR, safeFileName);

  await fsp.writeFile(filePath, buffer);
  return safeFileName;
};

export const deleteAudioFile = async (id: string): Promise<boolean> => {
  try {
    const track = await getTrackById(id);
    if (!track || !track.audioFile) return false;

    try {
      await fsp.unlink(path.join(UPLOADS_DIR, track.audioFile));
    } catch {
      // ігноруємо, якщо файла вже немає
    }

    await updateTrack(id, { audioFile: undefined });
    return true;
  } catch (error) {
    console.error(`Failed to delete audio file for track ${id}:`, error);
    return false;
  }
};
