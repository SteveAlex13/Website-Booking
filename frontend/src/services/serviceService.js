import api from './api';

export const serviceService = {
  // Hotel & Room Types
  async getHotel() {
    return await api.get('/hotel');
  },

  async getRoomTypes(params = {}) {
    return await api.get('/room-types', { params });
  },

  async getRoomType(idOrSlug, params = {}) {
    return await api.get(`/room-types/${idOrSlug}`, { params });
  },

  async getAmenities() {
    return await api.get('/amenities');
  },

  async getExtraServices() {
    return await api.get('/extra-services');
  },

  async calculatePrice(payload) {
    return await api.post('/bookings/calculate-price', payload);
  },

  async getActiveCoupons() {
    return await api.get('/coupons/active');
  },

  async validateCoupon(code, subtotal = 0) {
    return await api.post('/coupons/validate', { code, subtotal });
  },

  async getRoomReviews(roomTypeId) {
    return await api.get(`/room-types/${roomTypeId}/reviews`);
  },

  // Aliases for compatibility
  async getCategories() {
    return await api.get('/amenities');
  },

  async getServices(params = {}) {
    return await api.get('/room-types', { params });
  },

  async getService(idOrSlug) {
    return await api.get(`/room-types/${idOrSlug}`);
  },

  async getAvailability(serviceId, date) {
    return await api.get(`/room-types/${serviceId}`);
  },
};
