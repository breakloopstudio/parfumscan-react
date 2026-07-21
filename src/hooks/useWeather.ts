// src/hooks/useWeather.ts — Météo actuelle via expo-location + Open-Meteo

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { fetchWeather, getStoredCity, type WeatherData } from '../services/weather';

const POSITION_TIMEOUT_MS = 5000;

interface UseWeatherResult {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  coords: { lat: number; lon: number } | null;
  refresh: () => void;
}

export function useWeather(enabled = true): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        let pos = await Location.getLastKnownPositionAsync();

        if (!pos) {
          pos = await withTimeout(
            Location.getCurrentPositionAsync({}),
            POSITION_TIMEOUT_MS,
          );
        }

        if (pos) {
          const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
          if (mountedRef.current) {
            if (data) {
              setWeather(data);
              setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            } else setError('Impossible de récupérer la météo.');
          }
          return;
        }
      }

      const city = await getStoredCity();
      if (city) {
        const coords = await geocodeCity(city);
        if (coords) {
          const data = await fetchWeather(coords.lat, coords.lon);
          if (mountedRef.current) {
            if (data) {
              setWeather(data);
              setCoords({ lat: coords.lat, lon: coords.lon });
            } else setError('Impossible de récupérer la météo.');
          }
          return;
        }
      }

      if (mountedRef.current) {
        setError('Autorisez la localisation ou définissez une ville dans les paramètres.');
      }
    } catch (e: unknown) {
      if (mountedRef.current) {
        setError('Erreur lors de la récupération de la météo.');
      }
      console.warn('[useWeather]', (e as Error)?.message ?? String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { weather, loading, error, coords, refresh: load };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]);
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const results = await Location.geocodeAsync(city);
    if (results.length > 0) {
      return { lat: results[0].latitude, lon: results[0].longitude };
    }
    return null;
  } catch (e: unknown) {
    console.warn('[useWeather] geocode failed:', (e as Error)?.message ?? String(e));
    return null;
  }
}
