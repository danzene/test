# PriceAlert+ - Changelog

## v1.0.7.1 - Critical Fixes (2025-10-22)

### 🚨 URGENT FIXES
- **Groq Model Updated**: Fixed "model_decommissioned" error
  - Changed from `llama-3.1-70b-versatile` (deprecated) to `llama-3.1-8b-instant`
  - ✅ AI search now works correctly with supported model
- **Chart Rendering Fixed**: Resolved width(-1)/height(-1) error
  - Added explicit minWidth/minHeight to ResponsiveContainer  
  - ✅ Price charts now render properly without console errors
- **Search URL Generation Improved**: Fixed malformed search URLs
  - Simplified query generation (removed complex site: operators)
  - Better domain-based scraper selection
  - ✅ Reduced 403 errors from malformed URLs

### 🔧 Technical Improvements
- **Better Error Handling**: More robust URL processing
- **Cleaner Logs**: Reduced noise from chart warnings
- **Model Future-Proofing**: Using fast, stable Groq model

### 🧪 Debug Status
- `/api/debug/groq-check` - ✅ Key configured
- `/api/debug/groq-test` - ✅ Now uses working model
- All AI endpoints now functional

---

## v1.0.7 - Groq AI Integration (2025-10-22)

### 🎯 Nova Integração com IA Groq
- **Nova chave Groq configurada**: Sistema agora usa IA para buscar produtos equivalentes
- **Endpoints de debug adicionados**:
  - `/api/debug/groq-check` - Verifica se chave Groq está configurada
  - `/api/debug/groq-test` - Testa comunicação direta com Groq API
- **Prompt otimizado**: IA agora recebe instruções detalhadas para busca em e-commerce brasileiro

### 🔧 Melhorias Técnicas
- **Timeout aumentado**: IA tem 10s para processar (era 8s)
- **Logs detalhados**: Tracking completo do fluxo de busca com IA
- **Fallback robusto**: Se IA falhar, sistema usa SERP/busca direta
- **Health check atualizado**: Mostra status dos provedores de IA

### 🚀 Fluxo de Busca Atualizado
1. **Usuário cola URL** → Sistema extrai dados (título, preço, ASIN/GTIN)
2. **IA Groq busca equivalentes** → Retorna URLs de produtos similares
3. **Sistema coleta preços** → Scraping em tempo real
4. **Comparativo exibido** → Menor preço, lojas disponíveis

### 🎨 Experiência do Usuário
- **Busca mais inteligente**: IA entende contexto e encontra produtos equivalentes
- **Resultados mais precisos**: Usa EAN/GTIN e ASIN para matches exatos
- **Cobertura ampliada**: Amazon, Mercado Livre, Magalu, KaBuM, Americanas

### 🔍 Como Testar
```bash
# Verificar se Groq está configurado
GET /api/debug/groq-check

# Testar API Groq
GET /api/debug/groq-test

# Testar com produto real
POST /api/ingest
{ "url": "https://amazon.com.br/produto-teste" }
```

### 📊 Métricas Esperadas
- ✅ Groq API retorna status 200
- ✅ Busca encontra 3+ URLs equivalentes
- ✅ Comparativo mostra preços em tempo real
- ✅ Method: 'ai' nos logs (sucesso da IA)

---

## v1.0.6 - Market Comparison Enhancement

### 🛒 Real-time Market Search
- **AI-powered equivalent search**: Uses Groq/Perplexity to find equivalent products
- **SERP API integration**: Google search fallback for comprehensive coverage
- **Multi-store price comparison**: Amazon, Mercado Livre, Magalu, KaBuM
- **Confidence scoring**: Each match includes confidence level (0-1)

### 🔧 Technical Improvements
- **Parallel fetching**: Multiple stores scraped simultaneously
- **Domain-based rate limiting**: Prevents 429/403 errors
- **Timeout protection**: 5s per URL, 8s total budget
- **Caching system**: Reduces redundant API calls

### 🎯 Enhanced Product Matching
- **Canonical ID matching**: GTIN/EAN and ASIN-based deduplication
- **Brand + Model matching**: Intelligent product identification
- **Title similarity**: Fallback matching using text analysis
- **Quality verification**: Verified vs partial data classification

---

## v1.0.5 - Enhanced User Experience

### 🎨 UI/UX Improvements
- **Real-time loading states**: Progressive data loading with skeletons
- **Market comparison cards**: Clean, organized price comparison layout
- **Verification badges**: Clear indicators for data quality
- **Responsive design**: Optimized for mobile and desktop

### 📊 Analytics & Monitoring
- **Search logging**: Track user search patterns and success rates
- **Error tracking**: Comprehensive error logging for debugging
- **Performance metrics**: Monitor scraping success rates and timing

### 🔐 Authentication & Limits
- **Plan-based limits**: FREE (1 alert, 2 searches/day), GOLD (15 alerts, 50 searches), PREMIUM (100 alerts, 500 searches)
- **WhatsApp notifications**: Available for GOLD+ plans
- **Rate limiting**: Protect against abuse while ensuring good UX

---

## v1.0.4 - Core Platform Stability

### 🏗️ Infrastructure
- **Database migrations**: Enhanced schema with canonical IDs
- **Cloudflare Workers**: Optimized for edge computing
- **SQLite D1**: Fast, reliable data storage
- **React + Vite**: Modern frontend with hot reload

### 🛡️ Security & Performance
- **Input validation**: Zod schemas for type safety
- **URL normalization**: Consistent product URL handling
- **Error boundaries**: Graceful error handling throughout app
- **CORS configuration**: Secure cross-origin resource sharing

### 📱 Core Features
- **Product ingestion**: Support for major Brazilian e-commerce sites
- **Price monitoring**: 90-day historical price tracking
- **Alert system**: Email notifications for price drops
- **Wishlist management**: Save and organize favorite products

---

## Earlier Versions

### v1.0.3 - Enhanced Product Detection
- Multi-adapter architecture for different e-commerce sites
- Improved price parsing for Brazilian currency format
- Canonical ID extraction (GTIN, ASIN, MPN)

### v1.0.2 - User Management
- Dashboard with alert history
- User preferences and notification settings
- Plan-based feature access

### v1.0.1 - Basic Monitoring
- Core price tracking functionality
- Email alerts for price drops
- Basic product comparison

### v1.0.0 - Initial Release
- Product URL ingestion
- Price extraction
- Basic alert system
