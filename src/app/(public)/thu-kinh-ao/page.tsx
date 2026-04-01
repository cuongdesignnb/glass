'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { publicApi } from '@/lib/api';
import { GENDERS, FACE_SHAPES, FRAME_STYLES, MATERIALS, COLORS, formatPrice } from '@/lib/constants';
import { FiUpload, FiCamera, FiX, FiSearch, FiChevronRight, FiChevronLeft, FiArrowRight, FiCheck, FiDownload, FiRotateCcw, FiFilter, FiGrid, FiZoomIn } from 'react-icons/fi';
import { RiGlassesLine, RiSparklingLine, RiCameraLensFill, RiMagicLine } from 'react-icons/ri';
import './try-on.css';

const API_MEDIA = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');

interface GlassProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail: string;
  price: number;
  sale_price: number | null;
  brand: string;
  colors: string[];
  color_names?: string[];
  images?: string[];
  category?: { name: string };
}

export default function VirtualTryOnPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // Step 1 - Face upload
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Step 2 - Select glasses
  const [products, setProducts] = useState<GlassProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GlassProduct | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: '', frame_style: '', material: '', color: '', search: '',
  });
  
  // Step 3 - Result
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch products for step 2
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '50' };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const data = await publicApi.getProducts(params);
      setProducts(data.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (step === 2) fetchProducts();
  }, [step, fetchProducts]);

  // Camera functions
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Không thể truy cập camera. Vui lòng cấp quyền hoặc sử dụng chức năng tải ảnh lên.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the image for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      setFaceImage(canvas.toDataURL('image/jpeg', 0.9));
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  };

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaceFile(file);
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setFaceFile(file);
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Process try-on via Gemini AI
  const processTryOn = useCallback(async () => {
    if (!faceImage || !selectedProduct) return;
    setProcessing(true);
    setErrorMsg(null);
    setStep(3);

    try {
      // Chuẩn bị glasses image URL
      const glassesSrc = selectedProduct.thumbnail?.startsWith('http')
        ? selectedProduct.thumbnail
        : selectedProduct.thumbnail?.startsWith('/')
          ? `${API_MEDIA}${selectedProduct.thumbnail}`
          : selectedProduct.thumbnail;

      // Gọi Gemini AI qua backend
      const result = await publicApi.aiTryOn({
        face_image: faceImage,
        glasses_image: glassesSrc || '',
        product_name: selectedProduct.name,
      });

      if (result.success && result.image) {
        setResultImage(result.image);
      } else {
        throw new Error(result.error || 'AI không trả về ảnh');
      }
    } catch (err: any) {
      console.error('AI Try-On error:', err);
      const msg = err?.message || '';

      if (msg.includes('429') || msg.includes('Too Many')) {
        setErrorMsg('⏳ Hệ thống AI đang quá tải. Vui lòng đợi 30 giây rồi thử lại.');
      } else if (msg.includes('500')) {
        setErrorMsg('AI đang gặp lỗi. Vui lòng kiểm tra Gemini API key trong Cài đặt Admin.');
      } else if (msg.includes('422') || msg.includes('không thể')) {
        setErrorMsg('AI không thể tạo ảnh thử kính với ảnh này. Vui lòng thử ảnh khuôn mặt khác.');
      } else {
        setErrorMsg(msg || 'Không thể xử lý ảnh. Vui lòng thử lại sau.');
      }
    } finally {
      setProcessing(false);
    }
  }, [faceImage, selectedProduct, selectedColor]);

  // Fallback Canvas processing
  const fallbackCanvasProcess = async () => {
    if (!faceImage || !selectedProduct) return;
    const canvas = resultCanvasRef.current;
    if (!canvas) return;

    const faceImg = new Image();
    faceImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      faceImg.onload = () => resolve();
      faceImg.onerror = reject;
      faceImg.src = faceImage;
    });

    canvas.width = faceImg.width;
    canvas.height = faceImg.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(faceImg, 0, 0);

    // Load glasses image
    const glassesImg = new Image();
    glassesImg.crossOrigin = 'anonymous';
    const glassesSrc = selectedProduct.thumbnail?.startsWith('http')
      ? selectedProduct.thumbnail
      : `${API_MEDIA}${selectedProduct.thumbnail}`;

    await new Promise<void>((resolve) => {
      glassesImg.onload = () => resolve();
      glassesImg.onerror = () => resolve();
      glassesImg.src = glassesSrc;
    });

    if (glassesImg.width > 0) {
      const gW = canvas.width * 0.45;
      const gH = gW * (glassesImg.height / glassesImg.width);
      const gX = (canvas.width - gW) / 2;
      const gY = canvas.height * 0.25;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(glassesImg, gX, gY, gW, gH);
      ctx.globalAlpha = 1.0;
    }

    // Watermark
    const wmSize = Math.max(14, canvas.width * 0.02);
    ctx.font = `bold ${wmSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'center';
    const wmText = '✦ GLASS EYEWEAR — Virtual Try-On ✦';
    ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
    const wmY = canvas.height - wmSize * 2;
    const wmMetrics = ctx.measureText(wmText);
    ctx.fillRect(canvas.width / 2 - wmMetrics.width / 2 - 16, wmY - wmSize, wmMetrics.width + 32, wmSize * 2.2);
    ctx.fillStyle = '#c9a96e';
    ctx.fillText(wmText, canvas.width / 2, wmY);
    ctx.font = `${wmSize * 0.7}px 'Inter', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(selectedProduct.name, canvas.width / 2, wmY + wmSize);

    setResultImage(canvas.toDataURL('image/jpeg', 0.92));
  };

  // Download result
  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.download = `glass-tryon-${Date.now()}.jpg`;
    link.href = resultImage;
    link.click();
  };

  // Reset
  const resetAll = () => {
    setStep(1);
    setFaceImage(null);
    setFaceFile(null);
    setSelectedProduct(null);
    setSelectedColor('');
    setResultImage(null);
    setErrorMsg(null);
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: prev[key as keyof typeof prev] === value ? '' : value }));
  };

  return (
    <div style={{ paddingTop: 'var(--header-height)' }}>
      {/* Hero Header */}
      <div className="tryon-hero">
        <div className="tryon-hero__bg">
          <div className="tryon-hero__orb tryon-hero__orb--1" />
          <div className="tryon-hero__orb tryon-hero__orb--2" />
          <div className="tryon-hero__orb tryon-hero__orb--3" />
        </div>
        <div className="container">
          <div className="tryon-hero__content">
            <div className="tryon-hero__badge">
              <RiSparklingLine /> Công nghệ AI
            </div>
            <h1 className="tryon-hero__title">
              Thử Kính <em>Ảo</em>
            </h1>
            <p className="tryon-hero__desc">
              Trải nghiệm đeo thử kính ngay tại nhà với công nghệ AI tiên tiến
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="tryon-progress">
        <div className="container">
          <div className="tryon-steps">
            <button 
              className={`tryon-step ${step >= 1 ? 'tryon-step--active' : ''} ${step > 1 ? 'tryon-step--done' : ''}`}
              onClick={() => { if (step > 1) setStep(1); }}
            >
              <span className="tryon-step__num">{step > 1 ? <FiCheck /> : '1'}</span>
              <span className="tryon-step__label">Tải ảnh khuôn mặt</span>
            </button>
            <div className={`tryon-steps__line ${step >= 2 ? 'tryon-steps__line--active' : ''}`} />
            <button 
              className={`tryon-step ${step >= 2 ? 'tryon-step--active' : ''} ${step > 2 ? 'tryon-step--done' : ''}`}
              onClick={() => { if (step > 2 || (step >= 2 && faceImage)) setStep(2); }}
            >
              <span className="tryon-step__num">{step > 2 ? <FiCheck /> : '2'}</span>
              <span className="tryon-step__label">Chọn kính</span>
            </button>
            <div className={`tryon-steps__line ${step >= 3 ? 'tryon-steps__line--active' : ''}`} />
            <button className={`tryon-step ${step >= 3 ? 'tryon-step--active' : ''}`}>
              <span className="tryon-step__num">3</span>
              <span className="tryon-step__label">Kết quả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container tryon-container">
        {/* ====== STEP 1 - Face Upload ====== */}
        {step === 1 && (
          <div className="tryon-panel tryon-fade-in">
            <div className="tryon-panel__header">
              <RiCameraLensFill className="tryon-panel__icon" />
              <div>
                <h2 className="tryon-panel__title">Ảnh Khuôn Mặt</h2>
                <p className="tryon-panel__subtitle">Tải lên ảnh hoặc chụp trực tiếp từ camera</p>
              </div>
            </div>

            {!faceImage && !showCamera && (
              <div className="tryon-upload-area">
                <div
                  className="tryon-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="tryon-dropzone__icon">
                    <FiUpload />
                  </div>
                  <h3>Kéo thả ảnh vào đây</h3>
                  <p>hoặc click để chọn file từ thiết bị</p>
                  <span className="tryon-dropzone__formats">Hỗ trợ: JPG, PNG, WebP (tối đa 10MB)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="tryon-upload-divider">
                  <span>hoặc</span>
                </div>
                <button className="tryon-camera-btn" onClick={startCamera}>
                  <FiCamera />
                  <span>Chụp ảnh từ Camera</span>
                </button>
              </div>
            )}

            {/* Camera View */}
            {showCamera && (
              <div className="tryon-camera">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="tryon-camera__video"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="tryon-camera__overlay">
                  <div className="tryon-camera__guide" />
                </div>
                <div className="tryon-camera__actions">
                  <button className="tryon-camera__cancel" onClick={stopCamera}>
                    <FiX /> Hủy
                  </button>
                  <button className="tryon-camera__capture" onClick={capturePhoto}>
                    <div className="tryon-camera__shutter" />
                  </button>
                  <div style={{ width: '80px' }} />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            )}

            {/* Face Preview */}
            {faceImage && !showCamera && (
              <div className="tryon-face-preview">
                <div className="tryon-face-preview__image-wrapper">
                  <img src={faceImage} alt="Ảnh khuôn mặt" className="tryon-face-preview__image" />
                  <button
                    className="tryon-face-preview__remove"
                    onClick={() => { setFaceImage(null); setFaceFile(null); }}
                  >
                    <FiX />
                  </button>
                </div>
                <div className="tryon-face-preview__info">
                  <FiCheck className="tryon-face-preview__check" />
                  <span>Ảnh khuôn mặt đã sẵn sàng</span>
                </div>
                <button className="btn btn-primary btn-lg tryon-next-btn" onClick={() => setStep(2)}>
                  Chọn kính để thử <FiArrowRight />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== STEP 2 - Select Glasses ====== */}
        {step === 2 && (
          <div className="tryon-panel tryon-fade-in">
            <div className="tryon-panel__header">
              <RiGlassesLine className="tryon-panel__icon" />
              <div>
                <h2 className="tryon-panel__title">Chọn Kính</h2>
                <p className="tryon-panel__subtitle">Chọn kính bạn muốn thử đeo</p>
              </div>
              <button className="tryon-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                <FiFilter /> Bộ lọc
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="tryon-filters tryon-fade-in">
                <div className="tryon-filters__row">
                  <div className="tryon-filter-group">
                    <label>Tìm kiếm</label>
                    <div className="tryon-filter-search">
                      <FiSearch />
                      <input
                        type="text"
                        placeholder="Tên kính, thương hiệu..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="tryon-filter-group">
                    <label>Giới tính</label>
                    <div className="tryon-filter-chips">
                      {GENDERS.map(g => (
                        <button
                          key={g.value}
                          className={`tryon-chip ${filters.gender === g.value ? 'tryon-chip--active' : ''}`}
                          onClick={() => updateFilter('gender', g.value)}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="tryon-filters__row">
                  <div className="tryon-filter-group">
                    <label>Kiểu gọng</label>
                    <div className="tryon-filter-chips">
                      {FRAME_STYLES.map(f => (
                        <button
                          key={f.value}
                          className={`tryon-chip ${filters.frame_style === f.value ? 'tryon-chip--active' : ''}`}
                          onClick={() => updateFilter('frame_style', f.value)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="tryon-filters__row">
                  <div className="tryon-filter-group">
                    <label>Chất liệu</label>
                    <div className="tryon-filter-chips">
                      {MATERIALS.map(m => (
                        <button
                          key={m.value}
                          className={`tryon-chip ${filters.material === m.value ? 'tryon-chip--active' : ''}`}
                          onClick={() => updateFilter('material', m.value)}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="tryon-filters__row">
                  <div className="tryon-filter-group">
                    <label>Màu sắc</label>
                    <div className="tryon-filter-colors">
                      {COLORS.map(c => (
                        <button
                          key={c.value}
                          className={`tryon-color-dot ${filters.color === c.value ? 'tryon-color-dot--active' : ''}`}
                          style={{ backgroundColor: c.value === 'transparent' ? '#f5f5dc' : c.value }}
                          onClick={() => updateFilter('color', c.value)}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="tryon-products">
              {loading ? (
                <div className="tryon-products__loading">
                  <div className="tryon-spinner" />
                  <p>Đang tải sản phẩm...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="tryon-products__empty">
                  <RiGlassesLine />
                  <p>Không tìm thấy sản phẩm nào</p>
                </div>
              ) : (
                <div className="tryon-products__grid">
                  {products.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    const thumbSrc = product.thumbnail
                      ? (product.thumbnail.startsWith('http') ? product.thumbnail : `${API_MEDIA}${product.thumbnail}`)
                      : '';
                    return (
                      <button
                        key={product.id}
                        className={`tryon-product-card ${isSelected ? 'tryon-product-card--selected' : ''}`}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedColor(product.colors?.[0] || '');
                        }}
                      >
                        {isSelected && (
                          <div className="tryon-product-card__check">
                            <FiCheck />
                          </div>
                        )}
                        <div className="tryon-product-card__img">
                          {thumbSrc ? (
                            <img src={thumbSrc} alt={product.name} />
                          ) : (
                            <div className="tryon-product-card__placeholder">
                              <RiGlassesLine />
                            </div>
                          )}
                        </div>
                        <div className="tryon-product-card__info">
                          <span className="tryon-product-card__brand">{product.brand || product.category?.name}</span>
                          <h4 className="tryon-product-card__name">{product.name}</h4>
                          <div className="tryon-product-card__price">
                            {formatPrice(product.sale_price || product.price)}
                          </div>
                          {product.colors && product.colors.length > 0 && (
                            <div className="tryon-product-card__colors">
                              {product.colors.slice(0, 6).map((c: string, i: number) => (
                                <span
                                  key={i}
                                  className="tryon-product-card__color-dot"
                                  style={{ backgroundColor: c === 'transparent' ? '#f5f5dc' : c }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Product Detail + Color Selection */}
            {selectedProduct && (
              <div className="tryon-selected tryon-fade-in">
                <div className="tryon-selected__info">
                  <div className="tryon-selected__thumb">
                    <img
                      src={
                        selectedProduct.thumbnail?.startsWith('http')
                          ? selectedProduct.thumbnail
                          : `${API_MEDIA}${selectedProduct.thumbnail}`
                      }
                      alt={selectedProduct.name}
                    />
                  </div>
                  <div>
                    <h3>{selectedProduct.name}</h3>
                    <p>{formatPrice(selectedProduct.sale_price || selectedProduct.price)}</p>
                  </div>
                </div>
                {selectedProduct.colors && selectedProduct.colors.length > 1 && (
                  <div className="tryon-selected__colors">
                    <label>Chọn màu:</label>
                    <div className="tryon-selected__color-list">
                      {selectedProduct.colors.map((c: string, i: number) => (
                        <button
                          key={i}
                          className={`tryon-selected__color-btn ${selectedColor === c ? 'tryon-selected__color-btn--active' : ''}`}
                          style={{ backgroundColor: c === 'transparent' ? '#f5f5dc' : c }}
                          onClick={() => setSelectedColor(c)}
                          title={selectedProduct.color_names?.[i] || c}
                        >
                          {selectedColor === c && <FiCheck />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button className="btn btn-primary btn-lg tryon-next-btn" onClick={processTryOn}>
                  <RiMagicLine /> Đeo thử kính
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====== STEP 3 - Result ====== */}
        {step === 3 && (
          <div className="tryon-panel tryon-fade-in">
            <div className="tryon-panel__header">
              <RiSparklingLine className="tryon-panel__icon" />
              <div>
                <h2 className="tryon-panel__title">Kết Quả Thử Kính</h2>
                <p className="tryon-panel__subtitle">
                  {processing ? 'Đang xử lý ảnh...' : 'Xem kết quả và tải về ảnh'}
                </p>
              </div>
            </div>

            <canvas ref={resultCanvasRef} style={{ display: 'none' }} />

            {processing ? (
              <div className="tryon-processing">
                <div className="tryon-processing__animation">
                  <div className="tryon-processing__ring" />
                  <div className="tryon-processing__ring tryon-processing__ring--2" />
                  <div className="tryon-processing__ring tryon-processing__ring--3" />
                  <RiMagicLine className="tryon-processing__icon" />
                </div>
                <h3>AI đang xử lý ảnh thử kính...</h3>
                <p>Quá trình này có thể mất 10-30 giây, vui lòng đợi</p>
                <div className="tryon-processing__progress">
                  <div className="tryon-processing__bar" />
                </div>
              </div>
            ) : errorMsg ? (
              <div className="tryon-result" style={{ textAlign: 'center' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                  fontSize: '2rem', color: '#ef4444',
                }}>!</div>
                <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Lỗi xử lý</h3>
                <p style={{ opacity: 0.7, marginBottom: '24px', lineHeight: 1.6 }}>{errorMsg}</p>
                <div className="tryon-result__actions">
                  <button className="btn btn-primary btn-lg" onClick={() => { setErrorMsg(null); processTryOn(); }}>
                    <FiRotateCcw /> Thử lại
                  </button>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>
                    Chọn kính khác
                  </button>
                  <button className="btn btn-dark" onClick={resetAll}>
                    Bắt đầu lại
                  </button>
                </div>
              </div>
            ) : resultImage ? (
              <div className="tryon-result">
                <div className="tryon-result__image-wrapper">
                  <img src={resultImage} alt="Kết quả thử kính" className="tryon-result__image" />
                </div>
                <div className="tryon-result__product-info">
                  <div className="tryon-result__product-thumb">
                    <img
                      src={
                        selectedProduct?.thumbnail?.startsWith('http')
                          ? selectedProduct!.thumbnail
                          : `${API_MEDIA}${selectedProduct!.thumbnail}`
                      }
                      alt={selectedProduct!.name}
                    />
                  </div>
                  <div className="tryon-result__product-details">
                    <h3>{selectedProduct!.name}</h3>
                    <p className="tryon-result__price">{formatPrice(selectedProduct!.sale_price || selectedProduct!.price)}</p>
                  </div>
                </div>
                <div className="tryon-result__actions">
                  <button className="btn btn-primary btn-lg" onClick={downloadResult}>
                    <FiDownload /> Tải ảnh về
                  </button>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>
                    <FiRotateCcw /> Thử kính khác
                  </button>
                  <button className="btn btn-dark" onClick={resetAll}>
                    Bắt đầu lại
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
