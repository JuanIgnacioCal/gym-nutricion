# Checklist para lanzar y vender (Overall Center)

Objetivo: dejar la app lista para un **piloto pago con el primer gym**, sin sobre-construir.
Quién hace cada cosa: **[Claude]** = código que hago yo · **[Vos]** = cuenta / plata / decisión.

## Bloqueantes (antes de cobrarle a un gym)

- [ ] **Seguridad de los datos** [Claude] — los endpoints deben confiar en la sesión, no en el `usuario_id` que manda el navegador; cada usuario solo edita lo suyo; el middleware debe validar la firma del token. *(En progreso.)*
- [ ] **Recupero de contraseña** [Claude] — que el dueño resetee la clave de un socio desde el panel. (La versión por email queda para después.)
- [ ] **Backup automático de la base** [Claude propone + Vos conectás el destino] — hoy la data vive en un solo archivo; hay que respaldarla sola.
- [ ] **Railway a plan pago + dominio propio** [Vos] — salir del trial (se pausa solo) y usar una URL con la marca (ej. `nutricion.overallcenter.com`).

## Importante, en paralelo (no bloquea la venta)

- [ ] Marca de Overall puesta (logo, colores) + pulido PWA (íconos, "agregar a inicio"). [Claude/Vos]
- [ ] Instancia **demo** para mostrarle a Flor antes de que pague. [Vos/Claude]
- [ ] Proceso repetible para dar de alta un gym nuevo (hoy es a mano con `gym.config.json`). [Claude]

## Comercial (sin esto no hay venta)

- [ ] Precio cerrado (setup + abono) y **cómo te paga el gym cada mes** (Mercado Pago / transferencia). [Vos]
- [ ] Quién da soporte cuando algo falla o un socio pregunta. [Vos]

## Escala (MÁS ADELANTE, no ahora)

- [ ] Migrar a Supabase recién cuando tengas varios gyms. Hoy "1 deploy + 1 base por gym" alcanza para arrancar.
