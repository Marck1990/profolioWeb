// usuario que queda guardado cuando alguien inicia sesion
let usuarioConectado = null


// clase principal del sistema donde guardamos todas las listas
class Sistema {

    // listas principales del sistema
    listaTutores = []
    listaPaseadores = []
    listaContratos = []


    // devuelve que tipo de usuario es segun donde se encuentre
    devolverTipoUsuario(unUsuario) {

        for (let unC of this.listaTutores) {
            if (unC.usuario.toLowerCase() === unUsuario.toLowerCase()) return "tutor"
        }

        for (let unP of this.listaPaseadores) {
            if (unP.usuario.toLowerCase() === unUsuario.toLowerCase()) return "paseador"
        }

        return "desconocido"
    }


    // devuelve la pass de tutor
    devolverPassTutor(unUsuario) {

        for (let unC of this.listaTutores) {
            if (unC.usuario.toLowerCase() === unUsuario.toLowerCase()) {
                return unC.pass
            }
        }

    }


    // devuelve la pass de paseador
    devolverPassPaseador(unUsuario) {

        for (let unP of this.listaPaseadores) {
            if (unP.usuario.toLowerCase() === unUsuario.toLowerCase()) return unP.pass
        }

    }


    // devuelve id de tutor
    devolverTutordorID(unUsuario) {

        for (let unT of this.listaTutores) {
            if (unT.usuario == unUsuario) return unT.id
        }

        return null
    }


    // devuelve id de paseador
    devolverPaseadorID(unUsuario) {

        for (let unPase of this.listaPaseadores) {
            if (unPase.usuario == unUsuario) return unPase.idPaseador
        }

        return null
    }


    // devuelve objeto paseador completo segun id
    devolverObjetoPaseador(idPaseador) {

        for (let unPase of this.listaPaseadores) {
            if (unPase.idPaseador == idPaseador) return unPase
        }

        return null
    }


    // devuelve objeto tutor completo segun id
    devolverObjetoTutor(idTutor) {

        for (let unTutor of this.listaTutores) {
            if (unTutor.id == idTutor) return unTutor
        }

        return null
    }


    // segun el tamaño del perro devuelve cuantos cupos ocupa
    devolverCuposPorTamanio(tamanio) {

        if (tamanio == "grande") return 4
        if (tamanio == "mediano") return 2
        if (tamanio == "chico") return 1

    }


    // devuelve objeto tutor completo
    devolverObjetoCliente(id) {

        for (let unTutor of this.listaTutores) {
            if (unTutor.id == id) return unTutor
        }

        return null
    }


    // verifica si un paseador tiene contratos
    tieneContratosActivos(idPaseador) {

        for (let contrato of this.listaContratos) {
            if (contrato.idPaseador == idPaseador) return true
        }

        return false
    }


    // verifica si un usuario ya existe en el sistema
    existeUsuario(unUsuario) {

        for (let unT of this.listaTutores) {
            if (unT.usuario.toLowerCase() === unUsuario.toLowerCase()) return true
        }

        for (let unP of this.listaPaseadores) {
            if (unP.usuario.toLowerCase() === unUsuario.toLowerCase()) return true
        }

        return false
    }

}


// instancia principal del sistema
let miSistema = new Sistema()


// contador automatico ids tutores
let contadordeTutores = 1


// clase tutor
class Tutor {

    constructor(usuario, pass, nombreDePerro, tamano) {

        this.id = contadordeTutores++
        this.usuario = usuario
        this.pass = pass
        this.nombreDePerro = nombreDePerro
        this.tamano = tamano

    }

}


// contador automatico ids paseadores
let contadorPaseadores = 1


// clase paseador
class Paseador {

