import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import {
  FaTools,
  FaPlus,
  FaEdit,
  FaTrash,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaBed,
  FaSpinner,
  FaClipboardList,
  FaWrench,
  FaCheck,
  FaCog,
  FaBoxOpen
} from "react-icons/fa";
import "../styles/Maintenance.css";
import ManageAreasModal from "./ManageAreasModal";
import InventoryRequest from "./InventoryRequest";

// ─── Constantes ───────────────────────────────────────────────────────────────
const LOCATION_TYPES = {
  habitacion: { label: "Habitación", icon: "🛏️", placeholder: "Ej: 204" },
  area_comun: {
    label: "Área Común",
    icon: "🏛️",
    placeholder: "Seleccione área",
  },
  infraestructura: {
    label: "Infraestructura",
    icon: "🏗️",
    placeholder: "Seleccione sistema",
  },
};

const COMMON_AREAS = [
  { value: "recepcion", label: "Recepción", icon: "🎫" },
  { value: "lobby", label: "Lobby", icon: "🏛️" },
  { value: "restaurante", label: "Restaurante", icon: "🍽️" },
  { value: "cocina", label: "Cocina", icon: "👨‍🍳" },
  { value: "terraza", label: "Terraza", icon: "🌄" },
  { value: "jacuzzi", label: "Jacuzzi", icon: "🛁" },
  { value: "piscina", label: "Piscina", icon: "🏊" },
  { value: "gym", label: "Gimnasio", icon: "💪" },
  { value: "spa", label: "Spa", icon: "💆" },
  { value: "salon_eventos", label: "Salón de Eventos", icon: "🎉" },
  { value: "estacionamiento", label: "Estacionamiento", icon: "🅿️" },
  { value: "pasillos", label: "Pasillos", icon: "🚶" },
  { value: "escaleras", label: "Escaleras", icon: "🪜" },
  { value: "ascensor", label: "Ascensor", icon: "🛗" },
  { value: "lavanderia", label: "Lavandería", icon: "🧺" },
];

const INFRASTRUCTURE = [
  { value: "calderas", label: "Calderas", icon: "🔥" },
  { value: "tanque_agua", label: "Tanques de Agua", icon: "💧" },
  {
    value: "sistema_reciclado",
    label: "Sistema de Reciclado de Agua",
    icon: "♻️",
  },
  { value: "planta_electrica", label: "Planta Eléctrica", icon: "⚡" },
  { value: "aire_acondicionado", label: "Sistema A/C Central", icon: "❄️" },
  { value: "calefaccion", label: "Sistema de Calefacción", icon: "🌡️" },
  { value: "red_electrica", label: "Red Eléctrica", icon: "💡" },
  { value: "red_agua", label: "Red de Agua", icon: "🚰" },
  { value: "red_gas", label: "Red de Gas", icon: "🔥" },
  { value: "alcantarillado", label: "Sistema de Alcantarillado", icon: "🚽" },
  {
    value: "alarma_incendios",
    label: "Sistema de Alarma contra Incendios",
    icon: "🚨",
  },
  { value: "camaras", label: "Sistema de Cámaras", icon: "📹" },
  { value: "internet", label: "Infraestructura de Internet", icon: "📡" },
  { value: "techo", label: "Techo / Estructura", icon: "🏠" },
];

const PRIORITIES = {
  normal: { label: "Normal", color: "#3b82f6", icon: "🔵" },
  urgente: { label: "Urgente", color: "#ef4444", icon: "🚨" },
};

const STATUS = {
  pendiente: { label: "Pendiente", color: "#6b7280", icon: "⏳" },
  en_proceso: { label: "En Proceso", color: "#3b82f6", icon: "🔧" },
  completado: { label: "Completado", color: "#10b981", icon: "✅" },
  cancelado: { label: "Cancelado", color: "#ef4444", icon: "❌" },
};

