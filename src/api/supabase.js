/**
 * Cliente de Supabase usado EXCLUSIVAMENTE para la recuperación de contraseña
 * (enviar el correo con el enlace y fijar la nueva contraseña al volver desde él).
 *
 * El resto de la auth sigue pasando por el BFF (ver `api/client.js`). La
 * recuperación por correo es, por naturaleza, un flujo de cliente contra
 * Supabase Auth, así que aquí se usa el SDK directamente con la clave `anon`
 * (pública, pensada para el navegador). Debe apuntar al MISMO proyecto Supabase
 * donde G2 guarda los usuarios.
 *
 * Si faltan las variables, `supabase` es null y las pantallas muestran un aviso
 * en vez de romperse.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isRecoveryConfigured = Boolean(url && anonKey);

export const supabase = isRecoveryConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Flujo implícito: el token de recuperación viaja en el hash del enlace
        // del correo; `detectSessionInUrl` lo procesa al cargar la página.
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: false
      }
    })
  : null;
