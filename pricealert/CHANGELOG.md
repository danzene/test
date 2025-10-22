# Changelog

## v1.0.8 - Performance Optimization Update (2025-10-22)

### 🚀 Major Performance Improvements
- **Parallel fetching**: MercadoLivre API + HTML em paralelo com timeouts
- **Timeout protection**: Todos adapters com limites de 6-8s máximo
- **Domain pool**: Limitação de 2 req/domínio simultâneas + retry automático
- **Performance cache**: Cache de 24h para ProductRaw, 1h para market snapshots
- **Instant price points**: PricePoint salvo durante ingestão para gráficos imediatos

### 🛠️ Technical Enhancements
- Added `withTimeout()` and `firstSettled()` async utilities
- Implemented domain-based concurrency pooling
- Created performance-focused caching system
- Added database indexes for faster queries
- Enhanced error handling with retry mechanisms

### 📊 Performance Targets
- **Ingestão**: ≤ 8s no pior caso, 1-3s quando cache hit
- **Comparativo**: ≤ 3.8s fase síncrona, continua em background
- **Gráficos**: Aparecem instantaneamente com primeiro price point

### 🔧 Adapter Optimizations
- **MercadoLivre**: API + HTML em paralelo, fallback inteligente
- **Amazon/Magalu/KaBuM**: Single fetch com timeout de 6s
- **Universal**: Timeout de 6s com parsing otimizado
- **All adapters**: Cached results + domain pool protection

### 🗄️ Database Improvements
- Added performance indexes for faster queries
- Optimized price_points insertion during ingestion
- Enhanced canonical ID lookup performance

### 🌐 Frontend Enhancements
- Added "busca parcial" indicator for market comparison
- Real-time progress feedback during searches
- Improved loading states and error handling

## v1.0.7.1 - TypeScript & Testing Fixes (2025-10-22)

### 🔧 Bug Fixes
- Fixed all TypeScript compilation errors
- Corrected KaBuM adapter model processing
- Added comprehensive null-safety helpers
- Implemented robust adapter signatures

### 🧪 Testing Infrastructure
- Added Vitest configuration and basic tests
- Created tests for price parsing and market deduplication
- Ensured 100% TypeScript compliance

## v1.0.7 - Universal URL Ingestion (2025-10-22)

### 🔧 Critical Fixes
- **D1_TYPE_ERROR resolved**: Added `|| null` for all undefined database values
- **Universal URL support**: Enhanced ingestion for any e-commerce site
- **Canonical deduplication**: GTIN/ASIN-based product matching
- **Robust error handling**: Better fallbacks and error messages

### 🌐 Enhanced Adapters
- **Amazon BR**: Improved ASIN extraction and buybox price parsing
- **Mercado Livre**: Enhanced API + HTML fallback with antibot handling  
- **Magalu**: Added __NEXT_DATA__ parsing for better data extraction
- **KaBuM**: Comprehensive JSON-LD + fallback parsing
- **Universal**: Smart fallback for any e-commerce site

### 🔍 Real-time Market Search
- Live equivalents search using SERP API or domain scanning
- Enhanced confidence scoring for product matching
- Automatic price comparison across major stores

### 📊 Data Quality Improvements
- Enhanced canonical ID resolution (GTIN/EAN, ASIN, MPN)
- Better brand/model extraction from product specs
- Improved data quality indicators (verified vs partial)

## v1.0.6.1 - Enhanced Product Details (2025-10-22)

### 📊 Improved Analytics
- Enhanced product details API with real 90-day statistics
- Better price point data structure
- Improved collecting state handling

### 🎨 UI Improvements
- Updated product page with verification status
- Enhanced market comparison component
- Better loading states and error handling

## v1.0.6 - Market Comparison (2025-10-22)

### 🛍️ Market Comparison
- Real-time price comparison across stores
- Automatic product matching by GTIN/ASIN
- Market statistics (min, max, average prices)
- Confidence scoring for product matches

### 📈 Enhanced Analytics
- Comprehensive dashboard with usage statistics
- Plan limits and usage tracking
- Alert history with detailed information
- Performance monitoring

### 🎨 UI/UX Improvements
- Modern notification toast system
- Enhanced user preferences modal
- Improved wishlist functionality
- Better responsive design

## v1.0.5 - Admin Panel (2025-10-22)

### 👨‍💼 Admin Features
- Admin panel with offer management
- CRUD operations for promotional offers
- User analytics and statistics
- Content moderation tools

### 🎯 Offers System
- Curated promotional offers
- Category and store filtering
- Expiration date management
- Pinned/featured offers

## v1.0.4 - Advanced Features (2025-10-22)

### 🔔 Enhanced Notifications
- User preferences for notification settings
- WhatsApp notifications (Gold/Premium plans)
- Timezone support
- Frequency controls (immediate/daily/weekly)

### ❤️ Wishlist System
- Personal product wishlist
- Notes and organization
- Integration with price alerts
- Plan-based limits

### 📊 Analytics & Feedback
- User behavior tracking
- Feedback collection system
- Performance monitoring
- Error reporting

## v1.0.3 - Price Intelligence (2025-10-22)

### 🧠 Smart Product Matching
- GTIN/EAN-based canonical identification
- Enhanced product deduplication
- Cross-store product matching
- Confidence scoring for matches

### 📊 Advanced Analytics
- Real 90-day price statistics
- Price trend analysis
- Market position insights
- Historical data aggregation

### ⚡ Performance Improvements
- Optimized database queries
- Better caching strategies
- Reduced API calls
- Faster product lookups

## v1.0.2 - User Experience (2025-10-22)

### 👤 User Management
- Complete user dashboard
- Alert management interface
- Usage tracking and limits
- Plan-based feature restrictions

### 📈 Dashboard Features
- Active alerts overview
- Alert history tracking
- Usage statistics
- Plan upgrade prompts

### 🔔 Alert System
- Email notifications
- WhatsApp support (premium plans)
- Customizable thresholds
- Multi-channel delivery

## v1.0.1 - Foundation Features (2025-10-22)

### 🏗️ Core Infrastructure
- Product ingestion from major Brazilian e-commerce sites
- Price tracking and historical data
- Basic alert system
- User authentication

### 🛍️ Supported Stores
- Amazon Brasil
- Mercado Livre
- Americanas
- Submarino
- Casas Bahia

### 📊 Basic Analytics
- Price history charts
- Simple statistics
- Product information display

## v1.0.0 - Initial Release (2025-10-22)

### 🎉 Launch Features
- Basic product URL ingestion
- Simple price monitoring
- User registration and login
- Basic web interface
- SQLite database foundation
