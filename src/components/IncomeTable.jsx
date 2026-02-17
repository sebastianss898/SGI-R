// src/components/IncomeTable.jsx
import React, { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import '../styles/incomeTable.css';

const IncomeTable = ({ incomes, setIncomes }) => {
  const [newIncome, setNewIncome] = useState({
    room: '',
    concept: 'alojamiento',
    paymentMethod: 'efectivo',
    amount: '',
  });

  const conceptOptions = [
    { value: 'alojamiento', label: 'Alojamiento' },
    { value: 'iva', label: 'IVA' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'restaurante', label: 'Restaurante' },
    { value: 'bar', label: 'Bar' },
    { value: 'lavanderia', label: 'Lavandería' },
    { value: 'otros', label: 'Otros' },
  ];

  const paymentMethods = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'voucher', label: 'Voucher' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'tarjeta', label: 'Tarjeta' },
  ];

  const handleAddIncome = () => {
    if (newIncome.room && newIncome.amount) {
      const income = {
        ...newIncome,
        amount: parseFloat(newIncome.amount),
        id: Date.now(),
      };
      
      setIncomes([...incomes, income]);
      
      // Limpiar formulario
      setNewIncome({
        room: '',
        concept: 'alojamiento',
        paymentMethod: 'efectivo',
        amount: '',
      });
    }
  };

  const handleDeleteIncome = (id) => {
    setIncomes(incomes.filter(income => income.id !== id));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIncome(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = () => {
    return incomes.reduce((sum, income) => sum + income.amount, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIncome();
    }
  };

  return (
    <div className="income-table-container">
      <h4 className="income-title">Registro de Ingresos</h4>
      
      {/* Formulario de entrada */}
      <div className="income-form">
        <div className="income-form-row">
          <input
            type="text"
            name="room"
            placeholder="Hab. 411"
            value={newIncome.room}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="income-input room-input"
          />
          
          <select
            name="concept"
            value={newIncome.concept}
            onChange={handleInputChange}
            className="income-input concept-input"
          >
            {conceptOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <select
            name="paymentMethod"
            value={newIncome.paymentMethod}
            onChange={handleInputChange}
            className="income-input payment-input"
          >
            {paymentMethods.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <input
            type="number"
            name="amount"
            placeholder="152,000"
            value={newIncome.amount}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="income-input amount-input"
            min="0"
            step="1000"
          />
          
          <button
            type="button"
            onClick={handleAddIncome}
            className="btn-add-income"
            disabled={!newIncome.room || !newIncome.amount}
          >
            <FaPlus /> Agregar
          </button>
        </div>
      </div>

      {/* Tabla de ingresos */}
      {incomes.length > 0 && (
        <div className="income-table-wrapper">
          <table className="income-table">
            <thead>
              <tr>
                <th>Habitación</th>
                <th>Concepto</th>
                <th>Método de Pago</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((income) => (
                <tr key={income.id}>
                  <td className="room-cell">{income.room}</td>
                  <td className="concept-cell">
                    <span className={`concept-badge ${income.concept}`}>
                      {conceptOptions.find(c => c.value === income.concept)?.label}
                    </span>
                  </td>
                  <td className="payment-cell">
                    <span className={`payment-badge ${income.paymentMethod}`}>
                      {paymentMethods.find(p => p.value === income.paymentMethod)?.label}
                    </span>
                  </td>
                  <td className="amount-cell">{formatCurrency(income.amount)}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      onClick={() => handleDeleteIncome(income.id)}
                      className="btn-delete-income"
                      title="Eliminar"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="3" className="total-label">Total:</td>
                <td className="total-amount">{formatCurrency(calculateTotal())}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {incomes.length === 0 && (
        <div className="empty-state">
          <p>No hay ingresos registrados. Agrega el primer ingreso arriba.</p>
        </div>
      )}
    </div>
  );
};

export default IncomeTable;