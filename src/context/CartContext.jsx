import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { cartApi } from '../api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const userId = user?.business_user_id;

  // Grupo 4 no crea el carrito automáticamente en el primer POST de items
  // para un usuario que nunca tuvo uno — responde 404 "Cart not found".
  // Un GET inicial sí lo crea. Por eso cada operación de carrito pasa
  // primero por refresh(), que además mantiene la UI sincronizada.
  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await cartApi.get(userId);
      setCart(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      refresh();
    } else {
      setCart(null);
    }
  }, [isAuthenticated, userId, refresh]);

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      if (!userId) return;
      setError(null);
      // Asegura que el carrito exista antes del POST (ver nota arriba).
      await cartApi.get(userId);
      const { data } = await cartApi.addItem(userId, productId, quantity);
      setCart(data);
      return data;
    },
    [userId]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (!userId) return;
      setError(null);
      const { data } = await cartApi.removeItem(userId, productId);
      setCart(data);
      return data;
    },
    [userId]
  );

  const itemCount = cart?.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  const value = { cart, itemCount, loading, error, refresh, addItem, removeItem };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}
