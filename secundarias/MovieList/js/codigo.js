var swiperHome = null;
var swiperMapa = null;

// esto es para los emojis
var dicEmojis = null;
// eto es para guarda las pelisculas
var peliculasCache = [];
// Para poder determinarla mas tarde
var dicCategorias = null;



// variables para nmapa
var mapa = null;
var markersMapa = [];





// se crea una variable para que nuestra aplicacion tenga una loanded a nivel global
const loading = document.createElement('ion-loading');




// CONSTANTES A USAR
const MENU = document.querySelector("#menu");
const ROUTER = document.querySelector("#ruteo");
const HOME = document.querySelector("#pantalla-home");
const REGISTRO = document.querySelector("#pantalla-registro");
const LOGIN = document.querySelector("#pantalla-login");
const URL_BASE = "https://movielist.develotion.com";
const NAV = document.querySelector("ion-nav");

const PAISES = "https://movielist.develotion.com/paises";

// PARA AGREGAR PELICULAS
const AGREGAR = document.querySelector("#pantalla-agregar");
const LISTADO = document.querySelector("#pantalla-listado");
const ESTADISTICAS = document.querySelector("#pantalla-estadisticas");
const MAPA = document.querySelector("#pantalla-mapa");





// OCULTADO DE PANTALLAS



function OcultarPantallas() {
    HOME.style.display = "none";
    REGISTRO.style.display = "none";
    LOGIN.style.display = "none";
    AGREGAR.style.display = "none";
    LISTADO.style.display = "none";
    ESTADISTICAS.style.display = "none";
    MAPA.style.display = "none";
}

// --------------

// LIMPIAR REGISTROS

function LimpiarRegistro() {

    var u = document.querySelector("#txtRegistroUsuario");
    var p = document.querySelector("#txtRegistroPassword");
    var s = document.querySelector("#slcRegistroPais");

    if (u != null) {
        u.value = "";
    }

    if (p != null) {
        p.value = "";
    }

    if (s != null) {
        s.value = "";
    }
}


// ---------------------------






// FUNCION DE BNAVEGAR



function Navegar(evt) {

    let ruta = evt.detail.to;
    console.log(ruta)

    OcultarPantallas();

    if (ruta == "/") {
        HOME.style.display = "block";
        IniciarSwiperHome()
    }
    else if (ruta == "/agregar") {
        AGREGAR.style.display = "block";
        LimpiarFormularioAgregar()
        PoblarCategorias();
    }
    // ListarPeliculas();
    else if (ruta == "/listado") {
        LISTADO.style.display = "block";
        ListarPeliculas();

    }
    // CargarEstadisticas();
    else if (ruta == "/estadisticas") {
        ESTADISTICAS.style.display = "block";
        MostrarEstadisticas();

    }
    else if (ruta == "/mapa") {
        MAPA.style.display = "block";
        MostrarMapaUsuarios();
        IniciarSwiperMapa();


    }
    else if (ruta == "/registro") {
        REGISTRO.style.display = "block"
        LimpiarRegistro()
        PoblarSelectPaises();
    }
    else if (ruta == "/login") {
        LOGIN.style.display = "block";
    }
    MENU.close();

}



// -----------------



// LOS EVENTOS AL HACER CLICKKK

function Eventos() {

    ROUTER.addEventListener('ionRouteDidChange', Navegar);
    document.querySelector("#btnLogin").addEventListener("click", TomarDatosLogin)
    document.querySelector("#btnRegistro").addEventListener("click", TomarDatosRegistro)
    document.querySelector("#btnAgregarPelicula").addEventListener("click", AltaPelicula);


    var btnFiltro = document.querySelector("#btnAplicarFiltro")
    if (btnFiltro != null) {
        btnFiltro.addEventListener("click", ClickAplicarFiltro)
    }

    var btn = document.querySelector("#btnActualizarMapa");
    if (btn != null) {
        btn.addEventListener("click", ClickActualizarMapa);
    }

}
// ---------------
function ClickActualizarMapa() {
    MostrarMapaUsuarios();
}



