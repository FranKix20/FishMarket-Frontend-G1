import { useEffect, useRef, useState } from 'react';

// Nominatim (OpenStreetMap) — servicio público y gratuito de geocoding,
// sin API key. Para un proyecto en producción con volumen real conviene
// un proveedor con SLA (Google Places, Mapbox, etc.), pero para este
// alcance es exactamente lo que se necesita: autocompletar la dirección
// sin agregar credenciales ni costo.
const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const MIN_CHARS = 4;
const DEBOUNCE_MS = 450;

/**
 * Extrae "Calle Número" desde la respuesta de Nominatim en vez de usar
 * su display_name completo (que repite comuna/región/país y queda muy
 * largo dentro del input).
 */
function shortLabel(item) {
  const a = item.address || {};
  const road = a.road || a.pedestrian || a.footway || '';
  const houseNumber = a.house_number || '';
  const composed = [road, houseNumber].filter(Boolean).join(' ');
  return composed || item.display_name.split(',')[0];
}

export default function StreetAutocomplete({ value, onChange, onSelectSuggestion, id, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSelect = (item) => {
    const a = item.address || {};
    skipNextSearch.current = true;
    setOpen(false);
    setSuggestions([]);
    onSelectSuggestion({
      street: shortLabel(item),
      city: a.city || a.town || a.municipality || a.village || a.county || '',
      region: a.state || '',
      zipCode: a.postcode || ''
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
      {loading && <span className="address-autocomplete__spinner" aria-hidden="true" />}
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
