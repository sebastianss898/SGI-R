// src/components/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  onSnapshot,
  limit,
} from "firebase/firestore";
import {
  FaPlus,
  FaBed,
  FaSignInAlt,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaWrench,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartBar,
  FaUsers,
  FaBell,
  FaClock,
  FaFileAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown,
  FaMoon,
  FaSun,
  FaCloudSun,
  FaSpinner,
} from "react-icons/fa";
import NoteModal from "./NoteModal";
import NoteCard from "./NoteCard";
import InventoryRequest from "./InventoryRequest";
import {
  hasPermission,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_COLORS,
} from "../utils/roles";
import "../styles/Dashboard.css";
import "../styles/globalStyles.css";
import { InventoryWidget, IvaWidget } from "./DashboardWidgets";
import "../styles/DashboardWidgets.css";

// ── Helpers ──────────────────────────────────────────────────────────────────
const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Buenos días", icon: <FaSun /> };
  if (h < 19) return { text: "Buenas tardes", icon: <FaCloudSun /> };
  return { text: "Buenas noches", icon: <FaMoon /> };
};

const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

const todayISO = new Date().toISOString().split("T")[0];

// ── Acciones rápidas — definición dinámica por rol ───────────────────────────
const buildQuickActions = (role, setCurrentView, openInventory) => {
  const all = [
    {
      id: "turno",
      icon: <FaClock />,
      label: "Registrar turno",
      desc: "Abrir registro de turno",
      color: "#5b5bff",
      bg: "rgba(91,91,255,0.12)",
      permission: PERMISSIONS.VIEW_SHIFTS,
      action: () => setCurrentView("turnos"),
    },
    {
      id: "mantenimiento",
      icon: <FaWrench />,
      label: "Mantenimiento",
      desc: "Nueva solicitud",
      color: "#f87171",
      bg: "rgba(248,113,113,0.12)",
      permission: PERMISSIONS.VIEW_MAINTENANCE,
      action: () => setCurrentView("mantenimiento"),
    },
    {
      id: "inventario",
      icon: <FaBoxOpen />,
      label: "Usar insumos",
      desc: "Descontar del inventario",
      color: "#c084fc",
      bg: "rgba(192,132,252,0.12)",
      permission: PERMISSIONS.VIEW_INVENTORY,
      action: openInventory,
    },
    {
      id: "reportes",
      icon: <FaChartBar />,
      label: "Reportes",
      desc: "Ver informes",
      color: "#60a5fa",
      bg: "rgba(96,165,250,0.12)",
      permission: PERMISSIONS.VIEW_REPORTS_PAGE,
      action: () => setCurrentView("reportes"),
    },
    {
      id: "alertas",
      icon: <FaBell />,
      label: "Alertas",
      desc: "Gestionar avisos",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.12)",
      permission: PERMISSIONS.VIEW_ALERTS,
      action: () => setCurrentView("alertas"),
    },
    {
      id: "horarios",
      icon: <FaCalendarAlt />,
      label: "Horarios",
      desc: "Ver turnos asignados",
      color: "#34d399",
      bg: "rgba(52,211,153,0.12)",
      permission: PERMISSIONS.VIEW_SHIFTS_SCHEDULE,
      action: () => setCurrentView("horarios"),
    },
    {
      id: "usuarios",
      icon: <FaUsers />,
      label: "Empleados",
      desc: "Gestionar personal",
      color: "#a78bfa",
      bg: "rgba(167,139,250,0.12)",
      permission: PERMISSIONS.CREATE_USER,
      action: () => setCurrentView("usuarios"),
    },
  ];
  return all.filter((a) => hasPermission(role, a.permission));
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const Dashboard = ({ currentUser, setCurrentView }) => {
  // ── Estados de datos en vivo ─────────────────────────────────────────────
  const [metrics, setMetrics] = useState(null);
  const [loadingMet, setLoadingMet] = useState(true);
  const [lowStock, setLowStock] = useState([]);
  const [pendMaint, setPendMaint] = useState(0);

  // ── Notas ────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Inventario modal ─────────────────────────────────────────────────────
  const [showInventory, setShowInventory] = useState(false);

  const role = currentUser?.role || "receptionist";
  const greeting = GREETING();

  // ── Acciones rápidas ─────────────────────────────────────────────────────
  const quickActions = buildQuickActions(
    role,
    setCurrentView || (() => {}),
    () => setShowInventory(true),
  );

  // ── Cargar métricas del día ───────────────────────────────────────────────
  const loadMetrics = useCallback(async () => {
    setLoadingMet(true);
    try {
      // Turnos del día
      const turnosSnap = await getDocs(
        query(collection(db, "turnos"), where("date", "==", todayISO)),
      );
      const turnos = turnosSnap.docs.map((d) => d.data());

      const allCI = turnos.flatMap((t) => t.checkins || []);
      const checkIns = allCI.filter((c) => c.type === "in").length;
      const checkOuts = allCI.filter((c) => c.type === "out").length;
      const ingresos = turnos.reduce(
        (s, t) => s + (t.totals?.ingresos || 0),
        0,
      );
      const gastos = turnos.reduce((s, t) => s + (t.totals?.gastos || 0), 0);

      // Mantenimiento pendiente
      const maintSnap = await getDocs(
        query(
          collection(db, "maintenance"),
          where("status", "==", "pendiente"),
        ),
      );
      setPendMaint(maintSnap.size);

      // Inventario bajo stock
      const invSnap = await getDocs(collection(db, "inventario"));
      const low = invSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((i) => i.activo !== false && i.stockActual <= i.stockMinimo);
      setLowStock(low);

      setMetrics({
        checkIns,
        checkOuts,
        ingresos,
        gastos,
        turnos: turnos.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMet(false);
    }
  }, []);

  // ── Notas en tiempo real ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "notes"), orderBy("createdAt", "desc"), limit(30)),
      (snap) => setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err),
    );
    return unsub;
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // ── CRUD notas ───────────────────────────────────────────────────────────
  const handleSaveNote = (n) => setNotes((p) => [n, ...p]);
  const handleUpdateNote = (n) =>
    setNotes((p) => p.map((x) => (x.id === n.id ? n : x)));
  const handleDeleteNote = (id) => {
    if (window.confirm("¿Eliminar esta nota?"))
      setNotes((p) => p.filter((x) => x.id !== id));
  };

  const filteredNotes =
    selectedFilter === "all"
      ? notes
      : notes.filter((n) => n.category === selectedFilter);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="db-root">
      {/* ── BIENVENIDA ─────────────────────────────────────────────────── */}
      <div className="db-welcome">
        <div className="db-welcome-left">
          <div className="db-greeting-icon">{greeting.icon}</div>
          <div>
            <h1 className="db-welcome-title">
              {greeting.text},{" "}
              {currentUser?.name?.split(" ")[0] || "bienvenido"}
            </h1>
            <p className="db-welcome-sub">
              <span
                className="db-role-pill"
                style={{
                  background: (ROLE_COLORS[role] || "#818cf8") + "22",
                  color: ROLE_COLORS[role] || "#818cf8",
                  borderColor: (ROLE_COLORS[role] || "#818cf8") + "44",
                }}
              >
                {ROLE_LABELS[role] || role}
              </span>
              &nbsp;·&nbsp;
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>

        {/* Alertas rápidas */}
        <div className="db-alerts-row">
          {pendMaint > 0 && (
            <button
              className="db-alert-chip warn"
              onClick={() => setCurrentView?.("mantenimiento")}
            >
              <FaExclamationTriangle /> {pendMaint} mant. pendiente
              {pendMaint > 1 ? "s" : ""}
            </button>
          )}
          {lowStock.length > 0 && (
            <button
              className="db-alert-chip danger"
              onClick={() => setCurrentView?.("inventario")}
            >
              <FaBoxOpen /> {lowStock.length} insumo
              {lowStock.length > 1 ? "s" : ""} bajo stock
            </button>
          )}
        </div>
      </div>

      {/* ── MÉTRICAS DEL DÍA ───────────────────────────────────────────── */}
      {hasPermission(role, PERMISSIONS.VIEW_FINANCES) && (
        <section className="db-section">
          <h2 className="db-section-title">Resumen del día</h2>
          {loadingMet ? (
            <div className="db-loading-row">
              <FaSpinner className="spinning" />
              <span>Cargando métricas…</span>
            </div>
          ) : (
            <div className="db-metrics-grid">
              <div className="db-metric green">
                <div className="db-metric-icon">
                  <FaSignInAlt />
                </div>
                <div>
                  <span className="db-metric-val">
                    {metrics?.checkIns ?? 0}
                  </span>
                  <span className="db-metric-label">Check-ins</span>
                </div>
              </div>
              <div className="db-metric blue">
                <div className="db-metric-icon">
                  <FaSignOutAlt />
                </div>
                <div>
                  <span className="db-metric-val">
                    {metrics?.checkOuts ?? 0}
                  </span>
                  <span className="db-metric-label">Check-outs</span>
                </div>
              </div>
              <div className="db-metric purple">
                <div className="db-metric-icon">
                  <FaMoneyBillWave />
                </div>
                <div>
                  <span className="db-metric-val">
                    {fmtCOP(metrics?.ingresos)}
                  </span>
                  <span className="db-metric-label">Ingresos hoy</span>
                </div>
              </div>
              <div className="db-metric red">
                <div className="db-metric-icon">
                  <FaArrowDown />
                </div>
                <div>
                  <span className="db-metric-val">
                    {fmtCOP(metrics?.gastos)}
                  </span>
                  <span className="db-metric-label">Gastos hoy</span>
                </div>
              </div>
              <div className="db-metric amber">
                <div className="db-metric-icon">
                  <FaWrench />
                </div>
                <div>
                  <span className="db-metric-val">{pendMaint}</span>
                  <span className="db-metric-label">Mant. pendiente</span>
                </div>
              </div>
              <div className="db-metric teal">
                <div className="db-metric-icon">
                  <FaBoxOpen />
                </div>
                <div>
                  <span className="db-metric-val">{lowStock.length}</span>
                  <span className="db-metric-label">Stock bajo</span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── ACCIONES RÁPIDAS ───────────────────────────────────────────── */}
      <section className="db-section">
        <h2 className="db-section-title">Acciones rápidas</h2>
        <div className="db-actions-grid">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="db-action-card"
              style={{ "--ac": action.color, "--ac-bg": action.bg }}
              onClick={action.action}
            >
              <div className="db-action-icon">{action.icon}</div>
              <div className="db-action-text">
                <span className="db-action-label">{action.label}</span>
                <span className="db-action-desc">{action.desc}</span>
              </div>
              <div className="db-action-arrow">›</div>
            </button>
          ))}
        </div>
      </section>

      <section className="db-section">
        <h2 className="db-section-title">Herramientas rápidas</h2>
        <div className="db-widgets-grid">
          
          <InventoryWidget currentUser={currentUser} />
          
          <IvaWidget />
        </div>
      </section>

      {/* ── STOCK BAJO (si hay) ─────────────────────────────────────────── */}
      {lowStock.length > 0 &&
        hasPermission(role, PERMISSIONS.VIEW_INVENTORY) && (
          <section className="db-section">
            <div className="db-section-header">
              <h2 className="db-section-title">Insumos con stock bajo</h2>
              <button
                className="db-link-btn"
                onClick={() => setCurrentView?.("inventario")}
              >
                Ver inventario completo →
              </button>
            </div>
            <div className="db-lowstock-grid">
              {lowStock.slice(0, 6).map((item) => (
                <div key={item.id} className="db-lowstock-card">
                  <div className="db-lowstock-name">{item.nombre}</div>
                  <div className="db-lowstock-row">
                    <span className="db-lowstock-stock warn">
                      {item.stockActual} {item.unidad}
                    </span>
                    <span className="db-lowstock-min">
                      mín. {item.stockMinimo}
                    </span>
                  </div>
                  <div className="db-lowstock-bar">
                    <div
                      className="db-lowstock-fill"
                      style={{
                        width: `${Math.min((item.stockActual / (item.stockMinimo || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      {/* ── NOTAS ──────────────────────────────────────────────────────── */}
      <section className="db-section">
        <div className="db-section-header">
          <div>
            <h2 className="db-section-title">Notas del hotel</h2>
          </div>
          <div className="db-notes-controls">
            <div className="db-filter-tabs">
              {["all", "check-in", "check-out", "package", "visitor"].map(
                (f) => (
                  <button
                    key={f}
                    className={`db-filter-tab ${selectedFilter === f ? "active" : ""}`}
                    onClick={() => setSelectedFilter(f)}
                  >
                    {f === "all"
                      ? "Todas"
                      : f === "check-in"
                        ? "Check-in"
                        : f === "check-out"
                          ? "Check-out"
                          : f === "package"
                            ? "Paquetes"
                            : "Visitas"}
                  </button>
                ),
              )}
            </div>
            <button
              className="db-btn-new-note"
              onClick={() => setIsModalOpen(true)}
            >
              <FaPlus /> Nueva nota
            </button>
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="db-notes-empty">
            <FaFileAlt />
            <p>
              No hay notas{" "}
              {selectedFilter !== "all"
                ? `en "${selectedFilter}"`
                : "registradas"}
            </p>
          </div>
        ) : (
          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modales */}
      <NoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveNote}
      />

      <InventoryRequest
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        maintenanceId={null}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Dashboard;
