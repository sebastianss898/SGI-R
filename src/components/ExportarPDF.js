import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from "firebase/firestore";
import { PDFDownloadLink } from '@react-pdf/renderer';
import LimpiezaPDF from './LimpiezaPDF';

const ExportarPDF = () => {

    const [registros, setRegistros] = useState([]);

    const cargarDatos = async () => {

        try {

            const querySnapshot = await getDocs(collection(db, "limpiezaDesinfeccion", "2026", "febrero"));

            const datos = [];

            querySnapshot.forEach((doc) => {
                datos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log("Datos:", datos);

            setRegistros(datos);

        } catch (error) {

            console.error("Error:", error);
            alert(error.message);

        }

    };

    return (
        <div>

            <button onClick={cargarDatos}>
                Cargar Registros
            </button>

            {registros.length > 0 && (
                <PDFDownloadLink
                    document={<LimpiezaPDF data={registros} />}
                    fileName="Reporte_Limpieza.pdf"
                >
                    {({ loading }) =>
                        loading ? 'Generando PDF...' : 'Descargar PDF'
                    }
                </PDFDownloadLink>
            )}

        </div>
    );
};

export default ExportarPDF;