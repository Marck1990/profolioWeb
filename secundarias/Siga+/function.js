// ==================================

// GENERAR LA MANCHA POLIGONAL 
function generarAreaIrregular(zona) {
    const { lat, lon } = zona.ubicacion.coordenadas;

    const puntos = [];
    const cantidadPuntos = 8; // más puntos = forma más orgánica

    // tamaño base según humedad
    const baseOffset = (100 - zona.suelo.humedadSuelo) / 1000;

    for (let i = 0; i < cantidadPuntos; i++) {
        const angulo = (i / cantidadPuntos) * (2 * Math.PI);

        // variación aleatoria para que no sea perfecto
        const variacion = baseOffset * (0.7 + Math.random() * 0.6);

        const latOffset = Math.sin(angulo) * variacion;
        const lonOffset = Math.cos(angulo) * variacion;

        puntos.push([lat + latOffset, lon + lonOffset]);
    }

    return puntos;
}

// FUNCIÓN para obtener el centro del polígono
function obtenerCentro(area) {
    let latSum = 0;
    let lonSum = 0;

    area.forEach(p => {
        latSum += p[0];
        lonSum += p[1];
    });

    return [
        latSum / area.length,
        lonSum / area.length
    ];
}

// ==================================
//  Datos

const zonas = [
    {
        ubicacion: {
            departamento: "Florida",
            zona: "Sarandí Grande",
            coordenadas: { lat: -33.733, lon: -56.33 }
        },
        clima: { temperatura: 2, humedadRelativa: 85 },
        suelo: { humedadSuelo: 30 },
        vegetacion: { ndvi: 0.5 },

        area: [
            [-33.70, -56.35],
            [-33.75, -56.30],
            [-33.72, -56.25],
            [-33.68, -56.28]
        ],

        puntosReferencia: [
            { lat: -33.733, lon: -56.33 }
        ]
    },
    {
        ubicacion: {
            departamento: "Florida",
            zona: "Casupá",
            coordenadas: { lat: -34.1, lon: -55.65 }
        },
        clima: { temperatura: 10, humedadRelativa: 60 },
        suelo: { humedadSuelo: 55 },
        vegetacion: { ndvi: 0.7 },

        area: [
            [-34.12, -55.70],
            [-34.08, -55.68],
            [-34.05, -55.62],
            [-34.10, -55.60]
        ],

        puntosReferencia: [
            { lat: -34.1, lon: -55.65 }
        ]
    }
];

const estaciones = [
    { nombre: "Estación 1", tipo: "Temperatura", coordenadas: { lat: -33.735, lon: -56.331 } },
    { nombre: "Estación 2", tipo: "Humedad", coordenadas: { lat: -34.102, lon: -55.652 } }
];

// ==================================
//  Motor de reglas
function analizarEstado(zona) {
    let estado = {};

    estado.agua = zona.suelo.humedadSuelo < 40 ? "Bajo" : "Adecuado";
    estado.helada = zona.clima.temperatura <= 3 ? "Alto" : "Bajo";
    estado.vegetacion = zona.vegetacion.ndvi < 0.4 ? "Pobre" : "Buena";

    if (estado.helada === "Alto") {
        estado.recomendacion = "Evitar siembra";
    } else if (estado.agua === "Bajo") {
        estado.recomendacion = "Considerar riego";
    } else {
        estado.recomendacion = "Condiciones estables";
    }

    return estado;
}