function IniciarSwiperMapa() {

    if (swiperMapa != null) {
        return;
    }

    var el = document.querySelector("#swiperMapa");
    if (el == null) {
        return;
    }

    swiperMapa = new Swiper("#swiperMapa", {
        loop: true,
        slidesPerView: 1.25,
        spaceBetween: 12,
        breakpoints: {
            640: {
                slidesPerView: 2.2
            },
            992: {
                slidesPerView: 3.2
            }
        }
    });
}



Inicio();

function Inicio() {

    ArmarMenu();
    Eventos();
    OcultarPantallas();
    HOME.style.display = "block";
    IniciarSwiperHome()

}




async function TomarDatosRegistro() {

    var registroUsu = document.querySelector("#txtRegistroUsuario").value;
    var registroPass = document.querySelector("#txtRegistroPassword").value;
    var idPais = document.querySelector("#slcRegistroPais").value;

    // validaciones mínimas
    if (idPais == null || idPais == "") {
        Alertar("Registro", "Validación", "Tenés que seleccionar un país");
        return;
    }

    var r = new Object();
    r.usuario = registroUsu;
    r.password = registroPass;
    r.idPais = Number(idPais);   

    PrenderLoader("Registrando Usuario");

    var response = await fetch(URL_BASE + "/usuarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(r)
    });

    ApagarLoader();

    if (response.status == 200) {
        var data = await response.json();
        MostrarToast("Registro exitoso", 2500)

        // si tu API devuelve token, guardalo:
        if (data.token != undefined) {
            localStorage.setItem("token", data.token)
        }

        ArmarMenu();
        NAV.push("page-home");
    } else {
        var dataErr;
        try { dataErr = await response.json(); } catch (e) { dataErr = {} }
        Alertar("Registro", "Error", dataErr.error || "No se pudo registrar")
    }
}


function DatosRegistroValido(registroPass, registroUsu) {


    // validacion de todo aqui


    return true
}



// TOMAR DATOS DEL LOGIN------


async function TomarDatosLogin() {

    var usu = document.querySelector("#txtLoginUsuario").value;
    var pass = document.querySelector("#txtLoginPassword").value;

    var objLogin = new Object();
    objLogin.usuario = usu;
    objLogin.password = pass;

    PrenderLoader("Iniciando sesión...");

    var response = null;

    try {
        response = await fetch(URL_BASE + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(objLogin)
        });

        if (response.status == 200) {

            var dataOk = await response.json();

            localStorage.setItem("token", dataOk.token);

            if (dataOk.id != undefined) {
                localStorage.setItem("idUsuario", dataOk.id);
            }

            MostrarToast("Bienvenido", 1800);
            ArmarMenu();
            NAV.push("page-home");

        } else {

            var dataErr;
            try {
                dataErr = await response.json();
            } catch (e) {
                dataErr = {};
            }

            var msg = "Usuario o contraseña incorrectos";
            if (dataErr.error != undefined && dataErr.error != "") {
                msg = dataErr.error;
            }

            Alertar("Login", "Error", msg);
        }

    } catch (e) {
        Alertar("Login", "Error", "No se pudo conectar con el servidor");
    }

    ApagarLoader();



    // validardatos
}
// ------------------K





// ----------------------PAISES----------------

async function PoblarSelectPaises() {


    let response = await fetch(`${URL_BASE}/paises`, {
        method: 'GET',
        headaers: {
            'Content-Type': 'application/json'
        },

    })
    let data = await response.json()

    if (data.codigo == 200) {
        let html = ``;

        for (let pais of data.paises) {
            html += `<ion-select-option value="${pais.id}">${pais.nombre}</ion-select-option>`;
        }

        document.querySelector("#slcRegistroPais").innerHTML = html
    }

}


