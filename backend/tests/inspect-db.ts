import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const empresas = await prisma.empresa.findMany({
    select: {
      id: true,
      razon_social: true,
      nombre_comercial: true,
      rfc_cedula: true,
    },
  });
  console.log('Empresas en MySQL:', JSON.stringify(empresas, null, 2));

  for (const emp of empresas) {
    const provCount = await prisma.proveedor.count({ where: { empresa_id: emp.id } });
    const prodCount = await prisma.producto.count({ where: { empresa_id: emp.id } });
    const ocCount = await prisma.ordenCompra.count({ where: { empresa_id: emp.id } });
    const solCount = await prisma.solicitudCompra.count({ where: { empresa_id: emp.id } });
    const evalCount = await prisma.evaluacionProveedor.count({ where: { empresa_id: emp.id } });
    const alertCount = await prisma.alertaRiesgo.count({ where: { empresa_id: emp.id } });
    console.log(`Empresa [${emp.rfc_cedula} - ${emp.nombre_comercial} (ID: ${emp.id})]:`);
    console.log(`  Proveedores: ${provCount}, Productos: ${prodCount}, OC: ${ocCount}, Solicitudes: ${solCount}, Evaluaciones: ${evalCount}, Alertas: ${alertCount}`);
  }
}

main().finally(() => prisma.$disconnect());