    constructor(nombre, usuario, pass, cupomaximo, cupodisponible) {

        this.idPaseador = contadorPaseadores++
        this.nombre = nombre
        this.usuario = usuario
        this.pass = pass
        this.cupomaximo = cupomaximo
        this.cupodisponible = cupodisponible

        // variables auxiliares para saber cuantos perros tiene
        this.cantidadPerros = 0
        this.cantidadPerrosGrandes = 0
        this.cantidadPerrosPequeños = 0
        this.cantidadPerrosMedianos = 0

    }

}


// contador automatico ids contratos
let contadorContratos = 1


// clase contrato
class Contrato {

    constructor(idTutor, idPaseador) {

        this.idContrato = contadorContratos++
        this.idTutor = idTutor
        this.idPaseador = idPaseador
        this.estado = "pendiente"

    }

}


// arranca todo el sistema
inicio()



// funcion principal donde se cargan eventos iniciales
function inicio() {

    ocultarTodasLasSecciones()

    document.querySelector("#pantallaLogin").style.display = "block"


    // eventos login y logout
    document.querySelector("#btnIniciarSesion").addEventListener("click", hacerLogin)
    document.querySelector("#btnCerrarSesionCliente").addEventListener("click", cerrarSesion)
    document.querySelector("#btncerrarSesionPaseador").addEventListener("click", cerrarSesion)


    // eventos registro
    document.querySelector("#btnConfirmarRegistro").addEventListener("click", registrarTutor)
    document.querySelector("#btnConfirmarRegistroPaseador").addEventListener("click", registrarPaseador)


    // ir a pantalla registro tutor
    document.querySelector("#btnRegistro").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaRegistro").style.display = "block"

    })


    // ir a pantalla registro paseador
    document.querySelector("#btnRegistroPaseador").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaRegistroPaseador").style.display = "block"

    })


    // volver desde registro tutor
    document.querySelector("#btnVolverRegistro").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaLogin").style.display = "block"
        limpiarCamposRegistroTutor()

    })


    // volver desde registro paseador
    document.querySelector("#btnVolverRegistroPaseador").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaLogin").style.display = "block"
        limpiarCamposRegistroPaseador()

    })


    // ir a contratar paseador
    document.querySelector("#btnIrAContratar").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaContratarPaseador").style.display = "block"
        cargarPaseadores()

    })


    // confirmar contratacion
    document.querySelector("#btnContratar").addEventListener("click", contratarPaseador)


    // volver desde contratar paseador
    document.querySelector("#btnVolveMenuTutor").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaMenuCliente").style.display = "block"

    })


    // ir a cancelar contrato
    document.querySelector("#btnCancelarContrato").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#cancelarContrato").style.display = "block"
        mostrarContratosParaCancelar()

    })


    // confirmar baja
    document.querySelector("#btnDardeBaja").addEventListener("click", darDeBajaContrato)


    // volver desde cancelar contrato
    document.querySelector("#btnVolverPantallaMenuCliente1").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaMenuCliente").style.display = "block"

    })


    // ver tabla desde tutor
    document.querySelector("#btnMostrarTabla").addEventListener("click", function () {

        tablaParaTutor()
        ocultarTodasLasSecciones()
        document.querySelector("#pantallaTablaTutor").style.display = "block"

    })


    // volver desde tabla tutor
    document.querySelector("#btnVolverPantallaMenuClienteDespuesDeTabla").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaMenuCliente").style.display = "block"

    })


    // ver tabla desde paseador
    document.querySelector("#btnMostrarTablaParaPaseador").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        tablaParaPaseador()
        document.querySelector("#pantallaTablaPaseador").style.display = "block"

    })


    // volver desde tabla paseador
    document.querySelector("#btnVolverMenuPaseador").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaMenuPaseador").style.display = "block"
        document.querySelector("#pantallaVerContratosPendientes").style.display = "block"

    })


    // ver contratos pendientes del paseador
    document.querySelector("#btnVercontratos").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        
        mostrarContratosActivosParaPaseador()
        document.querySelector("#pantallaAprobarContrato").style.display = "block"

    })


    // aprobar contrato
    document.querySelector("#btnAprobarContrato").addEventListener("click", aprobarContrato)


    // volver desde aprobar contrato
    document.querySelector("#btnVolverMenuPaseador1").addEventListener("click", function () {

        ocultarTodasLasSecciones()
        document.querySelector("#pantallaMenuPaseador").style.display = "block"
        document.querySelector("#pantallaVerContratosPendientes").style.display = "block"

    })

}


