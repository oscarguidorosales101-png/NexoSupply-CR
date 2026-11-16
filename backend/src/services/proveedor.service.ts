import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../errors/app-error';
import { registrarAuditoria } from './auditoria.service';
import { TipoAccionAuditoria } from '@prisma/client';

export async function listProveedores(empresaId: string, options?: { activo?: boolean; search?: string }) {
  const where: any = { empresa_id: empresaId };

  if (typeof options?.activo === 'boolean') {
    where.activo = options.activo;
  }

  if (options?.search) {
    const q = options.search.trim();
    where.OR = [
      { nombre_legal: { contains: q } },
      { nombre_fantasia: { contains: q } },
      { identificador_fiscal: { contains: q } },
    ];
  }

  return await prisma.proveedor.findMany({
    where,
    include: {
      contactos: true,
      _count: {
        select: { ordenes_compra: true, incidencias: true },
      },
    },
    orderBy: { nombre_legal: 'asc' },
  });
}

export async function getProveedorById(empresaId: string, proveedorId: string) {
  const proveedor = await prisma.proveedor.findFirst({
    where: { id: proveedorId, empresa_id: empresaId },
    include: {
      contactos: true,
      productos_proveedores: {
        include: { producto: true },
      },
      evaluaciones: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      incidencias: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!proveedor) {
    throw new NotFoundError('El proveedor no existe en el catálogo de esta empresa');
  }

  return proveedor;
}

export async function createProveedor(empresaId: string, userId: string, data: any) {
  const existing = await prisma.proveedor.findUnique({
    where: {
      uk_proveedor_empresa_fiscal: {
        empresa_id: empresaId,
        identificador_fiscal: data.identificadorFiscal.trim(),
      },
    },
  });

  if (existing) {
    throw new ConflictError('Ya existe un proveedor registrado con esta identificación fiscal en su empresa');
  }

  const proveedor = await prisma.proveedor.create({
    data: {
      empresa_id: empresaId,
      identificador_fiscal: data.identificadorFiscal.trim(),
      nombre_legal: data.nombreLegal.trim(),
      nombre_fantasia: data.nombreFantasia?.trim(),
      clasificacion: data.clasificacion,
      terminos_pago_dias: data.terminosPagoDias,
      moneda_preferida: data.monedaPreferida,
      lead_time_promedio_dias: data.leadTimePromedioDias,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      activo: data.activo ?? true,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.CREATE,
    entidad: 'PROVEEDOR',
    entidadId: proveedor.id,
    datosNuevos: { nombre: proveedor.nombre_legal, fiscal: proveedor.identificador_fiscal },
  });

  return proveedor;
}

export async function updateProveedor(empresaId: string, proveedorId: string, userId: string, data: any) {
  const actual = await getProveedorById(empresaId, proveedorId);

  const actualizado = await prisma.proveedor.update({
    where: { id: actual.id },
    data: {
      nombre_legal: data.nombreLegal?.trim(),
      nombre_fantasia: data.nombreFantasia?.trim(),
      clasificacion: data.clasificacion,
      terminos_pago_dias: data.terminosPagoDias,
      moneda_preferida: data.monedaPreferida,
      lead_time_promedio_dias: data.leadTimePromedioDias,
      email: data.email !== undefined ? data.email || null : undefined,
      telefono: data.telefono,
      direccion: data.direccion,
      activo: data.activo,
    },
  });

  await registrarAuditoria({
    empresaId,
    usuarioId: userId,
    accion: TipoAccionAuditoria.UPDATE,
    entidad: 'PROVEEDOR',
    entidadId: proveedorId,
    datosAnteriores: actual,
    datosNuevos: actualizado,
  });

  return actualizado;
}

export async function addContactoProveedor(empresaId: string, proveedorId: string, data: any) {
  await getProveedorById(empresaId, proveedorId);

  return await prisma.contactoProveedor.create({
    data: {
      empresa_id: empresaId,
      proveedor_id: proveedorId,
      nombre: data.nombre.trim(),
      cargo: data.cargo,
      email: data.email || null,
      telefono: data.telefono || null,
      es_principal: data.esPrincipal ?? false,
    },
  });
}
