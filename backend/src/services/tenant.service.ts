import crypto from 'crypto';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { TipoAccionAuditoria, EstadoInvitacion } from '@prisma/client';

export async function getCompanyProfile(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      configuracion: true,
      almacenes: { where: { activo: true } },
    },
  });

  if (!empresa) {
    throw new NotFoundError('Empresa no encontrada');
  }

  return empresa;
}

export async function updateCompanyProfile(empresaId: string, userId: string, data: any) {
  const empresaActual = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresaActual) throw new NotFoundError('Empresa no encontrada');

  const actualizada = await prisma.empresa.update({
    where: { id: empresaId },
    data: {
      razon_social: data.razonSocial,
      nombre_comercial: data.nombreComercial,
      email_contacto: data.emailContacto,
      telefono: data.telefono,
      direccion: data.direccion,
      tema_visual: data.temaVisual,
      logo_url: data.logoUrl,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'EMPRESA',
    entidadId: empresaId,
    datosAnteriores: empresaActual,
    datosNuevos: actualizada,
  });

  return actualizada;
}

export async function updateCompanyConfig(empresaId: string, userId: string, data: any) {
  const configActual = await prisma.configuracionEmpresa.findUnique({ where: { empresa_id: empresaId } });

  const actualizada = await prisma.configuracionEmpresa.upsert({
    where: { empresa_id: empresaId },
    update: {
      monto_max_autoaprobacion: data.montoMaxAutoaprobacion,
      tolerancia_sobrentrega_porc: data.toleranciaSobrentregaPorc,
      dias_credito_default: data.diasCreditoDefault,
      notificar_alertas_stock: data.notificarAlertasStock,
      notificar_retrasos: data.notificarRetrasos,
    },
    create: {
      empresa_id: empresaId,
      monto_max_autoaprobacion: data.montoMaxAutoaprobacion ?? 500000.00,
      tolerancia_sobrentrega_porc: data.toleranciaSobrentregaPorc ?? 0.00,
      dias_credito_default: data.diasCreditoDefault ?? 30,
      notificar_alertas_stock: data.notificarAlertasStock ?? true,
      notificar_retrasos: data.notificarRetrasos ?? true,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'CONFIGURACION_EMPRESA',
    entidadId: actualizada.id,
    datosAnteriores: configActual,
    datosNuevos: actualizada,
  });

  return actualizada;
}

export async function listCompanyMembers(empresaId: string) {
  return await prisma.membresiaEmpresa.findMany({
    where: { empresa_id: empresaId },
    include: {
      usuario: {
        select: {
          id: true,
          email: true,
          nombre_completo: true,
          telefono: true,
          avatar_url: true,
          activo: true,
        },
      },
      rol: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function inviteMemberToCompany(empresaId: string, userId: string, email: string, rolId: string) {
  const cleanEmail = email.toLowerCase().trim();

  // Verificar si ya es miembro
  const existingMember = await prisma.membresiaEmpresa.findFirst({
    where: { empresa_id: empresaId, usuario: { email: cleanEmail } },
  });

  if (existingMember) {
    throw new ConflictError('El usuario con este correo ya forma parte de la organización');
  }

  // Generar token criptográfico
  const token = crypto.randomBytes(32).toString('hex');
  const expiraEn = new Date();
  expiraEn.setDate(expiraEn.getDate() + 7); // 7 días de validez

  const invitacion = await prisma.invitacionEmpresa.create({
    data: {
      empresa_id: empresaId,
      email: cleanEmail,
      rol_id: rolId,
      token,
      estado: EstadoInvitacion.PENDIENTE,
      expira_en: expiraEn,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'INVITACION_EMPRESA',
    entidadId: invitacion.id,
    datosNuevos: { email: cleanEmail, rolId },
  });

  return {
    id: invitacion.id,
    email: invitacion.email,
    estado: invitacion.estado,
    expiraEn: invitacion.expira_en,
    token: invitacion.token,
  };
}

export async function listRolesAndPermissions(empresaId: string) {
  const roles = await prisma.rol.findMany({
    where: {
      OR: [{ empresa_id: null, es_sistema: true }, { empresa_id: empresaId }],
    },
    include: {
      roles_permisos: {
        include: { permiso: true },
      },
    },
  });

  const permisos = await prisma.permiso.findMany({
    orderBy: [{ modulo: 'asc' }, { codigo: 'asc' }],
  });

  return { roles, permisos };
}
