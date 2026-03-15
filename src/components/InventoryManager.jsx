// src/components/InventoryManager.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp, where
} from 'firebase/firestore';
import {
  FaBoxOpen, FaPlus, FaEdit, FaTrash, FaSearch,
  FaHistory, FaArrowUp, FaArrowDown, FaFilter,
  FaExclamationTriangle, FaCheckCircle, FaTimes,
  FaSpinner, FaWarehouse, FaChartBar
} from 'react-icons/fa';
import '../styles/Inventory.css';

// ═══════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════

const CATEGORIAS = [
  { value: 'limpieza',       label: 'Limpieza',        color: '#34d399' },
  { value: 'mantenimiento',  label: 'Mantenimiento',   color: '#60a5fa' },
  { value: 'amenities',      label: 'Amenities',       color: '#c084fc' },
  { value: 'cocina',         label: 'Cocina',          color: '#fbbf24' },
  { value: 'oficina',        label: 'Oficina',         color: '#f87171' },
  { value: 'ropa_cama',      label: 'Ropa de cama',    color: '#a78bfa' },
  { value: 'herramientas',   label: 'Herramientas',    color: '#fb923c' },
  { value: 'otro',           label: 'Otro',            color: '#9ca3af' },
];

const UNIDADES = ['unidad', 'kg', 'litro', 'metro', 'rollo', 'caja', 'par', 'juego', 'bolsa', 'galón'];

