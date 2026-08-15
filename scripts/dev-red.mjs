import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { createRequire } from 'node:module'

// Arranca el sitio y dice en qué dirección abrirlo desde otro aparato de la red.
//
// Existe por dos motivos, y los dos hacen perder media hora:
//
// 1. Next.js anuncia una IP equivocada. En una máquina con WSL, Docker o
//    Hyper-V toma la de la placa virtual (172.x, 192.168.56.x…), que no se ve
//    desde el wifi.
//
// 2. El puerto no se sabe de antemano. Si otro proyecto ya tiene el 3000, Next
//    se corre al 3001 sin avisar mucho — y entrar al 3000 te muestra el OTRO
//    proyecto, normalmente con un 404 que parece un error de este.
//
// Por eso el puerto no se adivina: se lee del propio Next cuando arranca, y
// recién ahí se imprime la dirección buena.

const VIRTUALES = /vEthernet|WSL|Hyper-?V|Docker|VirtualBox|VMware|Loopback|Bluetooth/i

function direccionesDeRed() {
  return Object.entries(networkInterfaces())
    .filter(([nombre]) => !VIRTUALES.test(nombre))
    .flatMap(([nombre, placas]) =>
      (placas ?? [])
        .filter(
          (p) =>
            p.family === 'IPv4' &&
            !p.internal &&
            // 169.254.x.x es lo que Windows se inventa cuando la placa está
            // desconectada. Aparece en todas las que no se usan.
            !p.address.startsWith('169.254.'),
        )
        .map((p) => ({ nombre, ip: p.address })),
    )
}

function avisar(puerto) {
  const redes = direccionesDeRed()

  console.log('')
  if (redes.length === 0) {
    console.log('   No encontré ninguna red. ¿Está conectado el wifi?')
  } else {
    console.log('   Desde una tablet o un celular en la misma red:')
    console.log('')
    for (const { nombre, ip } of redes) {
      console.log(`      http://${ip}:${puerto}/pos      (${nombre})`)
    }
    if (puerto !== '3000') {
      console.log('')
      console.log(`   Ojo: este proyecto quedó en el puerto ${puerto}, no en el 3000.`)
      console.log('   El 3000 lo tiene otro proyecto y te va a mostrar un 404 suyo.')
    }
  }
  console.log('')
}

const require = createRequire(import.meta.url)
const next = require.resolve('next/dist/bin/next')

const hijo = spawn(process.execPath, [next, 'dev', ...process.argv.slice(2)], {
  stdio: ['inherit', 'pipe', 'inherit'],
})

let yaAvisado = false
hijo.stdout.setEncoding('utf8')
hijo.stdout.on('data', (texto) => {
  process.stdout.write(texto)
  if (yaAvisado) return
  // La línea "- Local: http://localhost:3002" trae el puerto de verdad.
  const encontrado = texto.match(/http:\/\/localhost:(\d+)/)
  if (encontrado) {
    yaAvisado = true
    avisar(encontrado[1])
  }
})

hijo.on('exit', (codigo) => process.exit(codigo ?? 0))