// --------------------------






// ARMADO DEL MENU

function ArmarMenu() {

    let hayToken = localStorage.getItem("token");

    let html = `<ion-item href="/">🏠 Home</ion-item>`
    if (hayToken) {
        html += `
      <ion-item href="/agregar">➕ Agregar película</ion-item>
      <ion-item href="/listado">🎞️ Listado</ion-item>
      <ion-item href="/estadisticas">📊 Estadísticas</ion-item>
      <ion-item href="/mapa">🌍 Mapa</ion-item>
      <ion-item onclick="CerrarSesion()">🚪 Logout</ion-item>
    `;
    } else {
        html += ` <ion-item href="/registro">✨ Registro</ion-item>
                <ion-item href="/login">🔐 Login</ion-item>`
    }

    document.querySelector("#menu-opciones").innerHTML = html;
}

// ---------------------



// FUNCION DE CERRAR SESIONy LIMPIAR LOGIN

function CerrarSesion() {
    localStorage.clear();
    LimpiarLogin()
    LimpiarRegistro()
    ArmarMenu()
    LimpiarFormularioAgregar()
    MENU.close();
    MostrarToast("Sesión cerrada", 1800);
    NAV.push("page-home")

}

function LimpiarLogin() {

    var u = document.querySelector("#txtLoginUsuario");
    var p = document.querySelector("#txtLoginPassword");

    if (u != null) {
        u.value = "";
    }

    if (p != null) {
        p.value = "";
    }
}


// ---------------------AGREGAR DE PELICULAS--------------------------



// ---------- HEADERS CON AUTH (Bearer) ----------
function HeadersConAuth() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

// ---------------- POBLAR CATEGORIAS ----------------
async function PoblarCategorias() {
    const token = localStorage.getItem("token");
    if (!token) {
        Alertar("Sesión", "Error", "Tenés que iniciar sesión");
        return;
    }

    const response = await fetch(`${URL_BASE}/categorias`, {
        method: "GET",
        headers: HeadersConAuth()
    });

    if (response.status === 200) {
        const data = await response.json();

        let html = "";
        for (const cat of data.categorias) {
            html += `<ion-select-option value="${cat.id}">${cat.emoji ?? ""} ${cat.nombre}</ion-select-option>`;
        }
        document.querySelector("#slcCategoria").innerHTML = html;
    } else {
        const data = await response.json().catch(() => ({}));
        Alertar("Categorías", "Error", data.error || "No se pudieron cargar categorías");
    }
}


// ----------------------------------


// CARGAR EMOJIS yCATEGORIAS Y EDAD

async function CargarDiccionarioCategorias() {
    console.log("dicCategorias al entrar:", dicCategorias);

    if (dicCategorias != null) {
        return;
    }

    var response = await fetch(URL_BASE + "/categorias", {
        method: "GET",
        headers: HeadersConAuth()
    });

    if (response.status == 200) {

        var data;
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        dicCategorias = {};

        for (var i = 0; i < data.categorias.length; i++) {

            var c = data.categorias[i];

            dicCategorias[c.id] = {
                nombre: c.nombre,
                emoji: c.emoji,
                edad_requerida: c.edad_requerida
            };
        }

    } else {

        dicCategorias = {};
        Alertar("Categorías", "Error", "No se pudieron cargar las categorías");
    }
}
// ----------------------



// ---------------- VALIDACIONES ALTA PELI ----------------
function ValidarAltaPelicula(categoriaId, nombre, fecha, comentario) {

    if (categoriaId == null || categoriaId == "")
        return "Falta seleccionar categoría.";

    if (nombre == null || nombre.trim().length < 2)
        return "El nombre es obligatorio (mínimo 2 caracteres)."

    if (fecha == null || fecha == "")
        return "Falta la fecha."


    var hoy = new Date()
    hoy.setHours(0, 0, 0, 0);

    var fechaSel = new Date(fecha + "T00:00:00");
    if (fechaSel > hoy) return "La fecha no puede ser posterior a hoy.";

    if (comentario == null || comentario.trim().length < 3) return "El comentario es obligatorio (mínimo 3 caracteres).";

    return null;
}
// -------------------






