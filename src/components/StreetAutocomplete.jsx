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

// Nominatim tiene dos formas de buscar: "q" (texto libre, deja que el
// servidor adivine qué es calle/número/ciudad) y la búsqueda "estructurada"
// (parámetros separados: street, country, etc.). La estructurada es más
// precisa para direcciones con número porque no depende de que el parser
// adivine bien — pero si no encuentra nada (calle rara, typo, etc.) hay
// que caer de vuelta al texto libre para no dejar al usuario sin sugerencias.
async function fetchSuggestions(query) {
  const structuredParams = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'cl',
    limit: '8',
    'accept-language': 'es',
    street: query,
    country: 'Chile'
  });
  let res = await fetch(`${SEARCH_URL}?${structuredParams.toString()}`);
  let data = res.ok ? await res.json() : [];

  if (!data || data.length === 0) {
    const freeParams = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      countrycodes: 'cl',
      limit: '8',
      'accept-language': 'es',
      q: query
    });
    res = await fetch(`${SEARCH_URL}?${freeParams.toString()}`);
    data = res.ok ? await res.json() : [];
  }

  return dedupeAndRank(data, houseNumberFromQuery(query));
}

// OSM suele guardar el mismo lugar como varios objetos (nodo + vía + área),
// lo que produce sugerencias duplicadas con el mismo texto (como en la
// captura). Además, cuando el usuario escribió un número, las sugerencias
// que sí traen ese house_number exacto deben ir primero — hoy Nominatim
// las mezcla sin ese criterio.
function dedupeAndRank(results, typedNumber) {
  const seen = new Set();
  const unique = results.filter((item) => {
    const key = `${item.display_name}|${Number(item.lat).toFixed(4)}|${Number(item.lon).toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!typedNumber) return unique;

  return [...unique].sort((a, b) => {
    const aMatch = a.address?.house_number === typedNumber ? 1 : 0;
    const bMatch = b.address?.house_number === typedNumber ? 1 : 0;
    return bMatch - aMatch;
  });
}

export default function StreetAutocomplete({ value, onChange, onSelectSuggestion, id, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [approximate, setApproximate] = useState(false);
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
    setApproximate(false);
    if (!value || value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchSuggestions(value);
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

    // Si el usuario escribió un número pero ni la búsqueda ni el reverse
    // geocoding lo confirman con un house_number igual, es porque OSM no
    // tiene ese edificio catastrado (pasa seguido fuera del centro de las
    // ciudades grandes). En ese caso avisamos en vez de fingir precisión:
    // el número que se guarda es igual el que el usuario escribió, pero
    // sin confirmar contra la base de datos.
    setApproximate(Boolean(typedNumber) && refinedAddress.house_number !== typedNumber);

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
      {approximate && !open && (
        <span className="address-autocomplete__warning">
          ⚠️ No pudimos confirmar el número exacto en el mapa (dato no catastrado en esta zona) — se guardó el número que escribiste, verifícalo.
        </span>
      )}
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
