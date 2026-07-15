import { useEffect, useRef, useState } from 'react';

// Nominatim (OpenStreetMap) — servicio público y gratuito de geocoding,
// sin API key. Para un proyecto en producción con volumen real conviene
// un proveedor con SLA (Google Places, Mapbox, etc.), pero para este
// alcance es exactamente lo que se necesita: autocompletar la dirección
// sin agregar credenciales ni costo.
const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const MIN_CHARS = 4;
const DEBOUNCE_MS = 450;

function houseNumberFromQuery(query) {
  const match = query.trim().match(/(\d+[a-zA-Z]?)\s*$/);
  return match ? match[1] : '';
}

function buildStreetLabel(address, fallbackNumber) {
  const road = address.road || address.pedestrian || address.footway || '';
  const number = address.house_number || fallbackNumber || '';
  return [road, number].filter(Boolean).join(' ') || null;
}

export default function StreetAutocomplete({ value, onChange, onSelectSuggestion, id, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    if (!value || value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          format: 'jsonv2',
          addressdetails: '1',
          countrycodes: 'cl',
          limit: '5',
          'accept-language': 'es',
          q: value
        });
        const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        // Si Nominatim falla o no hay conexión, el usuario simplemente
        // sigue escribiendo la dirección a mano — nunca bloquea el form.
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const handleSelect = async (item) => {
    const typedNumber = houseNumberFromQuery(value);
    skipNextSearch.current = true;
    setOpen(false);
    setSuggestions([]);

    // La búsqueda inicial de Nominatim a veces devuelve solo el centro de
    // la calle (sin número exacto ni código postal), aunque el usuario sí
    // haya escrito el número. Una consulta de "reverse geocoding" sobre
    // las coordenadas exactas del resultado elegido, a nivel de edificio
    // (zoom=18), suele traer el house_number y el postcode reales — así
    // se completa la dirección exacta en vez de quedarse con el
    // aproximado de la búsqueda por texto.
    let refinedAddress = item.address || {};
    setResolving(true);
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        addressdetails: '1',
        zoom: '18',
        'accept-language': 'es',
        lat: item.lat,
        lon: item.lon
      });
      const res = await fetch(`${REVERSE_URL}?${params.toString()}`);
      if (res.ok) {
        const reverseData = await res.json();
        if (reverseData?.address) {
          // El reverse gana solo en los campos que sí trae; si tampoco
          // tiene house_number, se conserva el de la búsqueda original
          // (o el que el usuario tipeó a mano).
          refinedAddress = { ...item.address, ...reverseData.address };
        }
      }
    } catch {
      // Si el reverse falla, se sigue con lo que ya trajo la búsqueda —
      // no vale la pena bloquear la selección por esto.
    } finally {
      setResolving(false);
    }

    onSelectSuggestion({
      street: buildStreetLabel(refinedAddress, typedNumber) || item.display_name.split(',')[0],
      city: refinedAddress.city || refinedAddress.town || refinedAddress.municipality || refinedAddress.village || refinedAddress.county || '',
      region: refinedAddress.state || '',
      zipCode: refinedAddress.postcode || ''
    });
  };

  return (
    <div className="address-autocomplete" ref={containerRef}>
      <input
        id={id}
        required
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
      />
      {(loading || resolving) && <span className="address-autocomplete__spinner" aria-hidden="true" />}
      {open && suggestions.length > 0 && (
        <ul className="address-autocomplete__list" role="listbox">
          {suggestions.map((item) => (
            <li key={item.place_id}>
              <button type="button" onClick={() => handleSelect(item)}>
                <span className="address-autocomplete__pin" aria-hidden="true">
                  📍
                </span>
                <span>{item.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