// limpia campos del registro tutor
function limpiarCamposRegistroTutor() {

    document.querySelector("#txtNuevoUsuario").value = ""
    document.querySelector("#txtNuevoPass").value = ""
    document.querySelector("#txtNombrePerro").value = ""
    document.querySelector("#slcTamano").value = "chico"

}


// limpia campos del registro paseador
function limpiarCamposRegistroPaseador() {

    document.querySelector("#txtNombrePaseador").value = ""
    document.querySelector("#txtUsuarioPaseador").value = ""
    document.querySelector("#txtPassPaseador").value = ""
    document.querySelector("#txtCupoPaseador").value = ""

}


// valida contraseña
function validarPass(pass) {

    // elimina simbolos raros
    let passSinSimbolos = pass.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '')

    let contieneMayuscula = false
    let contieneMinuscula = false
    let contieneNumero = false


    // revisa caracter por caracter
    for (let unC of passSinSimbolos) {

        if (isNaN(unC)) {

            if (unC === unC.toUpperCase()) contieneMayuscula = true
            if (unC === unC.toLowerCase()) contieneMinuscula = true

        }

        if (!isNaN(unC)) contieneNumero = true

    }


    // devuelve true si cumple todas condiciones
    return contieneMayuscula && contieneMinuscula && contieneNumero && pass.length > 5

}



// registrar tutor nuevo
function registrarTutor() {

    let usuario = document.querySelector("#txtNuevoUsuario").value.trim()
    let pass = document.querySelector("#txtNuevoPass").value.trim()
    let nombrePerro = document.querySelector("#txtNombrePerro").value.trim()
    let tamano = document.querySelector("#slcTamano").value


    // valida vacios
    if (!usuario || !pass || !nombrePerro || !tamano) {

        alert("Por favor, completá todos los campos.")
        return

    }


    // valida usuario repetido
    if (miSistema.existeUsuario(usuario)) {

        alert("Ese usuario ya existe.")
        return

    }


    // valida contraseña
    if (!validarPass(pass)) {

        alert("La contraseña debe tener al menos una mayúscula, una minúscula, un número y más de 5 caracteres.")
        return

    }


    // crea nuevo tutor
    let nuevo = new Tutor(usuario, pass, nombrePerro, tamano)

    miSistema.listaTutores.push(nuevo)

    alert("Registro exitoso. Ya podés iniciar sesión.")

    limpiarCamposRegistroTutor()
    ocultarTodasLasSecciones()
    document.querySelector("#pantallaLogin").style.display = "block"

}



// registrar paseador nuevo
function registrarPaseador() {

    let nombre = document.querySelector("#txtNombrePaseador").value.trim()
    let usuario = document.querySelector("#txtUsuarioPaseador").value.trim()
    let pass = document.querySelector("#txtPassPaseador").value.trim()
    let cupo = Number(document.querySelector("#txtCupoPaseador").value)


    // valida campos vacios
    if (!nombre || !usuario || !pass || !cupo) {

        alert("Por favor, completá todos los campos.")
        return

    }


    // valida cupo
    if (cupo <= 0) {

        alert("El cupo debe ser mayor a cero.")
        return

    }


    // valida usuario repetido
    if (miSistema.existeUsuario(usuario)) {

        alert("Ese usuario ya existe.")
        return

    }


    // valida contraseña
    if (!validarPass(pass)) {

        alert("La contraseña debe tener al menos una mayúscula, una minúscula, un número y más de 5 caracteres.")
        return

    }


    // crea paseador nuevo
    let nuevo = new Paseador(nombre, usuario, pass, cupo, cupo)

    miSistema.listaPaseadores.push(nuevo)

    alert("Paseador registrado con éxito. Ya podés iniciar sesión.")

    limpiarCamposRegistroPaseador()
    ocultarTodasLasSecciones()
    document.querySelector("#pantallaLogin").style.display = "block"

}


