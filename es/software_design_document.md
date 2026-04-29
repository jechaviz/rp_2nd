# Propuesta Funcional

## 1. Arquitectura de Integración
Odoo actúa como núcleo operativo, comunicándose con BAAN para el cierre financiero.

- **Odoo**: Contratos, activos y generación de facturas borrador.
- **Puente**: Orquestación de mensajes y estados bidireccionales.
- **BAAN**: Procesamiento financiero y confirmación final.

## 2. Lógica de Facturación

### A. Corte Programado
Odoo detecta contratos activos que alcanzan el umbral de días configurado y genera automáticamente el borrador de cobro.

### B. Devolución Parcial/Total
Al recibir equipo, el sistema calcula el diferencial desde el último corte facturado, evitando duplicidad de cargos.

## 3. Experiencia de Usuario (UX)
Optimización de la consulta de activos en `Products`:
- **Vista Expandible**: Detalle de contratos sin salir de la lista.
- **Navegación Circular**: Apertura de contrato y retorno con preservación de foco y scroll.

## 4. Matriz de Estados
| Estado | Significado |
| --- | --- |
| Pendiente | Ciclo de días no alcanzado |
| Borrador | Factura generada en Odoo |
| En Revisión | Información en tránsito/proceso en BAAN |
| Confirmada | Cierre financiero exitoso |
| Observada | Requiere intervención manual |

## 5. Controles y Mitigación
- Bloqueos lógicos para prevenir doble cobro.
- Trazabilidad técnica de cada intercambio Odoo-BAAN.
- Logs de errores operativos visibles para el equipo de soporte.
