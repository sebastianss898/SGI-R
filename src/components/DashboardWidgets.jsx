// src/components/DashboardWidgets.jsx
import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  FaBoxOpen,
  FaMinus,
  FaSpinner,
  FaExclamationTriangle,
  FaCalculator,
  FaCopy,
  FaCheck,
  FaEraser,
  FaUser,
} from "react-icons/fa";
import "../styles/DashboardWidgets.css";

const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const fmtTime = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoy = new Date().toDateString() === d.toDateString();
  return hoy
    ? `hoy ${d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) +
        " " +
        d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
};

const ROLES_PERMITIDOS = [
  "housekeeper",
  "maintenance",
  "receptionist",
  "admin",
  "manager",
];

// ════════════════════════════════════════════════════════════════════════════
// WIDGET 1 — INVENTARIO
// ════════════════════════════════════════════════════════════════════════════
export function InventoryWidget({ currentUser }) {
  const [items, setItems] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingEmp, setLoadingEmp] = useState(true);

  const [selItem, setSelItem] = useState("");
  const [selEmp, setSelEmp] = useState("");
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");

  useEffect(() => {
    const unsubItems = onSnapshot(
      query(collection(db, "inventario"), orderBy("nombre", "asc")),
      (snap) =>
        setItems(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((i) => i.activo !== false && i.stockActual > 0),
        ),
    );
    return unsubItems;
  }, []);

  useEffect(() => {
    setLoadingEmp(true);
    const unsubEmp = onSnapshot(
      query(collection(db, "users"), orderBy("name", "asc")),
      (snap) => {
        setEmpleados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingEmp(false);
      },
      (err) => {
        console.error(err);
        setLoadingEmp(false);
      },
    );
    return unsubEmp;
  }, []);

  useEffect(() => {
    const unsubMov = onSnapshot(
      query(
        collection(db, "inventarioMovimientos"),
        orderBy("fecha", "desc"),
        limit(12),
      ),
      (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return unsubMov;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selItem) {
      setError("Selecciona un insumo");
      return;
    }
    if (!selEmp) {
      setError("Selecciona quién lo Utilizara elproducto");
      return;
    }
    if (qty < 1) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    const item = items.find((i) => i.id === selItem);
    const emp = empleados.find((e) => e.id === selEmp);
    if (!item) {
      setError("Insumo no encontrado");
      return;
    }
    if (qty > item.stockActual) {
      setError(`Solo hay ${item.stockActual} ${item.unidad}(s) disponibles`);
      return;
    }

    setSaving(true);
    try {
      const newStock = item.stockActual - Number(qty);
      await updateDoc(doc(db, "inventario", item.id), {
        stockActual: newStock,
        actualizadoEn: serverTimestamp(),
      });
      await addDoc(collection(db, "inventarioMovimientos"), {
        itemId: item.id,
        itemNombre: item.nombre,
        itemCategoria: item.categoria,
        tipo: "salida",
        cantidad: Number(qty),
        stockAntes: item.stockActual,
        stockDespues: newStock,
        observacion: obs.trim() || "Uso general",
        usuario: emp?.name || "Sin nombre",
        usuarioId: emp?.id || "",
        usuarioRol: emp?.role || "",
        usuarioDept: emp?.department || "",
        registradoPor: currentUser?.name || "Sin nombre",
        maintenanceId: null,
        fecha: serverTimestamp(),
      });
      setSelItem("");
      setSelEmp("");
      setQty(1);
      setObs("");
    } catch (err) {
      console.error(err);
      setError("Error al registrar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find((i) => i.id === selItem);
  const isLow =
    selectedItem && selectedItem.stockActual <= selectedItem.stockMinimo;

  const empPorDept = empleados.reduce((acc, e) => {
    const dept = e.department || "Otros";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(e);
    return acc;
  }, {});

  return (
    <div className="dw-card">
      <div className="dw-header">
        <div className="dw-icon dw-icon--purple">
          <FaBoxOpen />
        </div>
        <div>
          <h3 className="dw-title">Usar insumos</h3>
          <p className="dw-sub">Registro de salidas del inventario</p>
        </div>
      </div>

      <div className="dw-body">
        <form className="dw-inv-form" onSubmit={handleSubmit}>
          <div className="dw-row">
            <select
              className="dw-select"
              value={selItem}
              onChange={(e) => {
                setSelItem(e.target.value);
                setError("");
              }}
            >
              <option value="">Selecciona insumo…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} — {i.stockActual} {i.unidad}
                  {i.stockActual <= i.stockMinimo ? " ⚠" : ""}
                </option>
              ))}
            </select>
            <input
              className="dw-input dw-input--qty"
              type="number"
              min="1"
              max={selectedItem?.stockActual || 999}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div className="dw-emp-wrap">
            <div className="dw-emp-label">
              <FaUser /> ¿Quién lo utilizara?
            </div>
            {loadingEmp ? (
              <div className="dw-emp-loading">
                <FaSpinner className="spinning" /> Cargando empleados…
              </div>
            ) : empleados.length === 0 ? (
              <div className="dw-emp-loading">
                No hay empleados activos registrados
              </div>
            ) : (
              <select
                className="dw-select dw-select--emp"
                value={selEmp}
                onChange={(e) => {
                  setSelEmp(e.target.value);
                  setError("");
                }}
              >
                <option value="">Selecciona persona…</option>
                {Object.entries(empPorDept).map(([dept, emps]) => (
                  <optgroup key={dept} label={dept}>
                    {emps.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <input
            className="dw-input"
            type="text"
            placeholder="Observación: hab. 204, cambio de cama…"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />

          {isLow && (
            <div className="dw-warn">
              <FaExclamationTriangle />
              Stock bajo: quedan {selectedItem.stockActual}{" "}
              {selectedItem.unidad}(s)
            </div>
          )}
          {error && <div className="dw-error">{error}</div>}

          <button className="dw-btn-submit" type="submit" disabled={saving}>
            {saving ? (
              <>
                <FaSpinner className="spinning" /> Registrando…
              </>
            ) : (
              <>
                <FaMinus /> Registrar salida
              </>
            )}
          </button>
        </form>

        <p className="dw-divider">Últimas salidas</p>
        {history.filter((m) => m.tipo === "salida").length === 0 ? (
          <p className="dw-empty">No hay movimientos aún</p>
        ) : (
          <div className="dw-history">
            {history
              .filter((m) => m.tipo === "salida")
              .map((m) => (
                <div key={m.id} className="dw-hist-item">
                  <div className="dw-hist-qty">−{m.cantidad}</div>
                  <div className="dw-hist-info">
                    <span className="dw-hist-name">{m.itemNombre}</span>
                    <span className="dw-hist-meta">
                      <strong>{m.usuario}</strong>
                      {m.usuarioDept ? ` · ${m.usuarioDept}` : ""}
                      {m.observacion && m.observacion !== "Uso general"
                        ? ` · ${m.observacion}`
                        : ""}
                      {" · "}
                      {fmtTime(m.fecha)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WIDGET 2 — CALCULADORA IVA
// ════════════════════════════════════════════════════════════════════════════
export function IvaWidget() {
  const [total, setTotal] = useState("");
  const [copiedBase, setCopiedBase] = useState(false);
  const [copiedIva, setCopiedIva] = useState(false);
  const inputRef = useRef(null);

  const T = parseFloat(total.replace(/\./g, "").replace(",", ".")) || 0;
  const base = T / 1.19;
  const iva = T - base;
  const hasVal = T > 0;

  const copy = (val, setCopied) => {
    navigator.clipboard.writeText(Math.round(val).toString()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setTotal(raw ? Number(raw).toLocaleString("es-CO") : "");
  };

  return (
    <div className="dw-card">
      <div className="dw-header">
        <div className="dw-icon dw-icon--green">
          <FaCalculator />
        </div>
        <div>
          <h3 className="dw-title">Calculadora base IVA</h3>
          <p className="dw-sub">Extrae la base gravable del total con IVA</p>
        </div>
      </div>

      <div className="dw-body">
        <div className="dw-iva-field">
          <label className="dw-label">Total cobrado (IVA incluido)</label>
          <div className="dw-iva-input-wrap">
            <span className="dw-iva-prefix">$</span>
            <input
              ref={inputRef}
              className="dw-iva-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={total}
              onChange={handleInput}
            />
            {total && (
              <button
                className="dw-iva-clear"
                onClick={() => {
                  setTotal("");
                  inputRef.current?.focus();
                }}
              >
                <FaEraser />
              </button>
            )}
          </div>
        </div>

        <div className="dw-iva-results">
          <div className="dw-iva-result dw-iva-result--base">
            <span className="dw-iva-result-label">Base gravable (sin IVA)</span>
            <span className="dw-iva-result-val">
              {hasVal ? fmtCOP(base) : "—"}
            </span>
          </div>
          <div className="dw-iva-result dw-iva-result--iva">
            <span className="dw-iva-result-label">Valor del IVA (19%)</span>
            <span className="dw-iva-result-val">
              {hasVal ? fmtCOP(iva) : "—"}
            </span>
          </div>
        </div>

        <div className="dw-iva-formula">
          <span className="dw-iva-formula-label">Fórmula:</span>
          <code>
            B = {hasVal ? fmtCOP(T) : "T"} ÷ 1.19
            {hasVal ? ` = ${fmtCOP(base)}` : ""}
          </code>
        </div>

        {hasVal && (
          <div className="dw-iva-copy-row">
            <button
              className={`dw-iva-copy-btn ${copiedBase ? "copied" : ""}`}
              onClick={() => copy(base, setCopiedBase)}
            >
              {copiedBase ? (
                <>
                  <FaCheck /> Copiado
                </>
              ) : (
                <>
                  <FaCopy /> Copiar base
                </>
              )}
            </button>
            <button
              className={`dw-iva-copy-btn ${copiedIva ? "copied" : ""}`}
              onClick={() => copy(iva, setCopiedIva)}
            >
              {copiedIva ? (
                <>
                  <FaCheck /> Copiado
                </>
              ) : (
                <>
                  <FaCopy /> Copiar IVA
                </>
              )}
            </button>
          </div>
        )}

        <p className="dw-iva-tip">
          Fórmula: <strong>B = T / 1.19</strong> — aplica para IVA del 19% en
          Colombia. El total ya debe incluir el impuesto.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WIDGET 3 — CONSULTA PAISES
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// WIDGET 4 — CONSULTA DANE 
// ════════════════════════════════════════════════════════════════════════════


