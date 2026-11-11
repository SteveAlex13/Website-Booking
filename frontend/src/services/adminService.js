import api from './api';

export const adminService = {
  // Dashboard & Reports
  async getDashboard() {
    return await api.get('/admin/dashboard');
  },

  async getReports(params = {}) {
    return await api.get('/admin/reports', { params });
  },

  // Hotel Profile & Settings
  async getHotel() {
    return await api.get('/hotel');
  },

  async updateHotel(data) {
    return await api.put('/admin/hotel', data);
  },

  // Room Types (formerly Services)
  async getRoomTypes(params = {}) {
    return await api.get('/admin/room-types', { params });
  },

  async createRoomType(data) {
    return await api.post('/admin/room-types', data);
  },

  async updateRoomType(id, data) {
    return await api.put(`/admin/room-types/${id}`, data);
  },

  async deleteRoomType(id) {
    return await api.delete(`/admin/room-types/${id}`);
  },

  // Aliases for Services backward compat
  async getServices(params = {}) {
    return await api.get('/admin/room-types', { params });
  },
  async createService(data) {
    return await api.post('/admin/room-types', data);
  },
  async updateService(id, data) {
    return await api.put(`/admin/room-types/${id}`, data);
  },
  async deleteService(id) {
    return await api.delete(`/admin/room-types/${id}`);
  },

  // Physical Room Units Management (Front Desk)
  async getRooms(params = {}) {
    return await api.get('/admin/rooms', { params });
  },

  async createRoom(data) {
    return await api.post('/admin/rooms', data);
  },

  async updateRoomStatus(id, status) {
    return await api.patch(`/admin/rooms/${id}/status`, { status });
  },

  async deleteRoom(id) {
    return await api.delete(`/admin/rooms/${id}`);
  },

  // Hotel Bookings & Front Desk Check-in / Check-out
  async getBookings(params = {}) {
    return await api.get('/admin/bookings', { params });
  },

  async getBooking(id) {
    return await api.get(`/admin/bookings/${id}`);
  },

  async getAvailableRoomsForBooking(bookingId) {
    return await api.get(`/admin/bookings/${bookingId}/available-rooms`);
  },

  async checkInGuest(bookingId, roomId) {
    return await api.post(`/admin/bookings/${bookingId}/check-in`, { room_id: roomId });
  },

  async checkOutGuest(bookingId) {
    return await api.post(`/admin/bookings/${bookingId}/check-out`);
  },

  async cancelBooking(bookingId, { cancellation_key, reason }) {
    return await api.post(`/admin/bookings/${bookingId}/cancel`, { cancellation_key, reason });
  },

  async getCancellationKey() {
    return await api.get('/user/cancellation-key');
  },

  async generateCancellationKey() {
    return await api.post('/user/generate-cancellation-key');
  },

  // Extra Services (Add-ons: Breakfast, Airport Pickup, etc.)
  async getExtraServices() {
    return await api.get('/extra-services');
  },

  async createExtraService(data) {
    return await api.post('/admin/extra-services', data);
  },

  async updateExtraService(id, data) {
    return await api.put(`/admin/extra-services/${id}`, data);
  },

  async deleteExtraService(id) {
    return await api.delete(`/admin/extra-services/${id}`);
  },

  // Amenities
  async getAmenities() {
    return await api.get('/amenities');
  },

  async createAmenity(data) {
    return await api.post('/admin/amenities', data);
  },

  async deleteAmenity(id) {
    return await api.delete(`/admin/amenities/${id}`);
  },

  // Customers & Payments
  async getCustomers(params = {}) {
    return await api.get('/admin/customers', { params });
  },

  async getPayments(params = {}) {
    return await api.get('/admin/payments', { params });
  },
};
