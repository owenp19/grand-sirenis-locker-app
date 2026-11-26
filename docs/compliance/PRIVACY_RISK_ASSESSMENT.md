# PRIVACY_RISK_ASSESSMENT — Evaluación preliminar de riesgos

**Estado:** valoración técnica preliminar de privacidad bajo Ley 1581 de 2012 y Decreto 1074 de 2015. **No es un dictamen jurídico ni una declaración de cumplimiento.**

Criterio: **CRÍTICO** = exposición masiva o pérdida de control inmediata; **ALTO** = afectación significativa de datos personales o base legal; **MEDIO** = debilidad explotable con impacto limitado; **BAJO** = riesgo residual controlado.

| ID | Riesgo | Impacto | Probabilidad | Clasificación | Controles actuales | Acción recomendada |
|---|---|---|---|---|---|---|
| P-01 | Exposición pública involuntaria en Hostinger si `DocumentRoot`, firewall o VPN no restringen el acceso | Fuga de credenciales y datos de colaboradores | A confirmar | **CRÍTICO** | `docs/deploy.md` recomienda intranet y `public/` como raíz | Verificar exposición real, IP allowlist/VPN, cerrar registro público |
| P-02 | Exportación CSV de inventario e historial disponible para cualquier usuario autenticado | Salida masiva de nombres, departamentos y motivos | Media | **ALTO** | Solo `require_login`; `backup` sí exige administrador | Elevar permisos a administrador y registrar cada exportación |
| P-03 | Transferencia de datos personales desde Colombia a servidor en EE.UU. sin garantías contractuales verificadas | Riesgo legal por transferencia internacional | Alta si no hay contrato | **ALTO** | Ubicación informada por el usuario | Evaluar garantías, cláusulas y jurisdicción con asesoría jurídica |
| P-04 | Ausencia verificada de contratos responsable-encargado y encargado-subencargado (Hostinger) | Responsabilidades e incidentes sin marco contractual | Alta | **ALTO** | No se encontraron contratos en el repositorio | Suscribir/verificar acuerdos y Anexo de tratamiento de datos |
| P-05 | No hay aviso de privacidad, base legal documentada ni flujo ARCO en la app | Titulares sin información ni mecanismo de derechos | Alta | **ALTO** | No hay pantallas ni campos para ello | Definir con el responsable aviso, bases legales y procedimientos |
| P-06 | Campos de texto libre (`reason`, `movements.detail`) pueden capturar datos sensibles no necesarios | Tratamiento excesivo y posible violación de principios | Media | **ALTO** | Límites de longitud, sin validación de contenido | Normalizar motivos a lista cerrada y prohibir datos sensibles |
| P-07 | Conservación indefinida de `movements` y `previous_owner` sin política de retención | Almacenamiento excesivo | Alta | **ALTO** | No hay endpoint de borrado ni regla de antigüedad | Definir retención, seudonimización y baja cuando corresponda |
| P-08 | Módulo de salida de personal con fallos funcionales que pueden generar historial incompleto o incorrecto | Pérdida de integridad y trazabilidad | Alta si se usa | **ALTO** | Transacción y `SELECT FOR UPDATE` previstos, pero consultas incorrectas | Corregir antes de usar en producción (ver SECURITY_GAPS) |
| P-09 | Descarga de respaldo JSON con todos los lockers y hasta 50 000 movimientos sin registro de auditoría | Copia masiva sin trazabilidad de autoría | Media | **MEDIO** | Restricción a administrador y metadatos de truncamiento | Registrar exportación en bitácora inmutable y cifrar descargas |
| P-10 | Entidad contratante y rol de responsable no identificados en el repositorio | Aplicación de obligaciones a la persona equivocada | Alta | **MEDIO** | Contexto del usuario: hotel operador, desarrollador, Hostinger | Confirmar formalmente responsable, encargado y subencargado |
| P-11 | Datos de terceros (`supervisor`, `delivered_by`) sin finalidad documentada | Tratamiento sin base legítima clara | Media | **MEDIO** | Campos presentes en esquema y exportaciones | Justificar y minimizar o retirar |
| P-12 | Limitador de ingreso en archivo local con modo fail-open y sin límite en API | Intentos repetidos / abuso de endpoints | Media | **MEDIO** | 8 intentos por usuario/IP en 15 min; CSP; CSRF | Ajustar permisos de `private/runtime`, endurecer y ampliar a API |
| P-13 | Cookie `Secure` dependiente de detección de HTTPS; posible cabecera detrás de proxy | Envío de sesión sin cifrado si la detección falla | Baja-Media | **MEDIO** | HSTS y atributos HttpOnly/SameSite | Confirmar terminación TLS y configurar proxy confiable |
| P-14 | Logs de error del servidor pueden incluir detalles técnicos de PDO | Exposición interna de estructura o datos en logs | Baja | **BAJO** | `display_errors=0`, mensajes genéricos al usuario | Redactar logs y limitar retención/acceso |
| P-15 | PWA y borradores offline | Fuga local de datos personales | Baja | **BAJO** | SW excluye API; IndexedDB sin nombres; persistencia bajo control del usuario | Mantener validación de que las notas no incluyan datos personales |

## Conclusión preliminar

Existen riesgos **críticos y altos** que impiden considerar el despliegue actual como listo para manejar datos personales reales sin medidas previas. La clasificación debe ser revisada por el responsable del tratamiento y por asesoría jurídica colombiana antes de cualquier afirmación de cumplimiento.