// ---------------- REGISTRAR PELICULA (POST) ----------------
async function RegistrarPelicula(categoriaId, nombre, fecha) {
    const response = await fetch(`${URL_BASE}/peliculas`, {
        method: "POST",
        headers: HeadersConAuth(),
        body: JSON.stringify({
            idCategoria: Number(categoriaId),
            nombre: nombre.trim(),
            fechaEstreno: fecha
        })
    });

    if (response.status === 200 || response.status === 201) return true;

    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = {};
    }
    Alertar("Alta película", "Error", data.error || "No se pudo registrar");
    return false;
}

// -----------------------




// ---------------- ALTA PELICULA ----------------
async function AltaPelicula() {

    var categoriaId = document.querySelector("#slcCategoria").value;
    var nombre = document.querySelector("#txtNombrePelicula").value;
    var fecha = document.querySelector("#txtFechaVista").value;
    var comentario = document.querySelector("#txtComentario").value;

    var error = ValidarAltaPelicula(categoriaId, nombre, fecha, comentario);
    if (error) {
        Alertar("Validación", "Revisá los datos", error);
        return;
    }

    PrenderLoader("Analizando comentario...");

    var sentimiento = await EvaluarSentimiento(comentario);

    // si hubo problema con IA
    if (sentimiento == "negativo") {
        ApagarLoader();
        Alertar("No se registró", "Comentario negativo", "Solo se permiten comentarios neutros o positivos.");
        return;
    }

    // si es negativo NO se registra
    if (sentimiento == "negativo") {
        ApagarLoader();
        Alertar("No se registró", "Comentario negativo", "Solo se permiten comentarios neutros o positivos.");
        return;
    }

    // neutro o positivo => registrar
    PrenderLoader("Registrando película...");

    var ok = await RegistrarPelicula(categoriaId, nombre, fecha);

    ApagarLoader();

    if (ok) {
        MostrarToast("Película registrada", 2000);
        NAV.push("page-listado");
    }
}

// ------------------------



// LISTAR PELICULAS

async function ListarPeliculas() {

    await CargarDiccionarioCategorias();
    var response = await fetch(URL_BASE + "/peliculas", {
        method: "GET",
        headers: HeadersConAuth()
    });


    if (response.status == 200) {

        var data;
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        var peliculas;

        if (data.peliculas) {
            peliculas = data.peliculas;
        } else {
            peliculas = data;
        }


        peliculasCache = peliculas;



        var peliculasFiltradas = FiltrarPeliculasPorFecha(peliculasCache);
        var html = "";


        for (var i = 0; i < peliculasFiltradas.length; i++) {

            var p = peliculasFiltradas[i];

            console.log("INDEX:", i, "PELÍCULA:", p);

            if (p == undefined) {
                continue;
            }



            var emoji = "🎬";

            if (dicCategorias != null) {
                var cat = dicCategorias[p.idCategoria];

                if (cat != undefined) {
                    if (cat.emoji != undefined) {
                        emoji = cat.emoji;
                    }
                }
            }

            if (emoji == undefined) {
                emoji = "🎬";
            }

            html += `
  <ion-item>
    <ion-label>
      <h2>${emoji} ${p.nombre}</h2>
      <p>Vista el: ${FormatearFechaPelicula(p.fechaEstreno)}</p>
    </ion-label>

  <ion-button color="danger" class="btnEliminar" data-id="${p.id}">
Eliminar
</ion-button>
  </ion-item>
`;
        }

        if (html == "") {
            html = `
  <ion-item>
    <ion-label>
      <h2>🎬 No hay películas para mostrar</h2>
      <p>Probá con otro filtro o agregá una nueva película.</p>
    </ion-label>
  </ion-item>
`;
        }

        document.querySelector("#lstPeliculas").innerHTML = html;


        var botones = document.querySelectorAll(".btnEliminar");

        for (var i = 0; i < botones.length; i++) {

            botones[i].addEventListener("click", ClickEliminar);
        }

    } else {

        Alertar("Listado", "Error", "No se pudieron obtener las películas");
    }
}


