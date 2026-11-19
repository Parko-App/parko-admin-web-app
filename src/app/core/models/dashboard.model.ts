/**
 * Contrato SUPUESTO del dashboard (pendiente de confirmar con backend).
 * Endpoints: GET /api/v1/admin/dashboard/summary y GET /api/v1/admin/dashboard/recent-access
 */
export interface DashboardSummary {
  occupancy: { current: number; capacity: number };
  revenueToday: { amount: number; changePercent: number };
  activeSessions: { total: number; visitors: number; registered: number };
  visitorsToday: { count: number; collected: number; pendingPayments: number };
  dayStats: {
    entries: number;
    exits: number;
    uniqueVisitors: number;
    paymentsProcessed: number;
    paymentsPending: number;
    openIncidents: number;
  };
  alerts: DashboardAlert[];
  /** Vehículos estacionados al cierre de cada hora (0 a 23) del día de hoy. */
  occupancyByHour: { hour: number; vehicles: number }[];
}

export interface DashboardAlert {
  level: 'info' | 'warning' | 'danger';
  message: string;
}

export type AccessUserType = 'REGISTERED' | 'VISITOR' | 'TEACHER' | 'STAFF';
export type AccessMovement = 'ENTRY' | 'EXIT';

export interface RecentAccess {
  id: string;
  plate: string | null;
  userName: string;
  userType: AccessUserType;
  /** Fecha y hora ISO 8601 del movimiento. */
  timestamp: string;
  movement: AccessMovement;
}