// ==================================
// 3. Crear mapa
const map = L.map('map').setView([-33.5, -56], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// ==================================
// LayerGroups para escalabilidad
const zonasLayer = L.layerGroup().addTo(map);
const estacionesLayer = L.layerGroup().addTo(map);
const busquedaLayer = L.layerGroup().addTo(map);

// GUARDAR ZONAS RENDERIZADAS
const zonasRenderizadas = {};

// ==================================
// Función de renderizado
function renderZona(zona) {
    const estado = analizarEstado(zona);
    const color = obtenerColor(estado);
    const area = generarAreaIrregular(zona);

    // MANCHA POLIGONAL
    const polygon = L.polygon(area, {
        color: color,
        fillColor: color,
        fillOpacity: 0.3
    }).addTo(zonasLayer);

    // CENTRO Y TEXTO LABEL
    const centro = obtenerCentro(area);
    const texto = `
        <div>
            <b>${zona.ubicacion.zona}</b><br>
            Condición: ${estado.helada === "Alto" ? "Helada" : "Normal"}<br>
            Temp: ${zona.clima.temperatura}°C
        </div>
    `;

    const label = L.marker(centro, {
        icon: L.divIcon({
            className: 'label-zona',
            html: texto
        })
    }).addTo(zonasLayer);

    polygon.bindPopup(`
        <b>${zona.ubicacion.zona}</b><br>
        Agua suelo: ${estado.agua}<br>
        Riesgo helada: ${estado.helada}<br>
        Vegetación: ${estado.vegetacion}<br>
        <hr>
        <b>${estado.recomendacion}</b>
    `);

    // MARKERS
    const markers = [];

    if (zona.puntosReferencia) {
        zona.puntosReferencia.forEach(p => {
            const marker = L.marker([p.lat, p.lon])
                .addTo(zonasLayer)
                .bindPopup(`Punto de referencia`);

            markers.push(marker);
        });
    }

    zonasRenderizadas[normalizarTexto(zona.ubicacion.zona)] = {
        zona: zona,
        polygon: polygon,
        label: label,
        markers: markers,
        area: area
    };
}

function renderEstaciones(listaEstaciones) {
    listaEstaciones.forEach(e => {
        L.marker([e.coordenadas.lat, e.coordenadas.lon])
            .addTo(estacionesLayer)
            .bindPopup(`${e.nombre} (${e.tipo})`);
    });
}

// ==================================
// Render inicial
zonas.forEach(renderZona);
renderEstaciones(estaciones);

// ==================================
// Colores
function obtenerColor(estado) {
    if (estado.helada === "Alto") return "lightblue";
    if (estado.agua === "Bajo") return "orange";
    return "green";
}

// ==================================
//  Busqueda de localidad
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function crearZonaTemporal(nombre, lat, lon) {
    return {
        ubicacion: {
            departamento: "Sin definir",
            zona: nombre,
            coordenadas: { lat: lat, lon: lon }
        },
        clima: {
            temperatura: 6,
            humedadRelativa: 70
        },
        suelo: {
            humedadSuelo: 50
        },
        vegetacion: {
            ndvi: 0.6
        },
        puntosReferencia: [
            { lat: lat, lon: lon }
        ]
    };
}

function renderBusquedaTemporal(zona) {
    busquedaLayer.clearLayers();

    const estado = analizarEstado(zona);
    const color = obtenerColor(estado);
    const area = generarAreaIrregular(zona);

    const polygon = L.polygon(area, {
        color: color,
        fillColor: color,
        fillOpacity: 0.3
    }).addTo(busquedaLayer);

    const centro = obtenerCentro(area);

    const texto = `
        <div>
            <b>${zona.ubicacion.zona}</b><br>
            Condición: ${estado.helada === "Alto" ? "Helada" : "Normal"}<br>
            Temp: ${zona.clima.temperatura}°C
        </div>
    `;

    L.marker(centro, {
        icon: L.divIcon({
            className: 'label-zona',
            html: texto
        })
    }).addTo(busquedaLayer);

    if (zona.puntosReferencia) {
        zona.puntosReferencia.forEach(p => {
            L.marker([p.lat, p.lon])
                .addTo(busquedaLayer)
                .bindPopup(`Punto buscado`);
        });
    }

    polygon.bindPopup(`
        <b>${zona.ubicacion.zona}</b><br>
        Agua suelo: ${estado.agua}<br>
        Riesgo helada: ${estado.helada}<br>
        Vegetación: ${estado.vegetacion}<br>
        <hr>
        <b>${estado.recomendacion}</b>
    `).openPopup();

    map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
}

async function buscarLocalidad() {
    const input = document.getElementById("busqueda");
    const textoOriginal = input.value.trim();
    const texto = normalizarTexto(textoOriginal);

    if (texto === "") {
        alert("Ingresá una localidad");
        return;
    }

    const zonaEncontrada = zonasRenderizadas[texto];

    if (zonaEncontrada) {
        busquedaLayer.clearLayers();

        const bounds = zonaEncontrada.polygon.getBounds();
        map.fitBounds(bounds, { padding: [30, 30] });
        zonaEncontrada.polygon.openPopup();
        return;
    }

    try {
        const consulta = encodeURIComponent(`${textoOriginal}, Uruguay`);
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${consulta}&limit=1`;

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("No se pudo consultar la API");
        }

        const data = await response.json();

        if (data.length === 0) {
            alert("Localidad no encontrada");
            return;
        }

        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        const zonaTemporal = crearZonaTemporal(textoOriginal, lat, lon);
        renderBusquedaTemporal(zonaTemporal);

    } catch (error) {
        console.error("Error en búsqueda:", error);
        alert("Ocurrió un error al buscar la localidad");
    }
}

document.getElementById("busqueda").addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        buscarLocalidad();
    }
});

document.getElementById("btnBuscar").addEventListener("click", buscarLocalidad);