// funcion intermedia para onbtener el id al cual elimiarr-------
async function ClickEliminar() {

    var id = this.getAttribute("data-id");

    EliminarPelicula(id);
}
// ----------------------




// -------FILTRADO DE PELICULAS POR FECHA------------
function ClickAplicarFiltro() {
    ListarPeliculas();
}


function CambioFiltroFecha() {
    ListarPeliculas();
}



function ObtenerFiltroSeleccionado() {
    var slc = document.querySelector("#slcFiltroFecha");

    if (slc == null) {
        return "todas";
    }

    var valor = slc.value;

    if (valor == null || valor == "") {
        return "todas";
    }

    return valor;
}




function FiltrarPeliculasPorFecha(lista) {

    if (lista == null) {
        return [];
    }
    var filtro = ObtenerFiltroSeleccionado();

    if (filtro == "todas") {
        return lista;
    }

    var dias = 0;

    if (filtro == "semana") {
        dias = 7;
    } else if (filtro == "mes") {
        dias = 30;
    }

    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    var resultado = [];

    for (var i = 0; i < lista.length; i++) {
        var p = lista[i];

        if (p == undefined) {
            continue;
        }


        var f = new Date(p.fechaEstreno + "T00:00:00");

        var ms = hoy - f;
        var diffDias = ms / (1000 * 60 * 60 * 24);

        if (diffDias >= 0 && diffDias <= dias) {
            resultado.push(p);
        }
    }

    return resultado;
}





// -------------------------------------------







// ---------------- ELIMINAR PELICULA ----------------
async function EliminarPelicula(idPelicula) {
    const response = await fetch(`${URL_BASE}/peliculas/${idPelicula}`, {
        method: "DELETE",
        headers: HeadersConAuth()
    });

    if (response.status === 200 || response.status === 204) {
        MostrarToast("Película eliminada", 2000);
        ListarPeliculas();
    } else {
        let data;
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }
        Alertar("Eliminar", "Error", data.error || "No se pudo eliminar");
    }
}







// ------------------ESTADISTICAS-------------------

async function MostrarEstadisticas() {

    await CargarDiccionarioCategorias();

    // 1) Traer películas del usuario
    var response = await fetch(URL_BASE + "/peliculas", {
        method: "GET",
        headers: HeadersConAuth()
    });

    if (response.status != 200) {
        Alertar("Estadísticas", "Error", "No se pudieron obtener las películas");
        return;
    }

    var data;
    try {
        data = await response.json();
    } catch (e) {
        data = {};
    }

    var peliculas;

    if (data.peliculas != undefined) {
        peliculas = data.peliculas;
    } else {
        peliculas = data;
    }

    if (peliculas == null) {
        peliculas = [];
    }

    //Conteo por categoría
    var conteo = {}; // 

    for (var i = 0; i < peliculas.length; i++) {
        var p = peliculas[i];

        if (p == undefined) {
            continue;
        }

        var idCat = p.idCategoria;

        if (conteo[idCat] == undefined) {
            conteo[idCat] = 1;
        } else {
            conteo[idCat] = conteo[idCat] + 1;
        }
    }

    // Render categorías + cantidad
    var html = "";

    for (var id in conteo) {

        var cat = dicCategorias[id];

        var emoji = "🎬";
        var nombre = "Categoría " + id;

        if (cat != undefined) {
            if (cat.emoji != undefined) {
                emoji = cat.emoji;
            }
            if (cat.nombre != undefined) {
                nombre = cat.nombre;
            }
        }

        html += `
  <ion-item>
    <ion-label>${emoji} ${nombre}</ion-label>
    <ion-badge slot="end">${conteo[id]}</ion-badge>
  </ion-item>
`;
    }

    if (html == "") {
        html = `<ion-item><ion-label>No hay películas registradas</ion-label></ion-item>`;
    }

    document.querySelector("#lstStatsCategorias").innerHTML = html;


    var total = 0;
    var aptas12 = 0;

    for (var j = 0; j < peliculas.length; j++) {
        var pel = peliculas[j];

        if (pel == undefined) {
            continue;
        }

        total = total + 1;


        var catPeli = dicCategorias[pel.idCategoria];

        if (catPeli != undefined) {
            if (catPeli.edad_requerida >= 12) {
                aptas12 = aptas12 + 1;
            }
        }
    }

    var resto = total - aptas12;

    var pctAptas = 0;
    var pctResto = 0;

    if (total > 0) {
        pctAptas = Math.round((aptas12 * 100) / total);
        pctResto = 100 - pctAptas;
    }

    document.querySelector("#lblStatsAptas").innerHTML =
        `Total: ${total}<br>
         Aptas +12: ${aptas12} (${pctAptas}%)<br>
         Resto: ${resto} (${pctResto}%)`;
}

