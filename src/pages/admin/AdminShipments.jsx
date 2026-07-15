import AdminSectionStub from '../../components/AdminSectionStub';

// TODO(G1): implementar la gestión de envíos y estados de pedido.
export default function AdminShipments() {
  return (
    <AdminSectionStub
      title="Envíos"
      subtitle="Seguimiento y estados de los pedidos."
      description="Gestión de envíos: ver los pedidos y avanzar su estado (creado → stock reservado → pago → enviado → entregado), con datos de tracking."
      todos={[
        'Listar pedidos con su estado actual',
        'Cambiar / avanzar el estado de un pedido',
        'Datos de envío y número de seguimiento',
        'Filtros por estado y por fecha'
      ]}
      columns={['Pedido', 'Cliente', 'Fecha', 'Total', 'Estado', 'Acción']}
      backend="Pedidos — Grupo 5. La lectura ya existe en ordersApi (list/get, en src/api/client.js); falta el endpoint para actualizar estado/envío (BFF → G5)."
    />
  );
}
