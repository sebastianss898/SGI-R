// src/components/NoteModal.jsx
import React, { useState } from 'react';
import { FaTimes, FaSave } from 'react-icons/fa';
import IncomeTable from './IncomeTable';
import '../styles/modalStyles.css';

const NoteModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    responsible: 'Manuela',
    startTime: '',
    endTime: '',
    description: '',
    category: 'check-in',
    priority: 'medium',
    status: 'pending',
  });

  const [incomes, setIncomes] = useState([]);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'La hora de inicio es obligatoria';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'La hora de fin es obligatoria';
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      
      if (end <= start) {
        newErrors.endTime = 'La hora de fin debe ser posterior a la hora de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const newNote = {
        ...formData,
        incomes: incomes,
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        user: formData.responsible,
        // Generar título automático basado en el responsable y fecha
        title: `Turno ${formData.responsible} - ${new Date().toLocaleDateString('es-ES')}`,
      };

      onSave(newNote);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      responsible: 'Manuela',
      startTime: '',
      endTime: '',
      description: '',
      category: 'check-in',
      priority: 'medium',
      status: 'pending',
    });
    setIncomes([]);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Nota de Turno</h2>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Encargado */}
          <div className="form-group">
            <label htmlFor="responsible">Encargado</label>
            <select
              id="responsible"
              name="responsible"
              value={formData.responsible}
              onChange={handleChange}
            >
              <option value="Manuela">Manuela</option>
              <option value="Estefania">Estefania</option>
              <option value="Carolina">Carolina</option>
              <option value="Juan-pablo">Juan Pablo</option>
              <option value="Sebastian">Sebastian</option>
            </select>
          </div>

          {/* Horario del Turno */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">
                Hora de Inicio <span className="required">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={errors.startTime ? 'error' : ''}
              />
              {errors.startTime && <span className="error-message">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">
                Hora de Fin <span className="required">*</span>
              </label>
              <input
                type="time"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className={errors.endTime ? 'error' : ''}
              />
              {errors.endTime && <span className="error-message">{errors.endTime}</span>}
            </div>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label htmlFor="description">
              Descripción <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe las novedades del turno..."
              rows="4"
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
          </div>

          {/* Tabla de Ingresos */}
          <div className="form-group">
            <IncomeTable incomes={incomes} setIncomes={setIncomes} />
          </div>

          {/* Botones */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              <FaSave /> Guardar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;