// carga paseadores disponibles en el select para contratar
function cargarPaseadores() {

    let miSelect = ""
    let precisa = miSistema.devolverCuposPorTamanio(usuarioConectado.tamano)

    for (let paseador of miSistema.listaPaseadores) {
        if (paseador.cupodisponible > 0 && paseador.cupodisponible >= precisa) {
            miSelect += `<option value="${paseador.idPaseador}">${paseador.nombre} - ${paseador.usuario} - ${paseador.cupodisponible} cupos disponibles</option>`
        }
    }

    if (miSelect == "") {
        miSelect = `<option value="">No hay paseadores disponibles</option>`
    }

    document.querySelector("#slcContratarPaseador").innerHTML = miSelect
}


// genera nuevo contrato de tutor con paseador
function contratarPaseador() {

    let paseadorId = document.querySelector("#slcContratarPaseador").value

    if (paseadorId == "") {
        alert("No hay paseadores disponibles para contratar.")
        return
    }


    // verifica que el tutor no tenga ya un contrato
    for (let unC of miSistema.listaContratos) {
        if (unC.idTutor == usuarioConectado.id && unC.estado == "pendiente") {
            alert("Ya tenés un contrato pendiente.")
            return
        }

        if (unC.idTutor == usuarioConectado.id && unC.estado == "aprobado") {
            alert("Ya tenés un contrato aprobado.")
            return
        }
    }


    let tutorId = usuarioConectado.id

    miSistema.listaContratos.push(new Contrato(tutorId, Number(paseadorId)))

    alert("Paseador contratado correctamente.")

    ocultarTodasLasSecciones()
    document.querySelector("#pantallaMenuCliente").style.display = "block"
}


// muestra datos del contrato a cancelar usando usuario del paseador
function mostrarContratosParaCancelar() {

    let parrafo = "No hay contratos para cancelar."
    let idTutor = usuarioConectado.id

    for (let contrato of miSistema.listaContratos) {
        if (contrato.idTutor === idTutor && (contrato.estado === "pendiente" || contrato.estado === "aprobado")) {

            let paseador = miSistema.devolverObjetoPaseador(contrato.idPaseador)

            parrafo = `Numero contrato: ${contrato.idContrato}
Paseador: ${paseador.usuario}
Estado: ${contrato.estado}`

            break
        }
    }

    document.querySelector("#infoContrato").innerHTML = parrafo
}


// cancela contrato del tutor actual
function darDeBajaContrato() {

    for (let unC of miSistema.listaContratos) {
        if (unC.idTutor == usuarioConectado.id && (unC.estado == "pendiente" || unC.estado == "aprobado")) {

            if (unC.estado == "aprobado") {

                let tutor = miSistema.devolverObjetoCliente(unC.idTutor)
                let paseador = miSistema.devolverObjetoPaseador(unC.idPaseador)
                let cantidad = miSistema.devolverCuposPorTamanio(tutor.tamano)

                paseador.cupodisponible += cantidad
                paseador.cantidadPerros--

                if (cantidad == 4) paseador.cantidadPerrosGrandes--
                if (cantidad == 2) paseador.cantidadPerrosMedianos--
                if (cantidad == 1) paseador.cantidadPerrosPequeños--

            }

            unC.estado = "cancelado"

            alert("Contrato dado de baja con éxito.")

            ocultarTodasLasSecciones()
            document.querySelector("#pantallaMenuCliente").style.display = "block"

            return
        }
    }

    alert("No tenés contratos para cancelar.")
}


