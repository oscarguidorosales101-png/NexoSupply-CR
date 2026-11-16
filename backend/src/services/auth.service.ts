import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../errors/app-error';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { registrarAuditoria } from './auditoria.service';
import { TipoAccionAuditoria } from '@prisma/client';

export interface RegisterDTO {
  email: string;
  password: string;
  nombreCompleto: string;
  telefono?: string;
  empresa?: {
    rfcCedula: string;
    razonSocial: string;
    nombreComercial: string;
    emailContacto: string;
    telefono?: string;
    direccion?: string;
    monedaBase?: 'CRC' | 'USD';
  };
}

export async function registerUser(dto: RegisterDTO) {
  const existingUser = await prisma.usuario.findUnique({
    where: { email: dto.email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new ConflictError('Ya existe un usuario registrado con este correo electrónico');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(dto.password, salt);

  return await prisma.$transaction(async (tx) => {
    // 1. Crear usuario
    const nuevoUsuario = await tx.usuario.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        password_hash: passwordHash,
        nombre_completo: dto.nombreCompleto.trim(),
        telefono: dto.telefono,
        activo: true,
      },
    });

    let empresaCreada = null;
    let rolAdmin = null;

    // 2. Si incluyó datos de empresa, crear organización y membresía
    if (dto.empresa) {
      const existingEmpresa = await tx.empresa.findUnique({
        where: { rfc_cedula: dto.empresa.rfcCedula.trim() },
      });

      if (existingEmpresa) {
        throw new ConflictError('Ya existe una empresa registrada con esta cédula jurídica o identificación fiscal');
      }

      empresaCreada = await tx.empresa.create({
        data: {
          rfc_cedula: dto.empresa.rfcCedula.trim(),
          razon_social: dto.empresa.razonSocial.trim(),
          nombre_comercial: dto.empresa.nombreComercial.trim(),
          email_contacto: dto.empresa.emailContacto.trim(),
          telefono: dto.empresa.telefono,
          direccion: dto.empresa.direccion,
          moneda_base: dto.empresa.monedaBase || 'CRC',
          activa: true,
        },
      });

      // Crear Almacén Principal por defecto para la nueva empresa
      await tx.almacen.create({
        data: {
          empresa_id: empresaCreada.id,
          codigo: 'ALM-CENTRAL',
          nombre: 'Almacén Central',
          es_principal: true,
          activo: true,
        },
      });

      // Crear Configuración por defecto
      await tx.configuracionEmpresa.create({
        data: {
          empresa_id: empresaCreada.id,
          monto_max_autoaprobacion: 500000.00,
          tolerancia_sobrentrega_porc: 0.00,
        },
      });

      // Obtener o crear rol ADMIN_EMPRESARIAL
      rolAdmin = await tx.rol.findFirst({
        where: { codigo: 'ADMIN_EMPRESARIAL', es_sistema: true },
      });

      if (!rolAdmin) {
        rolAdmin = await tx.rol.create({
          data: {
            codigo: 'ADMIN_EMPRESARIAL',
            nombre: 'Administrador Empresarial',
            es_sistema: true,
          },
        });
      }

      // Crear membresía activa
      await tx.membresiaEmpresa.create({
        data: {
          usuario_id: nuevoUsuario.id,
          empresa_id: empresaCreada.id,
          rol_id: rolAdmin.id,
          activa: true,
        },
      });
    }

    await registrarAuditoria({
      usuarioId: nuevoUsuario.id,
      empresaId: empresaCreada?.id,
      accion: TipoAccionAuditoria.CREATE,
      entidad: 'USUARIO',
      entidadId: nuevoUsuario.id,
      datosNuevos: { email: nuevoUsuario.email, nombre: nuevoUsuario.nombre_completo },
    });

    return {
      usuario: {
        id: nuevoUsuario.id,
        email: nuevoUsuario.email,
        nombreCompleto: nuevoUsuario.nombre_completo,
      },
      empresa: empresaCreada
        ? {
            id: empresaCreada.id,
            razonSocial: empresaCreada.razon_social,
            rfcCedula: empresaCreada.rfc_cedula,
          }
        : null,
    };
  });
}

