// src/components/InventoryRequest.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, updateDoc,
  doc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
  FaBoxOpen, FaTimes, FaSearch, FaMinus,
  FaExclamationTriangle, FaCheckCircle, FaSpinner
} from 'react-icons/fa';
import '../styles/Inventory.css';

const CATEGORIAS_LABELS = {
  limpieza: 'Limpieza', mantenimiento: 'Mantenimiento', amenities: 'Amenities',
  cocina: 'Cocina', oficina: 'Oficina', ropa_cama: 'Ropa de cama',
  herramientas: 'Herramientas', otro: 'Otro',
};

// ═══════════════════════════════════════════════════════════════════
// MODAL DE USO DE INSUMOS — para el rol Mantenimiento
// Props:
//   isOpen        bool
//   onClose       fn
//   maintenanceId string (opcional — ID de la solicitud vinculada)
//   currentUser   { name, role }
// ═══════════════════════════════════════════════════════════════════

export default function InventoryRequest({ isOpen, onClose, maintenanceId, currentUser }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  // Búsqueda y filtro
  const [search,   setSearch]   = useState('');
  const [filterCat,setFilterCat]= useState('all');

  // Ítem seleccionado para descontar
  const [selected, setSelected] = useState(null); // item completo
  const [qty,      setQty]      = useState(1);
  const [obs,      setObs]      = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Cargar inventario al abrir
  useEffect(() => {
    if (!isOpen) return;
    setSearch(''); setFilterCat('all');
    setSelected(null); setQty(1); setObs('');
    loadItems();
  }, [isOpen]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'inventario'), orderBy('nombre', 'asc')));
      setItems(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(i => i.activo !== false)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== 'all' && item.categoria !== filterCat) return false;
      return true;
    });
  }, [items, search, filterCat]);

  const handleSelect = (item) => {
    setSelected(item);
    setQty(1);
    setObs('');
  };

  const handleSubmit = async () => {
    if (!selected) { showToast('Selecciona un insumo', 'error'); return; }
    if (qty <= 0)   { showToast('La cantidad debe ser mayor a 0', 'error'); return; }
    if (qty > selected.stockActual) {
      showToast(`No hay suficiente stock. Disponible: ${selected.stockActual}`, 'error');
      return;
    }

    setSaving(true);
    try {
      const newStock = selected.stockActual - Number(qty);

      // Descontar del inventario
      await updateDoc(doc(db, 'inventario', selected.id), {
        stockActual: newStock,
        actualizadoEn: serverTimestamp(),
      });

      // Registrar movimiento
      await addDoc(collection(db, 'inventarioMovimientos'), {
        itemId:          selected.id,
        itemNombre:      selected.nombre,
        itemCategoria:   selected.categoria,
        tipo:            'salida',
        cantidad:        Number(qty),
        stockAntes:      selected.stockActual,
        stockDespues:    newStock,
        observacion:     obs.trim() || `Uso en mantenimiento`,
        maintenanceId:   maintenanceId || null,
        usuario:         currentUser.name,
        usuarioRol:      currentUser.role,
        fecha:           serverTimestamp(),
      });

      // Alerta si quedó en stock mínimo
      if (newStock <= selected.stockMinimo) {
        showToast(`⚠ Stock bajo en "${selected.nombre}": quedan ${newStock} unidades`, 'warn');
      } else {
        showToast(`${qty} ${selected.unidad}(s) de "${selected.nombre}" descontado(s)`);
      }

      // Actualizar local para reflejar nuevo stock sin recargar
      setItems(prev => prev.map(i =>
        i.id === selected.id ? { ...i, stockActual: newStock } : i
      ));

      setSelected(null);
      setQty(1);
      setObs('');
    } catch (err) {
      console.error(err);
      showToast('Error al registrar el uso', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isLow = (item) => item.stockActual <= item.stockMinimo;

  return (
    <div className="inv-overlay">
      <div className="inv-modal inv-modal--request">
        {/* Header */}
        <div className="inv-modal-header">
          <h2><FaBoxOpen /> Usar insumos</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {maintenanceId && (
              <span className="inv-req-badge">Solicitud #{maintenanceId.slice(-6)}</span>
            )}
            <button className="inv-btn-close" onClick={onClose}><FaTimes /></button>
          </div>
        </div>

        <div className="inv-modal-body inv-req-body">
          {/* Panel izquierdo — lista de insumos */}
          <div className="inv-req-list">
            <div className="inv-req-filters">
              <div className="inv-search-wrap inv-search-wrap--sm">
                <FaSearch />
                <input className="inv-search" placeholder="Buscar insumo…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="inv-select inv-select--sm" value={filterCat}
                onChange={e => setFilterCat(e.target.value)}>
                <option value="all">Todas</option>
                {Object.entries(CATEGORIAS_LABELS).map(([v, l]) =>
                  <option key={v} value={v}>{l}</option>
                )}
              </select>
            </div>

            {loading ? (
              <div className="inv-loading inv-loading--sm">
                <FaSpinner className="spinning" /><p>Cargando…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="inv-empty-sm"><p>No se encontraron insumos</p></div>
            ) : (
              <div className="inv-req-items">
                {filtered.map(item => (
                  <button
                    key={item.id}
                    className={`inv-req-item ${selected?.id === item.id ? 'selected' : ''} ${isLow(item) ? 'low' : ''} ${item.stockActual === 0 ? 'empty' : ''}`}
                    onClick={() => item.stockActual > 0 && handleSelect(item)}
                    disabled={item.stockActual === 0}
                  >
                    <div className="inv-req-item-top">
                      <span className="inv-req-item-name">{item.nombre}</span>
                      <span className={`inv-req-item-stock ${isLow(item) ? 'low' : ''}`}>
                        {item.stockActual === 0
                          ? 'Sin stock'
                          : isLow(item)
                            ? <><FaExclamationTriangle /> {item.stockActual}</>
                            : item.stockActual
                        } {item.stockActual > 0 && item.unidad}
                      </span>
                    </div>
                    <span className="inv-req-item-cat">
                      {CATEGORIAS_LABELS[item.categoria] || item.categoria}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel derecho — formulario de uso */}
          <div className="inv-req-form">
            {!selected ? (
              <div className="inv-req-placeholder">
                <FaBoxOpen />
                <p>Selecciona un insumo de la lista</p>
              </div>
            ) : (
              <>
                <div className="inv-req-selected-header">
                  <p className="inv-req-selected-name">{selected.nombre}</p>
                  <p className="inv-req-selected-meta">
                    Stock disponible: <strong>{selected.stockActual}</strong> {selected.unidad}(s)
                    {isLow(selected) && (
                      <span className="inv-warn-inline"><FaExclamationTriangle /> Stock bajo</span>
                    )}
                  </p>
                </div>

                <div className="inv-req-qty-wrap">
                  <label>Cantidad a usar</label>
                  <div className="inv-qty-ctrl">
                    <button className="inv-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                    <input
                      type="number" min="1" max={selected.stockActual}
                      className="inv-qty-input"
                      value={qty}
                      onChange={e => setQty(Math.min(selected.stockActual, Math.max(1, Number(e.target.value))))}
                    />
                    <button className="inv-qty-btn"
                      onClick={() => setQty(q => Math.min(selected.stockActual, q + 1))}>+</button>
                    <span className="inv-qty-unit">{selected.unidad}(s)</span>
                  </div>
                </div>

                <div className="inv-field" style={{ marginTop: 16 }}>
                  <label>Observación <span className="inv-label-hint">(opcional)</span></label>
                  <input className="inv-input" value={obs} onChange={e => setObs(e.target.value)}
                    placeholder="Dónde se usó, para qué trabajo…" />
                </div>

                <div className="inv-req-preview">
                  <span>Stock después del uso:</span>
                  <span className={`inv-req-preview-val ${(selected.stockActual - qty) <= selected.stockMinimo ? 'warn' : ''}`}>
                    {selected.stockActual - qty} {selected.unidad}(s)
                  </span>
                </div>

                <button className="inv-btn-danger-full" onClick={handleSubmit} disabled={saving}>
                  {saving
                    ? <><FaSpinner className="spinning" /> Registrando…</>
                    : <><FaMinus /> Descontar {qty} {selected.unidad}(s)</>
                  }
                </button>
              </>
            )}
          </div>
        </div>

        <div className="inv-modal-footer">
          <button className="inv-btn-ghost" onClick={onClose}>Cerrar</button>
        </div>

        {toast && <div className={`inv-toast inv-toast--${toast.type}`}>{toast.msg}</div>}
      </div>
    </div>
  );
}