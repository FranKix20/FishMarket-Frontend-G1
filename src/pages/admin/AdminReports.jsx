import AdminSectionStub from '../../components/AdminSectionStub';

// TODO(G1): implementar la reportería / métricas.
export default function AdminReports() {
  return (
    <AdminSectionStub
      title="Reportería"
      subtitle="Métricas y reportes del marketplace."
      description="Panel de indicadores: ventas, pedidos, usuarios y productos más vendidos, con posibilidad de exportar."
      metrics={['Ventas del mes', 'Pedidos', 'Usuarios activos', 'Ticket promedio']}
      todos={[
        'Tarjetas de métricas resumidas (ventas, pedidos, usuarios)',
        'Gráficos de tendencia (por día/semana/mes)',
        'Ranking de productos más vendidos',
        'Exportar a CSV / PDF'
      ]}
      backend="Agregación de Pedidos (G5), Catálogo (G3) e Identidad (G2). Requiere endpoints de reportes/agregados en el BFF."
    />
  );
}