const CATEGORIES = [
  { value: "plomeria", label: "Plomería", icon: "🚰" },
  { value: "electricidad", label: "Electricidad", icon: "💡" },
  { value: "climatizacion", label: "Climatización", icon: "❄️" },
  { value: "mobiliario", label: "Mobiliario", icon: "🪑" },
  { value: "pintura", label: "Pintura", icon: "🎨" },
  { value: "limpieza", label: "Limpieza Profunda", icon: "🧹" },
  { value: "electrodomesticos", label: "Electrodomésticos", icon: "📺" },
  { value: "seguridad", label: "Seguridad", icon: "🔒" },
  { value: "otro", label: "Otro", icon: "🔧" },
];

const fmt = (d) =>
  new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const timeAgo = (d) => {
  const seconds = Math.floor((new Date() - new Date(d)) / 1000);
  if (seconds < 60) return "Hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} días`;
};



// ─── Componente ───────────────────────────────────────────────────────────────
export default function Maintenance({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  // Historial por habitación
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [roomHistory, setRoomHistory] = useState([]);

  // Áreas personalizadas
  const [customAreas, setCustomAreas] = useState([]);
  const [showManageAreas, setShowManageAreas] = useState(false);

  // Formulario
  const [form, setForm] = useState({
    locationType: "habitacion",
    location: "",
    category: "plomeria",
    priority: "normal",
    description: "",
    assignedTo: "",
    status: "pendiente",
  });

  const [showInventory, setShowInventory] = useState(false);
  const [inventoryForRequest, setInventoryForRequest] = useState(null);
  // ═══════════════════════════════════════════════════════════════════════════
  // CARGAR DATOS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar solicitudes
      const q = query(
        collection(db, "maintenance"),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRequests(data);

      // Cargar personal de mantenimiento
      const staffQuery = query(
        collection(db, "users"),
        where("role", "==", "maintenance"),
      );
      const staffSnap = await getDocs(staffQuery);
      const staffData = staffSnap.docs.map((doc) => doc.data());
      setStaff(staffData);

      // Cargar áreas personalizadas
      const areasSnap = await getDocs(collection(db, "customAreas"));
      const areasData = areasSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomAreas(areasData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR/EDITAR SOLICITUD
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location || !form.description) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    setSaving(true);
    try {
      // Obtener el label de la ubicación
      let locationLabel = form.location;
      let locationValue = form.location;

      if (form.locationType === "habitacion") {
        locationLabel = `Habitación ${form.location.toUpperCase()}`;
        locationValue = form.location.toUpperCase();
      } else if (form.locationType === "area_comun") {
        // Buscar en áreas predefinidas
        const area = COMMON_AREAS.find((a) => a.value === form.location);
        if (area) {
          locationLabel = area.label;
        } else {
          // Buscar en áreas personalizadas
          const customArea = customAreas.find((a) => a.id === form.location);
          if (customArea) {
            locationLabel = customArea.name;
            locationValue = customArea.id;
          }
        }
      } else if (form.locationType === "infraestructura") {
        // Buscar en infraestructura predefinida
        const infra = INFRASTRUCTURE.find((i) => i.value === form.location);
        if (infra) {
          locationLabel = infra.label;
        } else {
          // Buscar en infraestructura personalizada
          const customInfra = customAreas.find((a) => a.id === form.location);
          if (customInfra) {
            locationLabel = customInfra.name;
            locationValue = customInfra.id;
          }
        }
      }

      const data = {
        locationType: form.locationType,
        location: locationValue,
        locationLabel: locationLabel,
        category: form.category,
        priority: form.priority,
        description: form.description,
        assignedTo: form.assignedTo,
        status: form.status,
        createdBy: currentUser?.name || "Sistema",
        createdByRole: currentUser?.role || "admin",
        updatedAt: serverTimestamp(),
      };

      if (editingRequest) {
        // Actualizar
        await updateDoc(doc(db, "maintenance", editingRequest.id), data);
      } else {
        // Crear nuevo
        await addDoc(collection(db, "maintenance"), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error al guardar la solicitud");
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIAR ESTADO
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "maintenance", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        ...(newStatus === "completado" && { completedAt: serverTimestamp() }),
      });
      await loadData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta solicitud?")) return;

    try {
      await deleteDoc(doc(db, "maintenance", id));
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIAL POR UBICACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  const handleViewHistory = async (location) => {
    setSelectedRoom(location);
    setShowHistoryModal(true);

    try {
      const q = query(
        collection(db, "maintenance"),
        where("location", "==", location),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const history = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRoomHistory(history);
    } catch (error) {
      console.error("Error loading history:", error);
      // Si falla el query con orderBy, intentar sin ordenar
      try {
        const q2 = query(
          collection(db, "maintenance"),
          where("location", "==", location),
        );
        const snap2 = await getDocs(q2);
        const history = snap2.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Ordenar manualmente
        history.sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return dateB - dateA;
        });
        setRoomHistory(history);
      } catch (error2) {
        console.error("Error loading history (retry):", error2);
        setRoomHistory([]);
      }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL
  // ═══════════════════════════════════════════════════════════════════════════
  const handleOpenModal = (request = null) => {
    if (request) {
      setEditingRequest(request);
      setForm({
        locationType: request.locationType || "habitacion",
        location: request.location || "",
        category: request.category,
        priority: request.priority,
        description: request.description,
        assignedTo: request.assignedTo || "",
        status: request.status,
      });
    } else {
      setEditingRequest(null);
      setForm({
        locationType: "habitacion",
        location: "",
        category: "plomeria",
        priority: "normal",
        description: "",
        assignedTo: "",
        status: "pendiente",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRequest(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTROS
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredRequests = requests.filter((req) => {
    // Filtro por estado
    if (filter !== "all" && req.status !== filter) return false;

    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        req.location?.toLowerCase().includes(term) ||
        req.locationLabel?.toLowerCase().includes(term) ||
        req.description?.toLowerCase().includes(term) ||
        req.assignedTo?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════════
  const stats = {
    total: requests.length,
    pendiente: requests.filter((r) => r.status === "pendiente").length,
    en_proceso: requests.filter((r) => r.status === "en_proceso").length,
    completado: requests.filter((r) => r.status === "completado").length,
    urgentes: requests.filter((r) => r.priority === "urgente").length,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISOS
  // ═══════════════════════════════════════════════════════════════════════════
  const canCreate =
    currentUser?.role === "admin" || currentUser?.role === "receptionist";
  const canEdit =
    currentUser?.role === "admin" || currentUser?.role === "receptionist";
  const canDelete = currentUser?.role === "admin";
  const canAssign = currentUser?.role === "admin";

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="maintenance-root">
      {/* Header */}
      <header className="maintenance-header">
        <div>
          <h1>
            <FaTools /> Gestión de Mantenimiento
          </h1>
          <p>Control y seguimiento de solicitudes · Hotel Cytrico</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={() => setShowManageAreas(true)}
            title="Gestionar áreas personalizadas"
          >
            <FaCog /> Gestionar Áreas
          </button>
          {canCreate && (
            <button
              className="btn-new-request"
              onClick={() => handleOpenModal()}
            >
              <FaPlus /> Nueva Solicitud
            </button>
          )}
        </div>
      </header>

      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <FaClipboardList />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Solicitudes</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-label">Pendientes</span>
            <span className="stat-value">{stats.pendiente}</span>
          </div>
        </div>

        <div className="stat-card stat-progress">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <span className="stat-label">En Proceso</span>
            <span className="stat-value">{stats.en_proceso}</span>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-label">Completadas</span>
            <span className="stat-value">{stats.completado}</span>
          </div>
        </div>

        <div className="stat-card stat-urgent">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <span className="stat-label">Urgentes</span>
            <span className="stat-value">{stats.urgentes}</span>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            Todas ({stats.total})
          </button>
          <button
            className={`filter-tab ${filter === "pendiente" ? "active" : ""}`}
            onClick={() => setFilter("pendiente")}
          >
            ⏳ Pendientes ({stats.pendiente})
          </button>
          <button
            className={`filter-tab ${filter === "en_proceso" ? "active" : ""}`}
            onClick={() => setFilter("en_proceso")}
          >
            🔧 En Proceso ({stats.en_proceso})
          </button>
          <button
            className={`filter-tab ${filter === "completado" ? "active" : ""}`}
            onClick={() => setFilter("completado")}
          >
            ✅ Completadas ({stats.completado})
          </button>
        </div>

        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder="Buscar por habitación, descripción o asignado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de solicitudes */}
      <div className="requests-container">
        {loading ? (
          <div className="loading-state">
            <FaSpinner className="spinning" />
            <p>Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <FaTools style={{ fontSize: "4rem", opacity: 0.3 }} />
            <h3>No hay solicitudes</h3>
            <p>
              {searchTerm
                ? "No se encontraron resultados para tu búsqueda"
                : filter !== "all"
                  ? `No hay solicitudes en estado "${STATUS[filter]?.label}"`
                  : "Crea la primera solicitud de mantenimiento"}
            </p>
            {!searchTerm && filter === "all" && (
              <button className="btn-primary" onClick={() => handleOpenModal()}>
                <FaPlus /> Nueva Solicitud
              </button>
            )}
          </div>
        ) : (
          <div className="requests-grid">
            {filteredRequests.map((request) => {
              const category = CATEGORIES.find(
                (c) => c.value === request.category,
              );
              const priority = PRIORITIES[request.priority];
              const status = STATUS[request.status];

              return (
                <div
                  key={request.id}
                  className={`request-card priority-${request.priority}`}
                >
                  <div className="request-header">
                    <div className="request-room">
                      {LOCATION_TYPES[request.locationType]?.icon || "📍"}{" "}
                      {request.locationLabel || request.location}
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-icon btn-history"
                        onClick={() => handleViewHistory(request.location)}
                        title="Ver historial"
                      >
                        <FaClipboardList />
                      </button>
                      <button
                        className="btn-icon btn-inventory"
                        onClick={() => {
                          setInventoryForRequest(request.id);
                          setShowInventory(true);
                        }}
                        title="Usar insumos del inventario"
                      >
                        <FaBoxOpen />
                      </button>
                      {canEdit && (
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenModal(request)}
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(request.id)}
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="request-category">
                    <span className="category-icon">{category?.icon}</span>
                    <span>{category?.label}</span>
                  </div>

                  <p className="request-description">{request.description}</p>

                  <div className="request-meta">
                    <span className="meta-item">
                      <FaUser /> {request.assignedTo || "Sin asignar"}
                    </span>
                    <span className="meta-item">
                      <FaClock /> {timeAgo(request.createdAt?.toDate())}
                    </span>
                  </div>

                  <div className="request-footer">
                    <span
                      className="priority-badge"
                      style={{ background: priority.color }}
                    >
                      {priority.icon} {priority.label}
                    </span>

                    <select
                      className={`status-select status-${request.status}`}
                      value={request.status}
                      onChange={(e) =>
                        handleStatusChange(request.id, e.target.value)
                      }
                    >
                      {Object.entries(STATUS).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.icon} {val.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="request-created-by">
                    Creado por: {request.createdBy}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaTools /> {editingRequest ? "Editar" : "Nueva"} Solicitud de
                Mantenimiento
              </h2>
              <button className="btn-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-field">
                <label>Tipo de Ubicación *</label>
                <select
                  value={form.locationType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      locationType: e.target.value,
                      location: "",
                    })
                  }
                >
                  {Object.entries(LOCATION_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.icon} {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>
                  {form.locationType === "habitacion" &&
                    "Número de Habitación *"}
                  {form.locationType === "area_comun" && "Área Común *"}
                  {form.locationType === "infraestructura" &&
                    "Sistema/Infraestructura *"}
                </label>

                {form.locationType === "habitacion" ? (
                  <input
                    type="text"
                    placeholder={LOCATION_TYPES[form.locationType].placeholder}
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    required
                  />
                ) : form.locationType === "area_comun" ? (
                  <select
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    required
                  >
                    <option value="">Seleccione área...</option>
                    <optgroup label="Áreas Predefinidas">
                      {COMMON_AREAS.map((area) => (
                        <option key={area.value} value={area.value}>
                          {area.icon} {area.label}
                        </option>
                      ))}
                    </optgroup>
                    {customAreas.filter((a) => a.type === "area_comun").length >
                      0 && (
                      <optgroup label="Áreas Personalizadas">
                        {customAreas
                          .filter((a) => a.type === "area_comun")
                          .map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.icon} {area.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                ) : (
                  <select
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    required
                  >
                    <option value="">Seleccione sistema...</option>
                    <optgroup label="Infraestructura Predefinida">
                      {INFRASTRUCTURE.map((infra) => (
                        <option key={infra.value} value={infra.value}>
                          {infra.icon} {infra.label}
                        </option>
                      ))}
                    </optgroup>
                    {customAreas.filter((a) => a.type === "infraestructura")
                      .length > 0 && (
                      <optgroup label="Infraestructura Personalizada">
                        {customAreas
                          .filter((a) => a.type === "infraestructura")
                          .map((area) => (
                            <option key={area.id} value={area.id}>
                              {area.icon} {area.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                )}
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Categoría *</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Prioridad *</label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  >
                    {Object.entries(PRIORITIES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {canAssign && (
                <div className="form-field">
                  <label>Asignar a</label>
                  <select
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {staff.map((person, idx) => (
                      <option key={idx} value={person.name}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label>Descripción del problema *</label>
                <textarea
                  rows="4"
                  placeholder="Describe detalladamente el problema..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>

              {editingRequest && (
                <div className="form-field">
                  <label>Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    {Object.entries(STATUS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.icon} {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <FaSpinner className="spinning" /> Guardando...
                    </>
                  ) : (
                    <>
                      <FaCheck /> {editingRequest ? "Actualizar" : "Crear"}{" "}
                      Solicitud
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Historial por Ubicación */}
      {showHistoryModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="modal-content modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <FaClipboardList /> Historial - {selectedRoom}
              </h2>
              <button
                className="btn-close"
                onClick={() => setShowHistoryModal(false)}
              >
                ×
              </button>
            </div>

            <div className="history-content">
              {roomHistory.length === 0 ? (
                <div className="empty-history">
                  <FaTools style={{ fontSize: "3rem", opacity: 0.3 }} />
                  <p>No hay historial de mantenimientos para esta ubicación</p>
                  <p style={{ fontSize: "0.85rem", color: "#6b6b8a" }}>
                    Las solicitudes nuevas aparecerán aquí automáticamente
                  </p>
                </div>
              ) : (
                <div className="history-list">
                  {roomHistory.map((item, index) => {
                    const category = CATEGORIES.find(
                      (c) => c.value === item.category,
                    );
                    const priority = PRIORITIES[item.priority];
                    const status = STATUS[item.status];

                    return (
                      <div key={item.id} className="history-item">
                        <div className="history-number">{index + 1}</div>
                        <div className="history-details">
                          <div className="history-header">
                            <span className="history-category">
                              {category?.icon} {category?.label}
                            </span>
                            <span
                              className="priority-badge-small"
                              style={{ background: priority.color }}
                            >
                              {priority.icon} {priority.label}
                            </span>
                            <span
                              className="status-badge-small"
                              style={{ background: status.color }}
                            >
                              {status.icon} {status.label}
                            </span>
                          </div>

                          <p className="history-description">
                            {item.description}
                          </p>

                          <div className="history-meta">
                            <span>
                              <FaUser /> Creado por: {item.createdBy}
                            </span>
                            {item.assignedTo && (
                              <span>
                                <FaWrench /> Asignado a: {item.assignedTo}
                              </span>
                            )}
                            <span>
                              <FaCalendarAlt /> {fmt(item.createdAt?.toDate())}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="history-stats">
              <div className="history-stat">
                <span className="stat-label">Total Mantenimientos</span>
                <span className="stat-value">{roomHistory.length}</span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Completados</span>
                <span className="stat-value">
                  {roomHistory.filter((h) => h.status === "completado").length}
                </span>
              </div>
              <div className="history-stat">
                <span className="stat-label">Urgentes</span>
                <span className="stat-value">
                  {roomHistory.filter((h) => h.priority === "urgente").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Áreas */}
      <ManageAreasModal
        isOpen={showManageAreas}
        onClose={() => {
          setShowManageAreas(false);
          loadData(); // Recargar para actualizar listas
        }}
      />
      <InventoryRequest
  isOpen={showInventory}
  onClose={() => { setShowInventory(false); setInventoryForRequest(null); }}
  maintenanceId={inventoryForRequest}
  currentUser={currentUser}
/>
    </div>
  );
}