// -----------------------------------------------------------










// ----------------------------MAPA------------------------

async function MostrarMapaUsuarios() {


    if (mapa == null) {
        // centro aprox Uruguay, zoom regional
        mapa = L.map("mapaUsuarios").setView([-34.9011, -56.1645], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18
        }).addTo(mapa);
    }

    setTimeout(function () {
        mapa.invalidateSize();
    }, 300);


    for (var i = 0; i < markersMapa.length; i++) {
        mapa.removeLayer(markersMapa[i]);
    }
    markersMapa = [];


    var paises = await ObtenerPaises();
    if (paises == null) {
        Alertar("Mapa", "Error", "No se pudieron obtener países");
        return;
    }


    var top = await ObtenerUsuariosPorPaisTop10();

    if (top == null) {
        Alertar("Mapa", "Error", "No se pudieron obtener usuarios por país");
        return;
    }

    if (top.length > 10) {
        top = top.slice(0, 10);
    }


    var dicP = {};
    for (var j = 0; j < paises.length; j++) {
        dicP[paises[j].id] = paises[j];
    }


    for (var k = 0; k < top.length; k++) {
        // { idPais: X, cantidad: Y } (puede variar)
        var item = top[k];

        var idPais = item.id;
        var cant = item.cantidadDeUsuarios;

        var p = dicP[idPais];

        if (p == undefined) {
            continue;
        }

        var lat = p.latitud;
        var lon = p.longitud;

        if (lat == undefined || lon == undefined) {
            continue;
        }

        var marker = L.marker([lat, lon]).addTo(mapa);

        marker.bindTooltip(p.nombre + ": " + cant + " usuarios", { permanent: false });

        markersMapa.push(marker)



    }


    if (markersMapa.length > 0) {
        var grupo = new L.featureGroup(markersMapa);
        mapa.fitBounds(grupo.getBounds().pad(0.3));
    }
}


// FUNCIONES DE API PARA MAPA


async function ObtenerPaises() {

    var response = await fetch(URL_BASE + "/paises", {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" }
    });

    if (response.status != 200) {
        return null;
    }

    var data;
    try { data = await response.json(); } catch (e) { data = {}; }


    if (data.paises != undefined) return data.paises;
    return data;
}