const EMPTY_FORM = {
  nombre: '', categoria: 'limpieza', unidad: 'unidad',
  stockActual: 0, stockMinimo: 5, descripcion: '', activo: true,
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function InventoryManager({ currentUser }) {
  // ── Estado principal ─────────────────────────────────────────────
  const [items,        setItems]        = useState([]);
  const [movimientos,  setMovimientos]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);

  // ── UI ────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [filterCat,    setFilterCat]    = useState('all');
  const [filterStock,  setFilterStock]  = useState('all'); // all | low | ok
  const [tab,          setTab]          = useState('inventario'); // inventario | historial

  // ── Modales ───────────────────────────────────────────────────────
  const [modalItem,    setModalItem]    = useState(null);  // null | 'new' | item
  const [modalEntry,   setModalEntry]   = useState(null);  // item para entrada de stock
  const [modalHistory, setModalHistory] = useState(null);  // item para ver historial
  const [deleteConfirm,setDeleteConfirm]= useState(null);

  // ── Formulario item ───────────────────────────────────────────────
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [entryQty,     setEntryQty]     = useState(1);
  const [entryObs,     setEntryObs]     = useState('');

  const isAdmin   = currentUser?.role === 'admin';
  const isMaint   = currentUser?.role === 'maintenance' || currentUser?.role === 'housekeeper';

  // ═══════════════════════════════════════════════════════════════════
  // FIRESTORE — CARGA EN TIEMPO REAL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsubItems = onSnapshot(
      query(collection(db, 'inventario'), orderBy('nombre', 'asc')),
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );

    const unsubMov = onSnapshot(
      query(collection(db, 'inventarioMovimientos'), orderBy('fecha', 'desc')),
      (snap) => setMovimientos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubItems(); unsubMov(); };
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getCatInfo = (val) => CATEGORIAS.find(c => c.value === val) || CATEGORIAS[CATEGORIAS.length - 1];

  const isLowStock = (item) => item.stockActual <= item.stockMinimo;

  // ═══════════════════════════════════════════════════════════════════
  // FILTROS Y BÚSQUEDA
  // ═══════════════════════════════════════════════════════════════════

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (!item.activo && !isAdmin) return false;
      if (search && !item.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat !== 'all' && item.categoria !== filterCat) return false;
      if (filterStock === 'low' && !isLowStock(item)) return false;
      if (filterStock === 'ok'  &&  isLowStock(item)) return false;
      return true;
    });
  }, [items, search, filterCat, filterStock, isAdmin]);

  const stats = useMemo(() => ({
    total:    items.filter(i => i.activo).length,
    lowStock: items.filter(i => i.activo && isLowStock(i)).length,
    categorias: [...new Set(items.map(i => i.categoria))].length,
  }), [items]);

  // ═══════════════════════════════════════════════════════════════════
  // CRUD ÍTEMS
  // ═══════════════════════════════════════════════════════════════════

  const openNew  = () => { setForm(EMPTY_FORM); setModalItem('new'); };
  const openEdit = (item) => { setForm({ ...item }); setModalItem(item); };

  const saveItem = async () => {
    if (!form.nombre.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
    setSaving(true);
    try {
      if (modalItem === 'new') {
        await addDoc(collection(db, 'inventario'), {
          ...form,
          nombre: form.nombre.trim(),
          stockActual: Number(form.stockActual),
          stockMinimo: Number(form.stockMinimo),
          creadoEn: serverTimestamp(),
          creadoPor: currentUser.name,
          actualizadoEn: serverTimestamp(),
        });
        // Registrar movimiento inicial si hay stock
        if (Number(form.stockActual) > 0) {
          // Se registrará después de que tengamos el ID — manejado por el onSnapshot
        }
        showToast(`"${form.nombre}" agregado al inventario`);
      } else {
        await updateDoc(doc(db, 'inventario', modalItem.id), {
          ...form,
          nombre: form.nombre.trim(),
          stockActual: Number(form.stockActual),
          stockMinimo: Number(form.stockMinimo),
          actualizadoEn: serverTimestamp(),
          actualizadoPor: currentUser.name,
        });
        showToast(`"${form.nombre}" actualizado`);
      }
      setModalItem(null);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (item) => {
    try {
      await updateDoc(doc(db, 'inventario', item.id), {
        activo: !item.activo,
        actualizadoEn: serverTimestamp(),
      });
      showToast(item.activo ? 'Ítem archivado' : 'Ítem reactivado');
    } catch { showToast('Error al cambiar estado', 'error'); }
  };

  const deleteItem = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'inventario', deleteConfirm.id));
      setDeleteConfirm(null);
      showToast('Ítem eliminado');
    } catch { showToast('Error al eliminar', 'error'); }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ENTRADA DE STOCK
  // ═══════════════════════════════════════════════════════════════════

  const saveEntry = async () => {
    if (!modalEntry || entryQty <= 0) { showToast('Cantidad inválida', 'error'); return; }
    setSaving(true);
    try {
      const newStock = modalEntry.stockActual + Number(entryQty);
      await updateDoc(doc(db, 'inventario', modalEntry.id), {
        stockActual: newStock,
        actualizadoEn: serverTimestamp(),
      });
      await addDoc(collection(db, 'inventarioMovimientos'), {
        itemId:        modalEntry.id,
        itemNombre:    modalEntry.nombre,
        itemCategoria: modalEntry.categoria,
        tipo:          'entrada',
        cantidad:      Number(entryQty),
        stockAntes:    modalEntry.stockActual,
        stockDespues:  newStock,
        observacion:   entryObs.trim() || 'Entrada de stock',
        usuario:       currentUser.name,
        usuarioRol:    currentUser.role,
        fecha:         serverTimestamp(),
      });
      showToast(`+${entryQty} ${modalEntry.unidad}(s) ingresado(s)`);
      setModalEntry(null);
      setEntryQty(1);
      setEntryObs('');
    } catch (err) {
      console.error(err);
      showToast('Error al registrar entrada', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // HISTORIAL DEL ÍTEM
  // ═══════════════════════════════════════════════════════════════════

  const getItemHistory = (itemId) =>
    movimientos.filter(m => m.itemId === itemId).slice(0, 30);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="inv-root">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="inv-header">
        <div className="inv-header-left">
          <FaWarehouse className="inv-header-icon" />
          <div>
            <h1>Inventario</h1>
            <p>Control de insumos · Hotel Cytrico</p>
          </div>
        </div>
        <div className="inv-header-right">
          {isAdmin && (
            <button className="inv-btn-primary" onClick={openNew}>
              <FaPlus /> Nuevo insumo
            </button>
          )}
        </div>
      </header>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <div className="inv-stats">
        <div className="inv-stat">
          <span className="inv-stat-val">{stats.total}</span>
          <span className="inv-stat-label">Ítems activos</span>
        </div>
        <div className={`inv-stat ${stats.lowStock > 0 ? 'inv-stat--warn' : ''}`}>
          <span className="inv-stat-val">{stats.lowStock}</span>
          <span className="inv-stat-label">Stock bajo</span>
          {stats.lowStock > 0 && <FaExclamationTriangle className="inv-stat-icon" />}
        </div>
        <div className="inv-stat">
          <span className="inv-stat-val">{stats.categorias}</span>
          <span className="inv-stat-label">Categorías</span>
        </div>
        <div className="inv-stat">
          <span className="inv-stat-val">{movimientos.length}</span>
          <span className="inv-stat-label">Movimientos</span>
        </div>
      </div>

      {/* ── TABS ───────────────────────────────────────────────── */}
      <div className="inv-tabs">
        <button className={`inv-tab ${tab === 'inventario' ? 'active' : ''}`}
          onClick={() => setTab('inventario')}>
          <FaBoxOpen /> Inventario
        </button>
        <button className={`inv-tab ${tab === 'historial' ? 'active' : ''}`}
          onClick={() => setTab('historial')}>
          <FaHistory /> Historial de movimientos
        </button>
      </div>

      {tab === 'inventario' && (
        <>
          {/* ── FILTROS ──────────────────────────────────────────── */}
          <div className="inv-filters">
            <div className="inv-search-wrap">
              <FaSearch />
              <input
                className="inv-search"
                placeholder="Buscar insumo…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="inv-search-clear" onClick={() => setSearch('')}><FaTimes /></button>}
            </div>

            <select className="inv-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            <select className="inv-select" value={filterStock} onChange={e => setFilterStock(e.target.value)}>
              <option value="all">Todos los stocks</option>
              <option value="low">Stock bajo ⚠</option>
              <option value="ok">Stock OK ✓</option>
            </select>
          </div>

          {/* ── TABLA DE ÍTEMS ───────────────────────────────────── */}
          {loading ? (
            <div className="inv-loading"><FaSpinner className="spinning" /><p>Cargando inventario…</p></div>
          ) : filtered.length === 0 ? (
            <div className="inv-empty">
              <FaBoxOpen />
              <p>{search ? 'No se encontraron resultados' : 'No hay insumos registrados'}</p>
              {isAdmin && !search && (
                <button className="inv-btn-primary" onClick={openNew}><FaPlus /> Agregar insumo</button>
              )}
            </div>
          ) : (
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th className="inv-th-num">Stock actual</th>
                    <th className="inv-th-num">Mínimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const cat  = getCatInfo(item.categoria);
                    const low  = isLowStock(item);
                    const pct  = item.stockMinimo > 0
                      ? Math.min((item.stockActual / (item.stockMinimo * 3)) * 100, 100)
                      : 100;
                    return (
                      <tr key={item.id} className={!item.activo ? 'inv-tr--inactive' : low ? 'inv-tr--low' : ''}>
                        <td>
                          <div className="inv-item-name">{item.nombre}</div>
                          {item.descripcion && <div className="inv-item-desc">{item.descripcion}</div>}
                        </td>
                        <td>
                          <span className="inv-cat-badge" style={{ background: cat.color + '22', color: cat.color, borderColor: cat.color + '44' }}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="inv-td-unit">{item.unidad}</td>
                        <td className="inv-td-num">
                          <div className="inv-stock-wrap">
                            <span className={`inv-stock-num ${low ? 'low' : 'ok'}`}>{item.stockActual}</span>
                            <div className="inv-stock-bar">
                              <div className="inv-stock-fill" style={{ width: `${pct}%`, background: low ? '#f87171' : '#4ade80' }} />
                            </div>
                          </div>
                        </td>
                        <td className="inv-td-num inv-td-min">{item.stockMinimo}</td>
                        <td>
                          {!item.activo ? (
                            <span className="inv-status inv-status--archived">Archivado</span>
                          ) : low ? (
                            <span className="inv-status inv-status--low"><FaExclamationTriangle /> Bajo</span>
                          ) : (
                            <span className="inv-status inv-status--ok"><FaCheckCircle /> OK</span>
                          )}
                        </td>
                        <td>
                          <div className="inv-actions">
                            {isAdmin && (
                              <button className="inv-btn-icon blue" title="Entrada de stock"
                                onClick={() => { setModalEntry(item); setEntryQty(1); setEntryObs(''); }}>
                                <FaArrowUp />
                              </button>
                            )}
                            <button className="inv-btn-icon purple" title="Ver historial"
                              onClick={() => setModalHistory(item)}>
                              <FaHistory />
                            </button>
                            {isAdmin && (
                              <>
                                <button className="inv-btn-icon amber" title="Editar"
                                  onClick={() => openEdit(item)}>
                                  <FaEdit />
                                </button>
                                <button className="inv-btn-icon gray" title={item.activo ? 'Archivar' : 'Reactivar'}
                                  onClick={() => toggleActivo(item)}>
                                  {item.activo ? '⊘' : '↺'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'historial' && (
        <div className="inv-history-wrap">
          <div className="inv-history-filters">
            <div className="inv-search-wrap">
              <FaSearch />
              <input className="inv-search" placeholder="Buscar en historial…" value={search}
                onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="inv-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="all">Todos los movimientos</option>
              <option value="entrada">Solo entradas</option>
              <option value="salida">Solo salidas</option>
            </select>
          </div>

          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Tipo</th>
                  <th className="inv-th-num">Cantidad</th>
                  <th className="inv-th-num">Stock antes</th>
                  <th className="inv-th-num">Stock después</th>
                  <th>Observación</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientos
                  .filter(m => {
                    if (search && !m.itemNombre?.toLowerCase().includes(search.toLowerCase())) return false;
                    if (filterCat === 'entrada' && m.tipo !== 'entrada') return false;
                    if (filterCat === 'salida'  && m.tipo !== 'salida')  return false;
                    return true;
                  })
                  .map(m => (
                    <tr key={m.id}>
                      <td className="inv-td-date">{fmtDate(m.fecha)}</td>
                      <td>
                        <div className="inv-item-name">{m.itemNombre}</div>
                        {m.itemCategoria && (
                          <div className="inv-item-desc">
                            {getCatInfo(m.itemCategoria).label}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`inv-mov-badge ${m.tipo}`}>
                          {m.tipo === 'entrada' ? <FaArrowUp /> : <FaArrowDown />}
                          {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                        </span>
                      </td>
                      <td className="inv-td-num">
                        <span className={m.tipo === 'entrada' ? 'inv-qty-pos' : 'inv-qty-neg'}>
                          {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                        </span>
                      </td>
                      <td className="inv-td-num inv-td-muted">{m.stockAntes}</td>
                      <td className="inv-td-num">{m.stockDespues}</td>
                      <td className="inv-td-obs">{m.observacion || '—'}</td>
                      <td className="inv-td-user">{m.usuario || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR ÍTEM
      ═══════════════════════════════════════════════════════════ */}
      {modalItem && (
        <div className="inv-overlay" onClick={e => e.target === e.currentTarget && setModalItem(null)}>
          <div className="inv-modal">
            <div className="inv-modal-header">
              <h2>{modalItem === 'new' ? 'Nuevo insumo' : 'Editar insumo'}</h2>
              <button className="inv-btn-close" onClick={() => setModalItem(null)}><FaTimes /></button>
            </div>
            <div className="inv-modal-body">
              <div className="inv-form-grid">
                <div className="inv-field inv-field--full">
                  <label>Nombre del insumo *</label>
                  <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Hipoclorito de sodio" className="inv-input" />
                </div>
                <div className="inv-field">
                  <label>Categoría</label>
                  <select className="inv-input" value={form.categoria}
                    onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="inv-field">
                  <label>Unidad de medida</label>
                  <select className="inv-input" value={form.unidad}
                    onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="inv-field">
                  <label>Stock actual</label>
                  <input type="number" min="0" className="inv-input" value={form.stockActual}
                    onChange={e => setForm(p => ({ ...p, stockActual: Number(e.target.value) }))} />
                </div>
                <div className="inv-field">
                  <label>Stock mínimo <span className="inv-label-hint">(alerta)</span></label>
                  <input type="number" min="0" className="inv-input" value={form.stockMinimo}
                    onChange={e => setForm(p => ({ ...p, stockMinimo: Number(e.target.value) }))} />
                </div>
                <div className="inv-field inv-field--full">
                  <label>Descripción <span className="inv-label-hint">(opcional)</span></label>
                  <input className="inv-input" value={form.descripcion}
                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Especificaciones, proveedor, notas…" />
                </div>
              </div>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-ghost" onClick={() => setModalItem(null)}>Cancelar</button>
              <button className="inv-btn-primary" onClick={saveItem} disabled={saving}>
                {saving ? <><FaSpinner className="spinning" /> Guardando…</> : <><FaCheckCircle /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ENTRADA DE STOCK
      ═══════════════════════════════════════════════════════════ */}
      {modalEntry && (
        <div className="inv-overlay" onClick={e => e.target === e.currentTarget && setModalEntry(null)}>
          <div className="inv-modal inv-modal--sm">
            <div className="inv-modal-header">
              <h2><FaArrowUp style={{ color: '#4ade80' }} /> Entrada de stock</h2>
              <button className="inv-btn-close" onClick={() => setModalEntry(null)}><FaTimes /></button>
            </div>
            <div className="inv-modal-body">
              <div className="inv-entry-item">
                <span className="inv-entry-name">{modalEntry.nombre}</span>
                <span className="inv-entry-stock">Stock actual: <strong>{modalEntry.stockActual}</strong> {modalEntry.unidad}(s)</span>
              </div>
              <div className="inv-form-grid">
                <div className="inv-field inv-field--full">
                  <label>Cantidad a ingresar *</label>
                  <input type="number" min="1" className="inv-input inv-input--big"
                    value={entryQty} onChange={e => setEntryQty(Number(e.target.value))} />
                </div>
                <div className="inv-field inv-field--full">
                  <label>Observación</label>
                  <input className="inv-input" value={entryObs} onChange={e => setEntryObs(e.target.value)}
                    placeholder="Compra, donación, devolución…" />
                </div>
              </div>
              <div className="inv-entry-preview">
                Nuevo stock: <strong>{modalEntry.stockActual + Number(entryQty)}</strong> {modalEntry.unidad}(s)
              </div>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-ghost" onClick={() => setModalEntry(null)}>Cancelar</button>
              <button className="inv-btn-green" onClick={saveEntry} disabled={saving || entryQty <= 0}>
                {saving ? <><FaSpinner className="spinning" /> Guardando…</> : <><FaArrowUp /> Registrar entrada</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: HISTORIAL DEL ÍTEM
      ═══════════════════════════════════════════════════════════ */}
      {modalHistory && (
        <div className="inv-overlay" onClick={e => e.target === e.currentTarget && setModalHistory(null)}>
          <div className="inv-modal inv-modal--lg">
            <div className="inv-modal-header">
              <h2><FaHistory /> Historial — {modalHistory.nombre}</h2>
              <button className="inv-btn-close" onClick={() => setModalHistory(null)}><FaTimes /></button>
            </div>
            <div className="inv-modal-body">
              {getItemHistory(modalHistory.id).length === 0 ? (
                <p className="inv-empty-text">No hay movimientos registrados para este ítem</p>
              ) : (
                <table className="inv-table inv-table--compact">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Cant.</th>
                      <th>Stock antes</th>
                      <th>Stock después</th>
                      <th>Observación</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getItemHistory(modalHistory.id).map(m => (
                      <tr key={m.id}>
                        <td className="inv-td-date">{fmtDate(m.fecha)}</td>
                        <td>
                          <span className={`inv-mov-badge ${m.tipo}`}>
                            {m.tipo === 'entrada' ? <FaArrowUp /> : <FaArrowDown />}
                            {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="inv-td-num">
                          <span className={m.tipo === 'entrada' ? 'inv-qty-pos' : 'inv-qty-neg'}>
                            {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                          </span>
                        </td>
                        <td className="inv-td-num inv-td-muted">{m.stockAntes}</td>
                        <td className="inv-td-num">{m.stockDespues}</td>
                        <td className="inv-td-obs">{m.observacion || '—'}</td>
                        <td className="inv-td-user">{m.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-ghost" onClick={() => setModalHistory(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CONFIRMAR ELIMINACIÓN
      ═══════════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="inv-overlay">
          <div className="inv-modal inv-modal--sm">
            <div className="inv-modal-header">
              <h2>Eliminar insumo</h2>
              <button className="inv-btn-close" onClick={() => setDeleteConfirm(null)}><FaTimes /></button>
            </div>
            <div className="inv-modal-body">
              <p className="inv-confirm-text">
                ¿Eliminar permanentemente <strong>"{deleteConfirm.nombre}"</strong>?
                <br />Se perderá todo su historial de movimientos.
                <br /><em>Considera archivarlo en vez de eliminarlo.</em>
              </p>
            </div>
            <div className="inv-modal-footer">
              <button className="inv-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="inv-btn-danger" onClick={deleteItem}>Eliminar definitivamente</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className={`inv-toast inv-toast--${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}