// carga contratos pendientes para que el paseador los vea usando usuario del tutor
function mostrarContratosActivosParaPaseador() {

    if (!usuarioConectado) return

    let paseadorID = usuarioConectado.idPaseador
    let miSelect = ""

    for (let contrato of miSistema.listaContratos) {
        if (contrato.idPaseador == paseadorID && contrato.estado == "pendiente") {

            let tutor = miSistema.devolverObjetoTutor(contrato.idTutor)

            miSelect += `<option value="${contrato.idContrato}">Contrato con tutor ${tutor.usuario} - Estado: ${contrato.estado}</option>`
        }
    }

    if (miSelect == "") {
        miSelect = `<option value="">No hay contratos pendientes</option>`
    }

    document.querySelector("#slcContratosActivos").innerHTML = miSelect
}


// aprueba contrato si hay compatibilidad y cupo
function aprobarContrato() {

    let idSeleccionado = Number(document.querySelector("#slcContratosActivos").value)

    if (!idSeleccionado) {
        alert("No hay contratos pendientes para aprobar.")
        return
    }

    let paseador
    let cantidad
    let tutor

    for (let contrato of miSistema.listaContratos) {
        if (contrato.idContrato === idSeleccionado) {

            tutor = miSistema.devolverObjetoCliente(contrato.idTutor)
            cantidad = miSistema.devolverCuposPorTamanio(tutor.tamano)
            paseador = miSistema.devolverObjetoPaseador(contrato.idPaseador)

            if (
                contrato.estado === "pendiente" &&
                cantidad <= paseador.cupodisponible &&
                (
                    (cantidad == 4 && paseador.cantidadPerrosPequeños == 0) ||
                    (cantidad == 1 && paseador.cantidadPerrosGrandes == 0) ||
                    (cantidad == 2)
                )
            ) {

                contrato.estado = "aprobado"
                paseador.cantidadPerros++

                if (cantidad == 4) paseador.cantidadPerrosGrandes++
                if (cantidad == 1) paseador.cantidadPerrosPequeños++
                if (cantidad == 2) paseador.cantidadPerrosMedianos++

                paseador.cupodisponible = paseador.cupodisponible - cantidad

                alert("Contrato aprobado correctamente.")
                mostrarContratosActivosParaPaseador()
                return

            } else {

                let mensaje = ""

                if ((cantidad == 4 && paseador.cantidadPerrosPequeños > 0) || (cantidad == 1 && paseador.cantidadPerrosGrandes > 0)) {
                    mensaje += "No es compatible por el porte del perro. "
                }

                if (cantidad > paseador.cupodisponible) {
                    mensaje += "No tiene cupo suficiente."
                }

                if (mensaje == "") {
                    mensaje = "No se pudo aprobar el contrato."
                }

                alert(mensaje)

                contrato.estado = "rechazado"
                mostrarContratosActivosParaPaseador()

                return
            }
        }
    }
}


// valida compatibilidad general de porte
// function validarCompatibilidadPorte() {

//     for (let unContrato of miSistema.listaContratos) {
//         if (unContrato.estado == "pendiente") {

//             let tutor = miSistema.devolverObjetoCliente(unContrato.idTutor)
//             let tipoPerro = tutor.tamano
//             let paseador = miSistema.devolverObjetoPaseador(unContrato.idPaseador)

//             if (tipoPerro == "grande" && paseador.cantidadPerrosPequeños > 0) unContrato.estado = "cancelado"
//             if (tipoPerro == "chico" && paseador.cantidadPerrosGrandes > 0) unContrato.estado = "cancelado"

//         }
//     }

//     mostrarContratosActivosParaPaseador()
// }


