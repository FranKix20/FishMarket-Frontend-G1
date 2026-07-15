import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import FishIcon from './FishIcon';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const menuRef = useRef(null);

  // Cierra el menú de cuenta al hacer click fuera de él.
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchValue.trim();
    setMobileOpen(false);
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={() => setMobileOpen(false)}>
          <FishIcon />
          <span className="navbar__brand-text">
            <span className="navbar__brand-name">FishMarket</span>
            <span className="navbar__brand-sub">Cloud</span>
          </span>
        </Link>

        <form className="navbar__search navbar__search--desktop" onSubmit={handleSearchSubmit} role="search">
          <input
            type="search"
            placeholder="Buscar cañas, carretes, señuelos…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            aria-label="Buscar productos"
          />
          <button type="submit" aria-label="Buscar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </form>

        <div className="navbar__actions navbar__actions--desktop">
          {isAuthenticated ? (
            <>
              <div className="navbar__account" ref={menuRef}>
                <button
                  type="button"
                  className="navbar__account-trigger"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  Mi cuenta
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="navbar__account-menu" role="menu">
                    <div className="navbar__account-menu-header">
                      <p>{user?.fullName || user?.full_name || 'Mi cuenta'}</p>
                      <p title={user?.email}>{user?.email}</p>
                    </div>
                    <Link to="/pedidos" onClick={() => setMenuOpen(false)}>
                      Mis pedidos
                    </Link>
                    <Link to="/notificaciones" onClick={() => setMenuOpen(false)}>
                      Notificaciones
                    </Link>
                    <button type="button" className="is-danger" onClick={handleLogout}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              <div className="navbar__divider" />

              <Link to="/carro" className="navbar__cart" aria-label={`Carrito, ${itemCount} artículos`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {itemCount > 0 && <span className="navbar__cart-badge">{itemCount}</span>}
              </Link>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Ingresar
            </Link>
          )}
        </div>

        {/* Acciones visibles solo en móvil: carrito siempre a mano + botón hamburguesa */}
        <div className="navbar__actions navbar__actions--mobile">
          {isAuthenticated && (
            <Link to="/carro" className="navbar__cart navbar__cart--compact" aria-label={`Carrito, ${itemCount} artículos`} onClick={() => setMobileOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {itemCount > 0 && <span className="navbar__cart-badge">{itemCount}</span>}
            </Link>
          )}
          <button
            type="button"
            className="navbar__burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="navbar__mobile-panel">
          <form className="navbar__search navbar__search--mobile" onSubmit={handleSearchSubmit} role="search">
            <input
              type="search"
              placeholder="Buscar cañas, carretes, señuelos…"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label="Buscar productos"
            />
            <button type="submit" aria-label="Buscar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </form>

          <nav className="navbar__mobile-links">
            {isAuthenticated ? (
              <>
                <div className="navbar__mobile-user">
                  <p>{user?.fullName || user?.full_name || 'Mi cuenta'}</p>
                  <p title={user?.email}>{user?.email}</p>
                </div>
                <Link to="/" onClick={() => setMobileOpen(false)}>Catálogo</Link>
                <Link to="/pedidos" onClick={() => setMobileOpen(false)}>Mis pedidos</Link>
                <Link to="/notificaciones" onClick={() => setMobileOpen(false)}>Notificaciones</Link>
                <Link to="/carro" onClick={() => setMobileOpen(false)}>Carrito {itemCount > 0 ? `(${itemCount})` : ''}</Link>
                <button type="button" className="is-danger" onClick={handleLogout}>Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMobileOpen(false)}>Catálogo</Link>
                <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setMobileOpen(false)}>Ingresar</Link>
                <Link to="/registro" onClick={() => setMobileOpen(false)}>Crear cuenta</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
