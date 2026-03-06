import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { FaPlus, FaTrash, FaTools } from 'react-icons/fa';

export default function ManageAreasModal({ isOpen, onClose }) {
  const [customAreas, setCustomAreas] = useState([]);
  const [newArea, setNewArea] = useState({ name: '', icon: '📍', type: 'area_comun' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadCustomAreas();
  }, [isOpen]);

  const loadCustomAreas = async () => {
    try {
      const snap = await getDocs(collection(db, 'customAreas'));
      const areas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomAreas(areas);
    } catch (error) {
      console.error('Error loading custom areas:', error);
    }
  };

  const handleAddArea = async (e) => {
    e.preventDefault();
    if (!newArea.name.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'customAreas'), {
        name: newArea.name,
        icon: newArea.icon,
        type: newArea.type
      });
      setNewArea({ name: '', icon: '📍', type: 'area_comun' });
      await loadCustomAreas();
    } catch (error) {
      console.error('Error adding area:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArea = async (id) => {
    if (!window.confirm('¿Eliminar esta área?')) return;
    
    try {
      await deleteDoc(doc(db, 'customAreas', id));
      await loadCustomAreas();
    } catch (error) {
      console.error('Error deleting area:', error);
    }
  };

  if (!isOpen) return null;

  const ICONS = ['📍', '🏢', '🏗️', '🔧', '⚙️', '🌳', '🏊', '🎯', '🎪', '🏛️'];
  const areasByType = customAreas.reduce((acc, area) => {
    if (!acc[area.type]) acc[area.type] = [];
    acc[area.type].push(area);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FaTools /> Gestionar Áreas Personalizadas</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="manage-areas-content">
          <form onSubmit={handleAddArea} className="add-area-form">
            <div className="form-row">
              <div className="form-field">
                <label>Tipo</label>
                <select
                  value={newArea.type}
                  onChange={(e) => setNewArea({ ...newArea, type: e.target.value })}
                >
                  <option value="area_comun">Área Común</option>
                  <option value="infraestructura">Infraestructura</option>
                </select>
              </div>

              <div className="form-field">
                <label>Icono</label>
                <select
                  value={newArea.icon}
                  onChange={(e) => setNewArea({ ...newArea, icon: e.target.value })}
                >
                  {ICONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="form-field" style={{ flex: 2 }}>
                <label>Nombre del Área</label>
                <input
                  type="text"
                  placeholder="Ej: Jardín Principal"
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                <FaPlus /> Agregar
              </button>
            </div>
          </form>

          <div className="areas-list">
            <h3>Áreas Comunes Personalizadas ({areasByType.area_comun?.length || 0})</h3>
            {areasByType.area_comun?.length > 0 ? (
              <div className="custom-areas-grid">
                {areasByType.area_comun.map(area => (
                  <div key={area.id} className="custom-area-item">
                    <span>{area.icon} {area.name}</span>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No hay áreas personalizadas</p>
            )}

            <h3 style={{ marginTop: '24px' }}>Infraestructura Personalizada ({areasByType.infraestructura?.length || 0})</h3>
            {areasByType.infraestructura?.length > 0 ? (
              <div className="custom-areas-grid">
                {areasByType.infraestructura.map(area => (
                  <div key={area.id} className="custom-area-item">
                    <span>{area.icon} {area.name}</span>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteArea(area.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-message">No hay infraestructura personalizada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}