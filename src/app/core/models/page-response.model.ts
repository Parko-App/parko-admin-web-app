/** Respuesta paginada del servidor (formato orientativo del contrato con Spring Boot). */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
