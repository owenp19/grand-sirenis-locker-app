# COMPLIANCE_ROADMAP — Hoja de ruta de cumplimiento

**Estado:** propuesta preliminar. Requiere validación jurídica colombiana y autorización del responsable del tratamiento. **No modificar producción sin aprobación.**

| Fase | Prioridad | Acciones | Responsable sugerido | Evidencia de cierre |
|---|---|---|---|---|
| 0. Gobernanza jurídica | **CRÍTICO** | Confirmar entidad responsable del hotel, encargado (desarrollador) y subencargado (Hostinger); revisar transferencia a EE.UU.; definir bases legales, aviso de privacidad y procedimientos ARCO | Responsable + asesoría jurídica | Contratos/DPA, aviso publicado, matriz de bases legales |
| 1. Contención de exposición | **CRÍTICO** | Verificar plan y región en Hostinger; confirmar `DocumentRoot=public/`; forzar HTTPS/HSTS; restringir acceso por VPN/IP o firewall; cerrar registro; rotar credenciales; respaldar antes de tocar producción | Encargado + administrador del hotel | Evidencia de configuración, prueba de acceso externo negativo, backup verificado |
| 2. Corrección de brechas altas | **ALTO** | Corregir módulo de salida de personal (S-02 a S-06); exigir rol administrativo en exportaciones (S-01); registrar exportaciones; impedir texto sensible en motivos | Encargado | Pruebas E2E con datos ficticios y revisión de código |
| 3. Gobernanza de datos | **ALTO** | Clasificar campos; minimizar `supervisor`, `delivered_by`, `previous_owner`; normalizar motivos; definir retención de `movements` y borrado seguro de respaldos | Responsable + encargado | Política de retención, diccionario de datos, procedimiento de baja |
| 4. Controles de acceso | **MEDIO** | MFA para administradores, política de contraseñas, rate limit de API, confianza de proxy para cookie `Secure`, permisos de `private/runtime`, logs sin datos personales | Encargado | Configuración versionada y pruebas de acceso |
| 5. Operación y respuesta | **MEDIO** | Backups cifrados con prueba de restauración, control de accesos al servidor, plan de incidentes, capacitación al personal | Responsable + operaciones | Bitácoras de backup/restore, plan de incidentes aprobado |
| 6. Verificación final | **ALTO** | Auditoría técnica posterior a los cambios y revisión jurídica; solo entonces emitir pronunciamiento de cumplimiento | Responsable + auditor/asesor | Informe firmado; no antes de esta fase |

## Reglas de ejecución

- Usar memoria existente del proyecto y actualizar `docs/ai-memory/PROJECT.md` al cerrar cada fase.
- No leer toda la documentación en cada fase; consultar solo los archivos necesarios.
- No imprimir `.env`, contraseñas ni credenciales.
- No utilizar datos reales de colaboradores en pruebas.
- No instalar dependencias innecesarias ni reconstruir la arquitectura.
- No declarar cumplimiento legal sin validación jurídica.

## Criterios de aceptación para Fase 1

- [x] Inventario de datos personales documentado.
- [x] Flujo de datos y terceros documentado.
- [x] Riesgos clasificados en críticos, altos, medios y bajos.
- [x] Brechas técnicas documentadas sin modificar código.
- [x] Hoja de ruta priorizada.
- [ ] Verificación real de infraestructura en Hostinger.
- [ ] Validación jurídica de responsabilidades y transferencia internacional.
