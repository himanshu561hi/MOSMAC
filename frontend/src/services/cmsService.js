import { apiClient } from './apiClient';

export const cmsService = {
  // ==========================================
  // PUBLIC STOREFRONT CONTENT METHODS
  // ==========================================

  async getHomepageLayout() {
    const res = await apiClient.get('/content/homepage');
    return res.data?.sections || res.data || [];
  },

  async getPublicBanners(type = 'hero') {
    const res = await apiClient.get(`/content/banners?type=${type}`);
    return res.data?.banners || [];
  },

  async getPageBySlug(slug) {
    const res = await apiClient.get(`/content/pages/${slug}`);
    return res.data?.page || res.data;
  },

  async getFaqs() {
    const res = await apiClient.get('/content/faqs');
    return {
      grouped: res.data?.grouped || res.data?.groupedFaqs || {},
      total: res.data?.total || 0
    };
  },

  async getStoreSettings() {
    const res = await apiClient.get('/content/settings');
    return res.data?.settings || res.data;
  },

  async getWhatsNewData() {
    const res = await apiClient.get('/content/whats-new');
    return res.data;
  },

  async getAdminWhatsNewConfig() {
    const res = await apiClient.get('/admin/cms/whats-new');
    return res.data?.config || res.data;
  },

  async updateAdminWhatsNewConfig(config) {
    const res = await apiClient.patch('/admin/cms/whats-new', { config });
    return res.data?.config || res.data;
  },

  // ==========================================
  // ADMIN CMS: BANNERS
  // ==========================================

  async listAdminBanners(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/admin/cms/banners${query ? `?${query}` : ''}`);
    return res.data?.banners || [];
  },

  async createBanner(data) {
    const res = await apiClient.post('/admin/cms/banners', data);
    return res.data?.banner || res.data;
  },

  async updateBanner(id, data) {
    const res = await apiClient.patch(`/admin/cms/banners/${id}`, data);
    return res.data?.banner || res.data;
  },

  async deleteBanner(id) {
    const res = await apiClient.delete(`/admin/cms/banners/${id}`);
    return res.data;
  },

  // ==========================================
  // ADMIN CMS: HOMEPAGE BUILDER
  // ==========================================

  async listAdminSections() {
    const res = await apiClient.get('/admin/cms/homepage');
    return res.data?.sections || [];
  },

  async createSection(data) {
    const res = await apiClient.post('/admin/cms/homepage', data);
    return res.data?.section || res.data;
  },

  async updateSection(id, data) {
    const res = await apiClient.patch(`/admin/cms/homepage/${id}`, data);
    return res.data?.section || res.data;
  },

  async reorderSections(sections) {
    const res = await apiClient.post('/admin/cms/homepage/reorder', { sections });
    return res.data?.sections || res.data;
  },

  async deleteSection(id) {
    const res = await apiClient.delete(`/admin/cms/homepage/${id}`);
    return res.data;
  },

  // ==========================================
  // ADMIN CMS: CONTENT PAGES
  // ==========================================

  async listAdminPages(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/admin/cms/pages${query ? `?${query}` : ''}`);
    return {
      pages: res.data?.pages || [],
      pagination: res.data?.pagination || { page: 1, total: 0, pages: 1 }
    };
  },

  async createPage(data) {
    const res = await apiClient.post('/admin/cms/pages', data);
    return res.data?.page || res.data;
  },

  async updatePage(id, data) {
    const res = await apiClient.patch(`/admin/cms/pages/${id}`, data);
    return res.data?.page || res.data;
  },

  async deletePage(id) {
    const res = await apiClient.delete(`/admin/cms/pages/${id}`);
    return res.data;
  },

  // ==========================================
  // ADMIN CMS: FAQS
  // ==========================================

  async listAdminFaqs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/admin/cms/faqs${query ? `?${query}` : ''}`);
    return res.data?.faqs || [];
  },

  async createFaq(data) {
    const res = await apiClient.post('/admin/cms/faqs', data);
    return res.data?.faq || res.data;
  },

  async updateFaq(id, data) {
    const res = await apiClient.patch(`/admin/cms/faqs/${id}`, data);
    return res.data?.faq || res.data;
  },

  async deleteFaq(id) {
    const res = await apiClient.delete(`/admin/cms/faqs/${id}`);
    return res.data;
  },

  // ==========================================
  // ADMIN CMS: STORE SETTINGS
  // ==========================================

  async getAdminSettings() {
    const res = await apiClient.get('/admin/cms/settings');
    return res.data?.settings || res.data;
  },

  async updateAdminSettings(data) {
    const res = await apiClient.patch('/admin/cms/settings', data);
    return res.data?.settings || res.data;
  },

  // ==========================================
  // ADMIN CMS: NOTIFICATION TEMPLATES
  // ==========================================

  async listTemplates() {
    const res = await apiClient.get('/admin/cms/templates');
    return res.data?.templates || [];
  },

  async getTemplate(type) {
    const res = await apiClient.get(`/admin/cms/templates/${type}`);
    return res.data?.template || res.data;
  },

  async updateTemplate(id, data) {
    const res = await apiClient.patch(`/admin/cms/templates/${id}`, data);
    return res.data?.template || res.data;
  },

  async previewTemplate(type, variables) {
    const res = await apiClient.post(`/admin/cms/templates/${type}/preview`, { variables });
    return res.data?.preview || res.data;
  },

  // ==========================================
  // MEDIA LIBRARY & CLOUDINARY REGISTRY
  // ==========================================

  async uploadMediaFiles(files, folder = 'ecommerce/products') {
    const formData = new FormData();
    formData.append('folder', folder);
    const fileList = Array.isArray(files) ? files : Array.from(files);
    fileList.forEach((file) => {
      formData.append('images', file);
    });
    const res = await apiClient.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data?.images || [];
  },

  async listMediaAssets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/media/assets${query ? `?${query}` : ''}`);
    return {
      assets: res.data?.assets || [],
      pagination: res.data?.pagination || { page: 1, total: 0, pages: 1 }
    };
  },

  async recordMediaAsset(data) {
    const res = await apiClient.post('/media/assets', data);
    return res.data?.asset || res.data;
  },

  async deleteMediaAsset(id, force = false) {
    const res = await apiClient.delete(`/media/assets/${id}${force ? '?force=true' : ''}`);
    return res.data;
  },

  async getUploadSignature(folder = 'ecommerce/general') {
    const res = await apiClient.get(`/media/signature?folder=${encodeURIComponent(folder)}`);
    return res.data;
  }
};

export default cmsService;
