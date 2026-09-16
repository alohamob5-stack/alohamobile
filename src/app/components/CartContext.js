'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getShopSession, shopLogout, loadCartFromDb, saveCartToDb } from '../../lib/shopAuth';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCartState] = useState([]);
    const [mounted, setMounted] = useState(false);
    const [shopSession, setShopSessionState] = useState(null);

  // Red cekanja za upis u bazu - GARANTUJE da se upisi izvrsavaju strogo jedan po jedan,
  // nikad paralelno. Ovo je bio pravi uzrok bug-a: ako se doda vise artikala brzo zaredom,
  // svaki upis je isao nezavisno, i ako bi mrezno kasnjenje poremetilo redosled, noviji
  // upis bi zavrsio PRE starijeg i stariji bi ga prepisao (izgledalo je kao da se
  // novododati artikal "obrise").
  const saveQueueRef = useRef(Promise.resolve());
  const latestCartRef = useRef([]);
  const shopSessionRef = useRef(null);
  latestCartRef.current = cart;
  shopSessionRef.current = shopSession;

  // Snima korpu SAMO kad je promena stigla od stvarne korisnicke akcije (dodaj/skloni/promeni/isprazni).
  // Nikad se ne poziva kao reakcija na to sto je korpa UCITANA sa servera (refresh/init) -
  // to bi "odjeknulo" nazad u bazu i pregazilo tudju izmenu.
  function persist(newCart) {
        latestCartRef.current = newCart;
        saveQueueRef.current = saveQueueRef.current
          .then(async () => {
                // Uvek se snima NAJNOVIJA vrednost korpe u trenutku kad ovaj upis dodje na red
                // (ne ona zamrznuta u trenutku poziva) - garantuje da stariji, jos neizvrseni
                // upis nikad ne moze da prepise noviju izmenu.
                const cartToSave = latestCartRef.current;
                const session = shopSessionRef.current;
                if (session) await saveCartToDb(session, cartToSave);
                else localStorage.setItem('cart', JSON.stringify(cartToSave));
          })
          .catch(e => console.error('persist red čekanja greška:', e));
  }

  useEffect(() => {
        setMounted(true);
        async function initCart() {
                let localCart = [];
                try { localCart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch {}
                const session = getShopSession();
                if (session) {
                          setShopSessionState(session);
                          const dbCart = await loadCartFromDb(session);
                          localStorage.removeItem('cart');
                          setCartState(dbCart);
                } else if (localCart.length > 0) {
                          setCartState(localCart);
                }
        }
        initCart();
  }, []);

  // Kad se tab/app vrati u fokus, ponovo ucitaj korpu sa servera -
  // sprecava prikaz zastarele korpe nakon porudzbine sa drugog uredjaja
  // (bitno za "shop" naloge - Kula/Vrbas/Backa Topola - koji dele JEDNU korpu po lokaciji,
  // bez obzira sa koliko uredjaja je neko ulogovan kao ta prodavnica)
  useEffect(() => {
        async function refreshCartFromServer() {
                if (!shopSession) return;
                const dbCart = await loadCartFromDb(shopSession);
                setCartState(dbCart);
        }
        function onVisible() { if (document.visibilityState === 'visible') refreshCartFromServer(); }
        window.addEventListener('focus', refreshCartFromServer);
        window.addEventListener('pageshow', refreshCartFromServer); // hvata povratak iz bfcache na mobilnim browserima
        document.addEventListener('visibilitychange', onVisible);

        // Periodicno osvezavanje za prodavnice (deljena korpa, vise uredjaja/kolega)
        let interval = null;
        if (shopSession?.type === 'shop') {
                interval = setInterval(refreshCartFromServer, 15000);
        }

        return () => {
                window.removeEventListener('focus', refreshCartFromServer);
                window.removeEventListener('pageshow', refreshCartFromServer);
                document.removeEventListener('visibilitychange', onVisible);
                if (interval) clearInterval(interval);
        };
  }, [shopSession]);

  async function handleAuthSuccess(session) {
        setShopSessionState(session);
        const dbCart = await loadCartFromDb(session);
        localStorage.removeItem('cart');
        setCartState(dbCart);
  }

  function handleLogout() {
        shopLogout();
        setShopSessionState(null);
        setCartState([]);
        localStorage.removeItem('cart');
  }

  function addToCart(product, qty = 1) {
        setCartState(prev => {
                const ex = prev.find(x => x.id === product.id);
                const newCart = ex
                  ? prev.map(x => x.id === product.id ? { ...x, qty: x.qty + qty } : x)
                  : [...prev, { ...product, qty }];
                persist(newCart);
                return newCart;
        });
  }

  function removeFromCart(id) {
        setCartState(prev => {
                const newCart = prev.filter(x => x.id !== id);
                persist(newCart);
                return newCart;
        });
  }

  function changeQty(id, d) {
        setCartState(prev => {
                const newCart = prev.map(x => x.id === id ? { ...x, qty: Math.max(1, x.qty + d) } : x);
                persist(newCart);
                return newCart;
        });
  }

  async function refreshCart() {
        if (!shopSession) return;
        const dbCart = await loadCartFromDb(shopSession);
        setCartState(dbCart);
  }

  function clearCart() {
        setCartState([]);
        localStorage.removeItem('cart');
        persist([]);
  }

  const count = cart.reduce((s, x) => s + x.qty, 0);
    const total = cart.reduce((s, x) => s + x.price * x.qty, 0);

  return (
        <CartContext.Provider value={{ cart, setCart: setCartState, count, total, mounted, shopSession, setShopSessionState, handleAuthSuccess, handleLogout, addToCart, removeFromCart, changeQty, clearCart, refreshCart }}>
{children}
</CartContext.Provider>
  );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be inside CartProvider');
    return ctx;
}
