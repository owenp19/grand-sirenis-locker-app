# PROVIDER_DUE_DILIGence — Due diligence del proveedor (Hostinger)

**Objeto:** Verificación preliminar de Hostinger como proveedor de alojamiento y posible subencargado de datos personales, bajo la normatividad colombiana (Ley 1581 de 2012, Decreto 1074 de 2015).

## 1. Información básica del proveedor

| Campo | Estado | Fuente |
|---|---|---|
| **Nombre comercial** | Pendiente | hPanel, contrato, web oficial |
| **Razón social / RUC** | Pendiente | Documentos legales Hostinger |
| **País de registro** | Pendiente | Reino Unido, Chipre, EE. UU. |
| **Sitio web** | https://www.hostinger.com | |
| **Correo institucional** | support@hostinger.com | |
| **Teléfono de soporte** | Pendiente | Verificar en hPanel |

## 2. Tipo de servicio y plan contratado

| Campo | Estado | Acción |
|---|---|---|
| **Modalidad** | Pendiente | Web Hosting / Cloud Hosting / VPS |
| **Plan específico** | Pendiente | Captura de ficha en hPanel |
| **Recursos asignados** | Pendiente | CPU, RAM, disco, ancho de banda |
| **Número de dominio(s)** | Pendiente | Cuántos dominios incluye el plan |
| **Acceso SSH** | Pendiente | Habilitado o no según plan |
| **Panel** | hPanel (por defecto) | |

## 3. Centro de datos

| Campo | Estado | Acción |
|---|---|---|
| **Ubicación física** | Pendiente | Ciudad y país |
| **Proveedor del centro** | Pendiente | Equinix, Digital Realty, propio de Hostinger |
| **Certificaciones** | Pendiente | ISO 27001, SOC 2, etc. — capturar del sitio o contactar soporte |
| **Conectividad** | Pendiente | Red interna, uplinks, redundancia |

## 4. DPA y contratos

| Item | Estado | Comentario |
|---|---|---|
| **¿Disponible DPA público?** | Pendiente | https://www.hostinger.com/legal/dpa |
| **¿Cubre al responsable (hotel)?** | Pendiente | Revisar cláusula de "partes" y "finalidad" |
| **¿Lista de subprocesadores?** | Pendiente | Revisar en DPA o solicitar al soporte |
| **¿Transferencias internacionales están reguladas?** | Pendiente | Revisar cláusula de "Países" y "garantías" |

## 5. Subprocesadores (confirmar con Hostinger)

| Rol | Nombre | Observaciones |
|---|---|---|
| **Almacenamiento en la nube** | Pendiente | CDN, backup automático |
| **Red / DNS** | Pendiente | Configuración de routing |
| **Soporte remoto** | Pendiente | Acceso bajo protocolo de confidencialidad |
| **Análisis / monitoreo** | Pendiente | Herramientas de observabilidad |

## 6. Políticas de seguridad del proveedor

| Política | ¿Disponible? | Estado |
|---|---|---|
| **Política de seguridad de la información** | Pendiente | ISO 27001, etc. |
| **Política de retención y eliminación** | Pendiente | Plazos y métodos |
| **Política de incidentes y brechas** | Pendiente | Plazo de notificación, procedimiento |
| **Política de respaldo y recuperación** | Pendiente | Frecuencia, cifrado, tiempo de restauración |
| **Política de control de acceso** | Pendiente | Roles, MFA, logs de acceso |

## 7. Cumplimiento normativo

| Estándar | Aplicable a Hostinger | Comentario |
|---|---|---|
| **ISO 27001** | Pendiente | Certificado o autodeclaración |
| **SOC 2 Tipo II** | Pendiente | Informe SOC 2 disponible |
| **RGPD (UE)** | Parcial | Hostinger tiene presencia en Europa; revisar compatibilidad con Ley 1581 |
| **Ley 1581 (Colombia)** | Pendiente | Revisar DPA y cláusulas contractuales |
| **Decreto 1074 de 2015** | Pendiente | Artículos 2.2.2.25.5.1 y 2.2.2.25.5.2 |

## 8. Hallazgos y riesgos identificados (iniciales)

| ID | Hallazgo | Riesgo | Mitigación sugerida |
|---|---|---|---|
| DD-01 | Ubicación exacta del centro de datos no verificada | Riesgo de soberanía de datos | Solicitar documentación al proveedor |
| DD-02 | DPA descargado pero sin revisar cobertura al responsable | Posible incumplimiento legal | Revisar cláusulas con asesoría jurídica |
| DD-03 | Plan no definido (Web/Cloud/VPS) | Recursos insuficientes o excesivos | Definir plan según demanda real |
| DD-04 | Sin confirmación de privilegios mínimos en MySQL | Base de datos expuesta a permisos amplios | Crear usuario con SELECT/INSERT/UPDATE/DELETE solo |
| DD-05 | Sin verificar lista de países adecuados de la SIC | Transferencia a EE. UU. sin garantías | Adoptar CCE o cláusulas tipo |

## 9. Checklist de due diligence (para cerrar la fase)

- [ ] Capturar datos del plan en hPanel y adjuntar en el expediente
- [ ] Descargar y revisar DPA en https://www.hostinger.com/legal/dpa
- [ ] Confirmar ubicación del centro de datos (ciudad/país)
- [ ] Verificar certificaciones de seguridad (ISO 27001, SOC 2)
- [ ] Crear usuario MySQL con privilegios mínimos y documentar
- [ ] Definir lista de IPs autorizadas del hotel o contratar VPN
- [ ] Aplicar `.htaccess` con `Require all denied` a carpetas sensibles
- [ ] Solicitar certificado SSL y configurar HTTPS obligatorio
- [ ] Programar backup diario y test de restauración cada 30 días
- [ ] Firmar contrato de subencargado (o adhesión al DPA)
- [ ] Definir base legal de autorización para transferencia a EE. UU.
- [ ] Registrar en la matriz de responsabilidades hotel-desarrollador-Hostinger

## 10. Pendientes definitivos (requieren intervención humana)

- Verificar panel hPanel y capturar datos reales del plan
- Revisar DPA con asesoría jurídica especializada en protección de datos colombiana
- Firmar contrato hotel-desarrollador-desplegador
- Definir y ejecutar las restricciones de acceso (IP/VPN/firewall)
- Probar y validar todas las configuraciones antes de exponer la app a usuarios del hotel