// oculta todas las pantallas
function ocultarTodasLasSecciones() {

    document.querySelector("#pantallaLogin").style.display = "none"
    document.querySelector("#pantallaMenuCliente").style.display = "none"
    document.querySelector("#pantallaMenuPaseador").style.display = "none"
    document.querySelector("#pantallaRegistro").style.display = "none"
    document.querySelector("#pantallaRegistroPaseador").style.display = "none"
    document.querySelector("#pantallaContratarPaseador").style.display = "none"
    document.querySelector("#pantallaAprobarContrato").style.display = "none"
    document.querySelector("#pantallaVerContratosPendientes").style.display = "none"
    document.querySelector("#cancelarContrato").style.display = "none"
    document.querySelector("#pantallaTablaTutor").style.display = "none"
    document.querySelector("#pantallaTablaPaseador").style.display = "none"

}


// login
function hacerLogin() {

    let usuario = document.querySelector("#txtUsuario").value.toLowerCase().trim()
    let pass = document.querySelector("#txtPass").value.trim()

    let tipo = miSistema.devolverTipoUsuario(usuario)

    if (tipo == "tutor") {

        let mismaPass = miSistema.devolverPassTutor(usuario) == pass

        if (mismaPass) {

            for (let tutor of miSistema.listaTutores) {
                if (tutor.usuario.toLowerCase() === usuario) {
                    usuarioConectado = tutor
                }
            }

            ocultarTodasLasSecciones()
            document.querySelector("#pantallaMenuCliente").style.display = "block"

        } else {

            alert("Error de datos.")

        }

    } else if (tipo == "paseador") {

        let mismaPass = miSistema.devolverPassPaseador(usuario) == pass

        if (mismaPass) {

            for (let paseador of miSistema.listaPaseadores) {
                if (paseador.usuario.toLowerCase() === usuario) {
                    usuarioConectado = paseador
                    break
                }
            }

            if (usuarioConectado) {

                ocultarTodasLasSecciones()
                document.querySelector("#pantallaMenuPaseador").style.display = "block"
                document.querySelector("#pantallaVerContratosPendientes").style.display = "block"
                mostrarContratosActivosParaPaseador()

            } else {

                alert("Paseador no encontrado.")

            }

        } else {

            alert("Error de datos.")

        }

    } else {

        alert("Usuario desconocido.")

    }

}


// cerrar sesion
function cerrarSesion() {

    usuarioConectado = null
    ocultarTodasLasSecciones()
    document.querySelector("#pantallaLogin").style.display = "block"
    document.querySelector("#txtUsuario").value = ""
    document.querySelector("#txtPass").value = ""

}


// tabla de paseadores para tutor
function tablaParaTutor() {

    let tablaT = ""

    if (miSistema.listaPaseadores.length == 0) {

        tablaT = `<tr>
            <td colspan="3">No hay paseadores registrados.</td>
        </tr>`

    } else {

        for (let unP of miSistema.listaPaseadores) {
            tablaT += `<tr>
                <td>${unP.nombre}</td>
                <td>${unP.usuario}</td>
                <td>${unP.cupodisponible} cupos disponibles</td>
            </tr>`
        }

    }

    document.querySelector("#tablaPaseadoresContratados").innerHTML = tablaT
}


// tabla de tutores asignados al paseador
function tablaParaPaseador() {

    let tablaP = ""
    let tieneDatos = false

    for (let unC of miSistema.listaContratos) {
        if (unC.idPaseador == usuarioConectado.idPaseador && unC.estado == "aprobado") {

            let tutor = miSistema.devolverObjetoCliente(unC.idTutor)

            tablaP += `<tr>
                <td>${tutor.usuario}</td>
                <td>${tutor.nombreDePerro}</td>
                <td>${tutor.tamano}</td>
            </tr>`

            tieneDatos = true
        }
    }

    if (!tieneDatos) {
        tablaP = `<tr>
            <td colspan="3">No tenés perros asignados.</td>
        </tr>`
    }

    document.querySelector("#tablaTutoresContratados").innerHTML = tablaP
}