async function ObtenerUsuariosPorPaisTop10() {

    var response = await fetch(URL_BASE + "/usuariosPorPais", {
        method: "GET",
        cache: "no-store",
        headers: HeadersConAuth()
    });

    if (response.status != 200) {
        return null;
    }

    var data;
    try {
        data = await response.json();
    } catch (e) {
        data = {};
    }

    console.log("USUARIOS POR PAIS RAW:", data);

    var arr = null;

    if (data.paises != undefined) {
        arr = data.paises;
    } else if (data.top != undefined) {
        arr = data.top;
    } else {
        arr = data;
    }

    if (arr == null) {
        return [];
    }

    // Ordenar desc por cantidad
    arr.sort(function (a, b) {
        return b.cantidadDeUsuarios - a.cantidadDeUsuarios;
    });

    // Quedarnos con 10
    if (arr.length > 10) {
        arr = arr.slice(0, 10);
    }

    return arr;
}

// -----------------------------------------------------------------











// --------------------------------------------------------
// ------AUXILIOARES-------------------------------
// -----------------------------------



// funcion para podet limpiar el formulario despuies de agregar una peli
function LimpiarFormularioAgregar() {

    var slc = document.querySelector("#slcCategoria");
    var nom = document.querySelector("#txtNombrePelicula");
    var fec = document.querySelector("#txtFechaVista");
    var com = document.querySelector("#txtComentario");

    if (slc != null) {
        slc.value = "";
    }

    if (nom != null) {
        nom.value = "";
    }

    if (fec != null) {
        fec.value = "";
    }

    if (com != null) {
        com.value = "";
    }
}
// ------------------------------------------------

function PrenderLoader(texto) {
    loading.cssClass = 'my-custom-class';
    loading.message = texto;

    // esto es para que modificar el tiempo de registro
    // loanding.duration=2000

    document.body.appendChild(loading);
    loading.present();
}


function ApagarLoader() {
    loading.dismiss();
}


function Alertar(titulo, subtitulo, mensaje) {
    const alert = document.createElement('ion-alert');
    alert.cssClass = 'my-custom-class';
    alert.header = titulo;
    alert.subHeader = subtitulo;
    alert.message = mensaje;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    alert.present();

}



function MostrarToast(mensaje, duracion) {
    const toast = document.createElement('ion-toast');
    toast.message = mensaje;
    toast.duration = duracion;
    toast.position = "bottom";

    document.body.appendChild(toast);
    toast.present();
}




async function EvaluarSentimiento(comentario) {

    var response = await fetch(URL_BASE + "/genai", {
        method: "POST",
        headers: HeadersConAuth(),
        body: JSON.stringify({ prompt: comentario })
    });

    if (response.status == 200 || response.status == 201) {

        var data;
        try {
            data = await response.json();
        } catch (e) {
            data = {};
        }

        console.log("RESPUESTA IA:", data);

        // La API devuelve: { codigo: 200, sentiment: "Neutro" ... }
        if (data.sentiment != undefined) {
            // normalizo a minúsculas para comparar fácil
            return String(data.sentiment).toLowerCase();
        }

        return "desconocido";
    }

    return "error";
}

function FormatearFechaPelicula(fechaTexto) {

    if (fechaTexto == null || fechaTexto == "") {
        return "";
    }

    var partes = fechaTexto.split("-");

    if (partes.length != 3) {
        return fechaTexto;
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}








// --------------------------------------------------------
// --------------
// QUE SE VEA LINDA
// --------------
// --------------------------------------------------------


function IniciarSwiperHome() {

    if (swiperHome != null) {
        return;
    }

    var el = document.querySelector("#swiperHome");

    if (el == null) {
        return;
    }

    swiperHome = new Swiper("#swiperHome", {
        loop: true,
        centeredSlides: true,
        slidesPerView: 1.12,
        spaceBetween: 14,
        autoplay: {
            delay: 2600
        },
        pagination: {
            el: ".swiper-pagination"
        },
        breakpoints: {
            768: {
                slidesPerView: 1.35,
                spaceBetween: 18
            },
            1024: {
                slidesPerView: 1.7,
                spaceBetween: 20
            }
        }
    });
}