export async function loginUser(email: string, passwordPlain: string, requestedEmpresaId?: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      membresias: {
        where: { activa: true, empresa: { activa: true } },
        include: {
          empresa: true,
          rol: {
            include: {
              roles_permisos: {
                include: { permiso: true },
              },
            },
          },
        },
      },
    },
  });

  if (!usuario || !usuario.activo) {
    throw new UnauthorizedError('Credenciales inválidas o cuenta inactiva');
  }

  const passwordValida = await bcrypt.compare(passwordPlain, usuario.password_hash);
  if (!passwordValida) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  // Determinar empresa activa
  let membresiaActiva = null;
  if (requestedEmpresaId) {
    membresiaActiva = usuario.membresias.find((m) => m.empresa_id === requestedEmpresaId);
    if (!membresiaActiva) {
      throw new UnauthorizedError('No posee membresía activa en la empresa solicitada');
    }
  } else if (usuario.membresias.length > 0) {
    membresiaActiva = usuario.membresias[0];
  }

  const payload = {
    userId: usuario.id,
    email: usuario.email,
    esSuperadmin: usuario.es_superadmin,
    empresaActivaId: membresiaActiva?.empresa_id,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await registrarAuditoria({
    usuarioId: usuario.id,
    empresaId: membresiaActiva?.empresa_id,
    accion: TipoAccionAuditoria.LOGIN,
    entidad: 'AUTENTICACION',
    entidadId: usuario.id,
  });

  return {
    accessToken,
    refreshToken,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombreCompleto: usuario.nombre_completo,
      esSuperadmin: usuario.es_superadmin,
    },
    empresaActiva: membresiaActiva
      ? {
          id: membresiaActiva.empresa.id,
          rfcCedula: membresiaActiva.empresa.rfc_cedula,
          razonSocial: membresiaActiva.empresa.razon_social,
          nombreComercial: membresiaActiva.empresa.nombre_comercial,
          monedaBase: membresiaActiva.empresa.moneda_base,
          temaVisual: membresiaActiva.empresa.tema_visual,
          rol: {
            codigo: membresiaActiva.rol.codigo,
            nombre: membresiaActiva.rol.nombre,
            permisos: membresiaActiva.rol.roles_permisos.map((rp) => rp.permiso.codigo),
          },
        }
      : null,
    empresasDisponibles: usuario.membresias.map((m) => ({
      id: m.empresa.id,
      razonSocial: m.empresa.razon_social,
      nombreComercial: m.empresa.nombre_comercial,
      rol: m.rol.nombre,
    })),
  };
}

export async function switchTenantService(userId: string, targetEmpresaId: string) {
  const membresia = await prisma.membresiaEmpresa.findUnique({
    where: {
      uk_usuario_empresa: {
        usuario_id: userId,
        empresa_id: targetEmpresaId,
      },
    },
    include: {
      usuario: true,
      empresa: true,
      rol: {
        include: {
          roles_permisos: {
            include: { permiso: true },
          },
        },
      },
    },
  });

  if (!membresia || !membresia.activa || !membresia.empresa.activa) {
    throw new UnauthorizedError('No posee membresía activa en la empresa destino o la empresa se encuentra suspendida');
  }

  const payload = {
    userId: membresia.usuario.id,
    email: membresia.usuario.email,
    esSuperadmin: membresia.usuario.es_superadmin,
    empresaActivaId: membresia.empresa.id,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await registrarAuditoria({
    usuarioId: userId,
    empresaId: targetEmpresaId,
    accion: TipoAccionAuditoria.SWITCH_TENANT,
    entidad: 'MEMBRESIA_EMPRESA',
    entidadId: membresia.id,
    datosNuevos: { targetEmpresa: membresia.empresa.razon_social },
  });

  return {
    accessToken,
    refreshToken,
    empresaActiva: {
      id: membresia.empresa.id,
      rfcCedula: membresia.empresa.rfc_cedula,
      razonSocial: membresia.empresa.razon_social,
      nombreComercial: membresia.empresa.nombre_comercial,
      monedaBase: membresia.empresa.moneda_base,
      temaVisual: membresia.empresa.tema_visual,
      rol: {
        codigo: membresia.rol.codigo,
        nombre: membresia.rol.nombre,
        permisos: membresia.rol.roles_permisos.map((rp) => rp.permiso.codigo),
      },
    },
  };
}

export async function getAuthenticatedUserProfile(userId: string, currentEmpresaId?: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: {
      membresias: {
        where: { activa: true, empresa: { activa: true } },
        include: {
          empresa: true,
          rol: {
            include: {
              roles_permisos: {
                include: { permiso: true },
              },
            },
          },
        },
      },
    },
  });

  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  const activa = currentEmpresaId
    ? usuario.membresias.find((m) => m.empresa_id === currentEmpresaId)
    : usuario.membresias[0];

  return {
    usuario: {
      id: usuario.id,
      email: usuario.email,
      nombreCompleto: usuario.nombre_completo,
      telefono: usuario.telefono,
      avatarUrl: usuario.avatar_url,
      esSuperadmin: usuario.es_superadmin,
    },
    empresaActiva: activa
      ? {
          id: activa.empresa.id,
          rfcCedula: activa.empresa.rfc_cedula,
          razonSocial: activa.empresa.razon_social,
          nombreComercial: activa.empresa.nombre_comercial,
          monedaBase: activa.empresa.moneda_base,
          temaVisual: activa.empresa.tema_visual,
          rol: {
            codigo: activa.rol.codigo,
            nombre: activa.rol.nombre,
            permisos: activa.rol.roles_permisos.map((rp) => rp.permiso.codigo),
          },
        }
      : null,
    empresasDisponibles: usuario.membresias.map((m) => ({
      id: m.empresa.id,
      razonSocial: m.empresa.razon_social,
      nombreComercial: m.empresa.nombre_comercial,
      rol: m.rol.nombre,
    })),
  };
}

export async function changePasswordService(userId: string, currentPass: string, newPass: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: userId } });
  if (!usuario) throw new NotFoundError('Usuario no encontrado');

  const esValida = await bcrypt.compare(currentPass, usuario.password_hash);
  if (!esValida) {
    throw new BadRequestError('La contraseña actual ingresada es incorrecta');
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPass, salt);

  await prisma.usuario.update({
    where: { id: userId },
    data: { password_hash: newHash },
  });

  await registrarAuditoria({
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'USUARIO_PASSWORD',
    entidadId: userId,
  });

  return { message: 'Contraseña actualizada correctamente' };
}
