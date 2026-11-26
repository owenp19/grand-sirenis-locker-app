# DATA_TRANSMISSION — Transmisión y transferencia internacional de datos

**Contexto:** Grand Sirenis Locker App. Datos personales desde Colombia hacia servidor en EE. UU. (Hostinger). Análisis bajo Ley 1581 de 2012 y Decreto 1074 de 2015.

## 1. Clasificaciones jurídicas

| Tipo | Definición | Aplicación en la app |
|---|---|---|
| **Transmisión internacional** | Transferencia temporal de datos personales a un país extranjero, manteniendo la responsabilidad del responsable original. | Datos enviados al servidor Hostinger (EE. UU.) para procesamiento y almacenamiento. El desarrollador (encargado) sigue siendo responsable ante el hotel (responsable). |
| **Transferencia internacional** | Transferencia de datos a un país extranjero, que puede trasladar la responsabilidad o requerir garantías adicionales. | Si Hostinger actúa como subencargado, la transferencia requiere contrato y garantías según Art. 2.2.2.25.5.1 y 2.2.2.25.5.2 del Decreto 1074. |

## 2. Marco normativo aplicable

| Norma | Artículo clave | Requisito |
|---|---|---|
| **Ley 1581 de 2012** | Art. 3° | Principio de licitud, veracidad y calidad. |
| | Art. 6° | Responsable y encargado. |
| | Art. 7° | Autorización del titular (o excepción). |
| | Art. 8° | Datos sensibles. |
| **Decreto 1074 de 2015** | Art. 2.2.2.25.5.1 | Condiciones para transmisión internacional. |
| | Art. 2.2.2.25.5.2 | Condiciones para transferencia internacional. |
| **Reglamento** | Lineamientos SIC | Lista de países con nivel adecuado de protección. |

## 3. Evaluación de Hostinger como subencargado

| Criterio | Estado | Acción |
|---|---|---|
| **¿Hostinger procesa datos en nombre del hotel?** | Pendiente | Revisar contrato y DPA. |
| **¿Hubo autorización del titular?** | Pendiente | Definir base legal para la transferencia. |
| **¿Hay garantías adecuadas?** | Pendiente | Verificar cláusulas contractuales y DPA. |
| **¿País tiene nivel adecuado?** | Pendiente | Consultar lista vigente de la SIC (Colombia). |

## 4. Lista de países con nivel adecuado (SIC)

Según la Superintendencia de Industria y Comercio (SIC) de Colombia, los países que han sido declarados con **adecuado nivel de protección** de datos personales incluyen (lista actualizada a 2024):

- **Países de la Unión Europea** (con RGPD): Alemania, Austria, Bélgica, Bulgaria, Croacia, Chipre, Dinamarca, Eslovaquia, Eslovenia, España, Estonia, Finlandia, Francia, Grecia, Hungría, Irlanda, Italia, Letonia, Lituania, Luxemburgo, Malta, Países Bajos, Polonia, Portugal, Rumanía, Suecia, Bélgica.
- **Otros países con decisiones de adequación**: Argentina, Canadá (aplicable a organizaciones certificadas), Islas Faroe, Guernsey, Jersey, Islas ultramarinas británicas, Nueva Zelanda, Suiza, Uruguay.

**EE. UU. no appears in the list** de países con adecuación directa. Esto refuerza la necesidad de garantías contractuales (cláusulas contractuales tipo, certificaciones, etc.).

## 5. Condiciones contractuales necesarias

Para que la transferencia a Hostinger (EE. UU.) sea lícita bajo la Ley 1581 y el Decreto 1074:

1. **Cláusulas contractuales tipo (CCE)** firmadas entre el responsable (hotel) y el encargado (desarrollador/Hostinger), o adhesión al DPA de Hostinger si cubre al responsable.
2. **Certificaciones de seguridad** en el proveedor (ISO 27001, SOC 2) que ofrezcan garantías equivalentes.
3. **Medidas de seguridad técnicas y organizativas** descritas en el Anexo de Seguridad (ver HOSTINGER_US.md).
4. **Finalidad limitada** y **duración** de la transferencia especificada en el contrato.
5. **Derechos del titular** garantizados: acceso, rectificación, supresión, revocación de autorización.
6. **Notificación de brechas** en un plazo máximo de 48 horas (conforme al Decreto 1074).

## 6. Recomendaciones para la app

- **No incrustar credenciales** de base de datos en el código público ni en Git.
- **Usar `.env`** (no versionado) para credenciales de conexión MySQL en Hostinger.
- **Aplicar principio de mínimo privilegio** al usuario de MySQL creado en Hostinger (solo SELECT/INSERT/UPDATE/DELETE sobre `sirenis_locker_db`).
- **Registrar en `movements`** cada exportación de datos, incluyendo el tipo y el usuario autorizado.
- **Evitar transmisión de datos sensibles** (supervisor, motivo de salida) si no son estrictamente necesarios; normalizar a listas cerradas.

## 7. Pendientes

- Verificar lista vigente de la SIC al momento del despliegue.
- Firmar contrato de subencargado con Hostinger (o adherir DPA).
- Definir base legal de autorización para el hotel.
- Ejecutar prueba de flujo de datos: `api.php?resource=export&type=backup` con usuario admin y registrar el evento.