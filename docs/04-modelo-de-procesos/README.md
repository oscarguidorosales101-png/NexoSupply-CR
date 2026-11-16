# 04. Modelo de Procesos de Negocio — NexoSupply CR

Este documento define los 16 procesos empresariales clave mediante especificaciones operativas y diagramas Mermaid.

---

## Proceso 1: Registro e Incorporación de una Empresa
- **Actor Responsable**: Administrador de la Plataforma / Usuario Solicitante.
- **Entrada**: Razón Social, Cédula Jurídica, Nombre Comercial, Email del Administrador Principal, Contraseña.
- **Validaciones**: Unicidad de Cédula Jurídica en el sistema, formato de correo válido, contraseña con política de complejidad.
- **Resultado**: Creación de la empresa, creación del usuario principal, creación de la membresía con rol `ADMINISTRADOR_EMPRESARIAL`, creación del almacén principal por defecto y parámetros iniciales.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant Web as Portal NexoSupply
    participant API as Backend Express
    participant DB as MySQL (Prisma)

    Admin->>Web: Completa formulario de registro de empresa
    Web->>API: POST /api/v1/auth/register-empresa
    API->>DB: Validar existencia de cédula jurídica y email
    alt Ya existe cédula o email
        DB-->>API: Registro duplicado
        API-->>Web: Error 409 Conflicto
    else Datos válidos
        API->>DB: Iniciar Transacción ($transaction)
        API->>DB: INSERT empresa, usuario, membresia (ADMIN)
        API->>DB: INSERT almacen 'Almacén Central', configuraciones
        DB-->>API: Confirmación de Commit
        API-->>Web: 201 Creado + JWT de sesión
        Web-->>Admin: Redirección al Dashboard Empresarial
    end
```

---

## Proceso 2: Selección y Conmutación Segura de Empresa (Switch Tenant)
- **Actor Responsable**: Usuario autenticado con membresías múltiples.
- **Entrada**: `empresaId` destino seleccionado en la barra de navegación.
- **Validaciones**: Verificación de membresía activa en la base de datos MySQL, validación de estado de la empresa destino.
- **Resultado**: Emisión de nuevo token de sesión con claims de la empresa destino, actualización de contexto y recarga de vistas.

```mermaid
flowchart TD
    A([Usuario en Frontend]) --> B[Selecciona Empresa B en Selector]
    B --> C[POST /api/v1/auth/switch-tenant { empresaId }]
    C --> D{¿Sesión activa?}
    D -- No --> E[401 No Autorizado -> Login]
    D -- Sí --> F{¿Membresía activa en Empresa B?}
    F -- No --> G[403 Acceso Denegado]
    F -- Sí --> H{¿Empresa B está activa?}
    H -- No --> I[403 Empresa Suspendida/Inactiva]
    H -- Sí --> J[Consultar Roles y Permisos en Empresa B]
    J --> K[Generar nuevo JWT de Contexto + Cookie]
    K --> L[200 OK + Retornar Perfil y Permisos]
    L --> M[Frontend: Invalida Caché y Carga Dashboard de Empresa B]
```

---

## Proceso 3: Ciclo Completo de Abastecimiento (Solicitud -> Aprobación -> Orden -> Recepción -> Kardex)

```mermaid
sequenceDiagram
    autonumber
    actor Comprador as Usuario Compras
    actor Gerente as Gerencia / Aprobador
    actor Bodega as Logística / Bodega
    participant API as API NexoSupply
    participant DB as MySQL (Prisma)

    Comprador->>API: POST /api/v1/solicitudes (ítems, cantidades)
    API->>DB: INSERT solicitud_compra (Estado: PENDIENTE)
    
    alt Monto > Umbral de Autoaprobación
        Gerente->>API: POST /api/v1/solicitudes/:id/aprobar
        API->>DB: UPDATE solicitud (Estado: APROBADA)
    else Monto <= Umbral
        API->>DB: Autoaprobar solicitud según política
    end

    Comprador->>API: POST /api/v1/ordenes-compra/generar-desde-solicitud
    API->>DB: INSERT orden_compra (Estado: EMITIDA), UPDATE solicitud (PROCESADA)

    Bodega->>API: POST /api/v1/recepciones (ordenId, items_recibidos, fecha)
    API->>DB: Iniciar $transaction
    API->>DB: Validar cantidad autorizada vs ya recibida
    API->>DB: INSERT recepcion_compra + detalles_recepcion
    API->>DB: UPDATE inventario_stock (Incrementar existencia)
    API->>DB: INSERT movimientos_inventario (Kardex: ENTRADA_COMPRA)
    alt Quedan cantidades pendientes
        API->>DB: UPDATE orden_compra (PARCIALMENTE_RECIBIDA)
    else Recepción total completada
        API->>DB: UPDATE orden_compra (COMPLETADA)
    end
    API->>DB: Calcular cumplimiento de puntualidad y calidad
    API->>DB: INSERT/UPDATE evaluacion_proveedor
    DB-->>API: Transacción Exitosa (Commit)
    API-->>Bodega: 200 Recepción confirmada y Kardex actualizado
```

---

## Proceso 4: Evaluación Objetiva de Proveedores
- **Actor Responsable**: Sistema automatizado / Gestor de Compras.
- **Entrada**: Datos acumulados de órdenes recibidas en el período (fechas prometidas vs reales, cantidades solicitadas vs recibidas, incidencias registradas).
- **Fórmulas de Negocio**:
  - $ICP = \frac{\text{Órdenes a Tiempo}}{\text{Total Órdenes}} \times 100$
  - $ICC = \frac{\text{Unidades Conformes Recibidas}}{\text{Total Unidades Solicitadas}} \times 100$
  - $IINC = 100 - (\text{Ponderación de Incidencias Totales})$
  - $Score = (ICP \times 0.40) + (ICC \times 0.35) + (IINC \times 0.25)$

---

## Proceso 5: Simulación de Continuidad Operativa (What-If Analysis)
- **Actor**: Gerente de Logística / Administrador.
- **Entrada**: ID del Proveedor Crítico, Días de retraso proyectados (ej. 15 días).
- **Mecanismo**: El motor consulta las órdenes vigentes con dicho proveedor y el inventario actual de los productos que suministra. Modela el agotamiento proyectado de stock según el consumo diario promedio y detecta la fecha exacta de "Quiebre de Stock". Identifica proveedores alternativos dados de alta y calcula el sobrecosto de reposición emergente.
- **Regla Estricta**: **Cero escrituras en tablas operativas**. Las simulaciones se guardan exclusivamente en la tabla `simulaciones_continuidad` como registros analíticos.
