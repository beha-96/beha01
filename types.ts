
export enum UserRole {
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  INVESTOR = 'INVESTOR',
  CLIENT = 'CLIENT'
}

export enum OrderStatus {
  NEW = 'NOUVEAU',
  PROCESSING = 'TRAITEMENT',
  IN_TRANSIT = 'EN_TRANSIT',
  OUT_FOR_DELIVERY = 'LIVRAISON_EN_COURS',
  READY = 'DISPONIBLE_POINT_RELAIS',
  DELIVERED = 'LIVRE',
  CANCELLED = 'ANNULE',
  RETURN_REQUESTED = 'RETOUR_DEMANDE',
  RETURN_ACCEPTED = 'RETOUR_ACCEPTE',
  RETURN_PROCESSING = 'RETOUR_TRAITEMENT',
  REFUNDED = 'REMBOURSE'
}

export enum PartnerType {
  AGENCY = 'AGENCY',
  STORE = 'STORE',
  PICKUP = 'PICKUP'
}

export interface ProductVariants {
  colors?: string[];
  sizes?: string[];
  models?: string[];
  weights?: string[];
  volumes?: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  capital?: number; // Cout d'achat initial pour calcul benefice
  originalPrice?: number;
  category: string;
  stock: number;
  active: boolean;
  images: string[];
  description: string;
  descriptionImages?: string[];
  variants?: ProductVariants;
  variantPrices?: Record<string, number>;
  variantImages?: Record<string, string>;
  variantStocks?: Record<string, number>;
  investorId?: string;
  brand?: string;
  moq?: number;
  storeType?: string;
  likes?: number;
  dislikes?: number;
  views?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
  image?: string; // selected variant image
  selectedColor?: string;
  selectedSize?: string;
  selectedModel?: string;
  selectedWeight?: string;
  selectedVolume?: string;
}

export interface PasswordChangeLog {
  date: string;
  ip?: string; // Mocked IP
  reason?: string;
}

export interface SystemLog {
  id: string;
  action: string;
  adminId: string;
  details: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface FinancialTransaction {
  id: string;
  orderId: string;
  orderShortId: string;
  date: string;
  totalSales: number;     // Prix de vente total
  totalCapital: number;   // Capital initial retiré
  grossProfit: number;    // Bénéfice brut
  distributions: {
    investor: number;     // 30%
    vat: number;          // 18%
    partner: number;      // 17%
    admin: number;        // 35%
  };
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'PUSH';
  targetAudience: 'ALL' | 'VIP' | 'INACTIVE';
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledDate?: string;
  content: string;
  reachCount?: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  surname?: string;
  role: UserRole | string; // Allow string fallback for legacy data
  isActive: boolean;
  email?: string;
  whatsapp?: string;
  assignedZone?: string; // For partners
  commissionRate?: number; // For partners
  partnerType?: PartnerType | string;
  // Security fields
  passwordHash?: string;
  passwordSalt?: string;
  passwordHistory?: PasswordChangeLog[];
}

export interface OrderItem extends CartItem {}

export interface OrderStatusHistory {
  status: OrderStatus;
  date: string;
  note?: string;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  city: string;
  commune?: string;
  address?: string;
  deliveryMethod: 'HOME' | 'PICKUP';
  pickupPointId?: string;
}

export interface ReviewDetails {
  productOpinion: string;
  serviceOpinion?: string;
  storeRating?: number;
  deliveryRating?: number;
  submittedAt: string;
}

export interface Order {
  id: string;
  shortId: string;
  createdAt: string;
  customer: CustomerDetails;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  assignedPartnerId?: string;
  commissionAmount?: number;
  isPaid: boolean;
  paymentMethod?: string;
  deliveryValidatedByPartner?: boolean;
  collectionCode?: string;
  deliveredAt?: string;
  customerConfirmedReceipt?: boolean;
  reviewDetails?: ReviewDetails;
  refundCouponCode?: string;
  refundCouponValue?: number;
  couponRedeemed?: boolean;
  usedCouponCode?: string;
  discountAmount?: number;
  financialProcessed?: boolean; // Flag to prevent double calculation
}

export interface ProductReview {
  id: string;
  productId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  description?: string;
  bannerUrl?: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
}

export interface DeliveryRule {
  id: string;
  zoneName: string;
  price: number;
  active: boolean;
}

export interface GlobalVariantOption {
  id: string;
  value: string;
  priceAdjustment: number;
  imageUrl?: string;
  stock?: number;
  active: boolean;
}

export interface GlobalVariantsConfig {
  colors: GlobalVariantOption[];
  sizes: GlobalVariantOption[];
  weights: GlobalVariantOption[];
  volumes: GlobalVariantOption[];
  models: GlobalVariantOption[];
}

export interface LogoutConfig {
    redirectUrl?: string;
    label?: string;
    enableInvestor?: boolean;
}

export interface SiteConfig {
  appName: string;
  heroTitle: string;
  heroSubtitle: string;
  contactEmail?: string;
  contactPhone?: string;
  primaryColor?: string;
  secondaryColor?: string;
  termsOfService?: string;
  privacyPolicy?: string;
  banners?: string[];
  categories: Category[];
  deliveryRules: DeliveryRule[];
  enableCashOnDelivery: boolean;
  globalVariants: GlobalVariantsConfig;
  storeTypes?: string[];
  logoutConfig?: LogoutConfig;
}

export interface Dispute {
  id: string;
  orderId: string;
  partnerId: string;
  type: 'RETURN' | 'WITHDRAWAL_EXCEEDED' | 'OTHER';
  description: string;
  status: 'OPEN' | 'RESOLVED';
  adminDecision?: 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  affectedProductIds: string[];
  photoUrl?: string;
}

export interface PageComponent {
  id: string;
  type: 'HERO' | 'PRODUCT_GRID' | 'FILTERABLE_GRID' | 'CATEGORY_LIST' | 'IMAGE_BANNER' | 'TEXT_BLOCK';
  data: any;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  type: 'HOME' | 'CATEGORY' | 'CUSTOM';
  active: boolean;
  components: PageComponent[];
  isSystem?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface RolePermission {
  role: UserRole | string;
  label: string;
  permissions: Record<string, { read: boolean; write: boolean; delete: boolean }>;
}

export interface EarningsRecord {
  id: string;
  partnerId: string;
  amount: number;
  month: number;
  year: number;
  generatedAt: string;
}

export interface DriverDocuments {
  idCard: string; // Base64 or URL
  license: string; // Base64 or URL
}

export interface DeliveryDriver {
  id: string;
  agencyId?: string; // Linked to partner
  name: string;
  phone: string;
  zone: string;
  // Extended Statuses
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'BUSY' | 'REJECTED' | 'ARCHIVED';
  rating?: number;
  totalDeliveries?: number;
  joinedAt?: string;
  documents?: DriverDocuments;
  adminNote?: string; // Reason for rejection
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minSpend?: number;
  active: boolean;
  usageCount: number;
}

export interface Voucher {
  id: string;
  code: string;
  value: number;
  isManual: boolean;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  generatedAt: string;
  linkedOrderId?: string;
}

export interface InternationalShipmentTimeline {
    status: string;
    date: string;
    location: string;
}

export interface InternationalShipment {
  id: string;
  trackingCode: string;
  sender: string;
  recipient: string;
  originCountry: string;
  destinationCountry: string;
  weight: string;
  status: string;
  estimatedArrival: string;
  timeline: InternationalShipmentTimeline[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'STATUS' | 'INFO' | 'ALERT' | 'COUPON';
  read: boolean;
  createdAt: string;
  link?: string;
}
