import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet
} from '@react-pdf/renderer';

const AREAS = [
    "PISOS",
    "PAREDES",
    "TECHOS",
    "MESONES",
    "PUERTA",
    "NEVERAS",
    "MICROONDAS",
    "ESTUFA",
    "CAMPANA",
    "RECIPIENTES",
    "TRAMPA",
    "ASEO PROFUNDO"
];

const styles = StyleSheet.create({

    page: {
        padding: 8,
        fontSize: 7
    },

    /* HEADER SUPERIOR */

    headerContainer: {
        flexDirection: "row",
        border: "1 solid black",
        marginBottom: 4
    },

    headerLeft: {
        width: "20%",
        borderRight: "1 solid black",
        justifyContent: "center",
        alignItems: "center",
        padding: 4
    },

    headerCenter: {
        width: "60%",
        borderRight: "1 solid black",
        justifyContent: "center",
        alignItems: "center",
        padding: 4
    },

    headerRight: {
        width: "20%",
        justifyContent: "center",
        padding: 4
    },

    title: {
        fontSize: 10,
        fontWeight: "bold"
    },

    bold: {
        fontWeight: "bold"
    },

    /* HEADER VERTICAL */

    headerRow: {
        flexDirection: "row",
        height: 90
    },

    verticalCell: {
        width: 18,
        border: "1 solid black",
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 4
    },

    verticalText: {
        transform: "rotate(-90deg)",
        fontSize: 6,
        textAlign: "center"
    },

    areaTitle: {
        width: 25,
        border: "1 solid black",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#e6eef6"
    },

    firmaHeader: {
        width: 80,
        border: "1 solid black",
        justifyContent: "center",
        alignItems: "center"
    },

    obsHeader: {
        flex: 1,
        border: "1 solid black",
        justifyContent: "center",
        alignItems: "center"
    },

    /* FILAS */

    row: {
        flexDirection: "row",
        height: 16
    },

    dayCell: {
        width: 25,
        border: "1 solid black",
        textAlign: "center"
    },

    areaCell: {
        width: 18,
        border: "1 solid black",
        textAlign: "center"
    },

    firmaCell: {
        width: 80,
        border: "1 solid black",
        paddingLeft: 2
    },

    obsCell: {
        flex: 1,
        border: "1 solid black",
        paddingLeft: 2
    }

});


const LimpiezaPDF = ({ data = [] }) => {

    const mes = data[0]?.mes || "";
    const anio = data[0]?.anio || "";

    const registrosPorDia = {};

    data.forEach(reg => {

        const dia = parseInt(reg.fecha.split("/")[0]);

        registrosPorDia[dia] = reg;

    });

    return (

        <Document>

            <Page size="A4" orientation="landscape" style={styles.page}>

                {/* HEADER SUPERIOR */}

                <View style={styles.headerContainer}>

                    <View style={styles.headerLeft}>
                        <Text style={styles.bold}>ÚRSULA CAFÉ</Text>
                        <Text>MES: {mes}</Text>
                    </View>

                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>
                            REGISTRO DE ASEO SERVICIO DE ALIMENTACIÓN
                        </Text>
                        <Text>AÑO: {anio}</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <Text>Versión: 01</Text>
                        <Text>Fecha: Julio 2025</Text>
                    </View>

                </View>


                {/* HEADER VERTICAL */}

                <View style={styles.headerRow}>

                    <View style={styles.areaTitle}>
                        <Text style={styles.verticalText}>ÁREAS</Text>
                    </View>

                    {AREAS.map((area, index) => (

                        <View key={index} style={styles.verticalCell}>
                            <Text style={styles.verticalText}>
                                {area}
                            </Text>
                        </View>

                    ))}

                    <View style={styles.firmaHeader}>
                        <Text>FIRMA AUXILIAR</Text>
                    </View>

                    <View style={styles.firmaHeader}>
                        <Text>FIRMA SUPERVISOR</Text>
                    </View>

                    <View style={styles.obsHeader}>
                        <Text>OBSERVACIONES</Text>
                    </View>

                </View>


                {/* FILAS */}

                {Array.from({ length: 31 }, (_, i) => {

                    const dia = i + 1;

                    const reg = registrosPorDia[dia];

                    return (

                        <View key={dia} style={styles.row}>

                            <Text style={styles.dayCell}>
                                {dia}
                            </Text>

                            {AREAS.map((area, index) => (

                                <Text key={index} style={styles.areaCell}>
                                    {reg?.areasLimpiadas?.includes(area) ? "X" : ""}
                                </Text>

                            ))}

                            <Text style={styles.firmaCell}>
                                {reg?.firmaAuxiliar || ""}
                            </Text>

                            <Text style={styles.firmaCell}>
                                {reg?.firmaSupervisor || ""}
                            </Text>

                            <Text style={styles.obsCell}>
                                {reg?.observaciones || ""}
                            </Text>

                        </View>

                    );

                })}

            </Page>

        </Document>

    );

};

export default LimpiezaPDF;