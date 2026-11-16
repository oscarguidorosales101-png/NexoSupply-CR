import { Router } from 'express';
import authRoutes from './auth.routes';
import tenantRoutes from './tenant.routes';
import proveedorRoutes from './proveedor.routes';
import productoRoutes from './producto.routes';
import compraRoutes from './compra.routes';
import inventarioRoutes from './inventario.routes';
import evaluacionRoutes from './evaluacion.routes';
import riesgoRoutes from './riesgo.routes';
import simulacionRoutes from './simulacion.routes';
import reporteRoutes from './reporte.routes';
import chatbotRoutes from './chatbot.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/empresas', tenantRoutes);
apiRouter.use('/proveedores', proveedorRoutes);
apiRouter.use('/productos', productoRoutes);
apiRouter.use('/compras', compraRoutes);
apiRouter.use('/inventario', inventarioRoutes);
apiRouter.use('/evaluaciones', evaluacionRoutes);
apiRouter.use('/riesgos', riesgoRoutes);
apiRouter.use('/simulaciones', simulacionRoutes);
apiRouter.use('/reportes', reporteRoutes);
apiRouter.use('/chatbot', chatbotRoutes);

export default apiRouter;
