'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { FiUpload, FiCamera, FiX, FiCheck, FiDownload, FiRotateCcw } from 'react-icons/fi';
import { RiMagicLine, RiGlassesLine, RiSparklingLine, RiCameraLensFill } from 'react-icons/ri';
import { useSettings } from '@/lib/useSettings';
import './TryOnModal.css';

const API_MEDIA = (process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '');

interface TryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    thumbnail: string;
    price: number;
    sale_price?: number | null;
    colors?: string[];
    color_names?: string[];
  };
  selectedColor?: string;
}

export default function TryOnModal({ isOpen, onClose, product, selectedColor: initialColor }: TryOnModalProps) {
  const { settings } = useSettings();
  const siteName = settings['site_name'] || 'GLASS EYEWEAR';
  const siteLogoUrl = settings['site_logo']
    ? (settings['site_logo'].startsWith('http')
      ? settings['site_logo']
      : `${(process.env.NEXT_PUBLIC_API_URL || '').replace('/api', '')}${settings['site_logo']}`)
    : '';
  const fallbackLogo = '/icons/icon-192x192.png';
  const siteLogo = siteLogoUrl || fallbackLogo;

  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(initialColor || product.colors?.[0] || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSelectedColor(initialColor || product.colors?.[0] || '');
  }, [initialColor, product.colors]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setFaceImage(null);
      setResultImage(null);
      setProcessing(false);
      setShowCamera(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Không thể truy cập camera.');
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
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
      setFaceImage(canvas.toDataURL('image/jpeg', 0.9));
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFaceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFaceImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processTryOn = useCallback(async () => {
    if (!faceImage) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const glassesSrc = product.thumbnail?.startsWith('http')
        ? product.thumbnail
        : product.thumbnail?.startsWith('/')
          ? `${API_MEDIA}${product.thumbnail}`
          : product.thumbnail;

      const { publicApi } = await import('@/lib/api');
      const result = await publicApi.aiTryOn({
        face_image: faceImage,
        glasses_image: glassesSrc || '',
        product_name: product.name,
      });

      if (result.success && result.image) {
        // Lưu ảnh gốc, watermark sẽ hiện bằng CSS overlay
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
  }, [faceImage, product, selectedColor]);

  // Fallback: Canvas overlay khi Gemini API không khả dụng
  const fallbackCanvasProcess = async () => {
    const canvas = resultCanvasRef.current;
    if (!canvas || !faceImage) return;

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

    // Load glasses
    const glassesImg = new Image();
    glassesImg.crossOrigin = 'anonymous';
    const glassesSrc = product.thumbnail?.startsWith('http')
      ? product.thumbnail
      : `${API_MEDIA}${product.thumbnail}`;

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
    const wmText = `✦ ${siteName} — Virtual Try-On ✦`;
    ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
    const wmY = canvas.height - wmSize * 2;
    const wmMetrics = ctx.measureText(wmText);
    ctx.fillRect(canvas.width / 2 - wmMetrics.width / 2 - 16, wmY - wmSize, wmMetrics.width + 32, wmSize * 2.2);
    ctx.fillStyle = '#c9a96e';
    ctx.fillText(wmText, canvas.width / 2, wmY);
    ctx.font = `${wmSize * 0.7}px 'Inter', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(product.name, canvas.width / 2, wmY + wmSize);

    setResultImage(canvas.toDataURL('image/jpeg', 0.92));
  };

  const downloadResult = () => {
    if (!resultImage) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const drawWatermarkAndSave = (logoImage?: HTMLImageElement) => {
        // Logo watermark ở giữa ảnh (mờ 15%)
        if (logoImage && logoImage.width > 0) {
          const logoW = canvas.width * 0.35;
          const logoH = logoW * (logoImage.height / logoImage.width);
          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.drawImage(logoImage, (canvas.width - logoW) / 2, (canvas.height - logoH) / 2, logoW, logoH);
          ctx.restore();
        }

        // Text watermark lặp lại mờ 15% xoay chéo
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.font = `bold ${Math.max(20, canvas.width * 0.04)}px 'Inter', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        const text = siteName;
        for (let y = -canvas.height; y < canvas.height; y += Math.max(80, canvas.height * 0.15)) {
          for (let x = -canvas.width; x < canvas.width; x += Math.max(200, canvas.width * 0.4)) {
            ctx.fillText(text, x, y);
          }
        }
        ctx.restore();

        // Bottom bar
        const wmSize = Math.max(14, canvas.width * 0.025);
        ctx.font = `bold ${wmSize}px 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        const wmText = `✦ ${siteName} — Virtual Try-On ✦`;
        const wmY = canvas.height - wmSize * 2;
        const wmMetrics = ctx.measureText(wmText);
        ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
        ctx.fillRect(canvas.width / 2 - wmMetrics.width / 2 - 16, wmY - wmSize, wmMetrics.width + 32, wmSize * 2.2);
        ctx.fillStyle = '#c9a96e';
        ctx.fillText(wmText, canvas.width / 2, wmY);
        ctx.font = `${wmSize * 0.7}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(product.name, canvas.width / 2, wmY + wmSize);

        const link = document.createElement('a');
        link.download = `glass-tryon-${product.name.replace(/\s/g, '-')}-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
      };

      // Try load logo -> fallback -> render
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => drawWatermarkAndSave(logoImg);
      logoImg.onerror = () => {
        if (siteLogoUrl && logoImg.src !== fallbackLogo) {
          // Thử fallback logo
          logoImg.src = fallbackLogo;
        } else {
          drawWatermarkAndSave(); // Không có logo, chỉ dùng text
        }
      };
      logoImg.src = siteLogo;
    };
    img.src = resultImage;
  };

  const resetTryOn = () => {
    setFaceImage(null);
    setResultImage(null);
    setProcessing(false);
  };

  if (!isOpen) return null;

  const thumbSrc = product.thumbnail?.startsWith('http')
    ? product.thumbnail
    : `${API_MEDIA}${product.thumbnail}`;

  return (
    <div className="tryon-modal__overlay" onClick={onClose}>
      <div className="tryon-modal" onClick={e => e.stopPropagation()}>
        <button className="tryon-modal__close" onClick={onClose}>
          <FiX />
        </button>

        {/* Header */}
        <div className="tryon-modal__header">
          <div className="tryon-modal__product">
            <div className="tryon-modal__product-img">
              <img src={thumbSrc} alt={product.name} />
            </div>
            <div>
              <h3 className="tryon-modal__product-name">{product.name}</h3>
              <p className="tryon-modal__product-price">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                  .format(product.sale_price || product.price)}
              </p>
            </div>
          </div>
          {product.colors && product.colors.length > 1 && (
            <div className="tryon-modal__colors">
              {product.colors.map((c, i) => (
                <button
                  key={i}
                  className={`tryon-modal__color-btn ${selectedColor === c ? 'tryon-modal__color-btn--active' : ''}`}
                  style={{ backgroundColor: c === 'transparent' ? '#f5f5dc' : c }}
                  onClick={() => setSelectedColor(c)}
                  title={product.color_names?.[i] || c}
                >
                  {selectedColor === c && <FiCheck />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="tryon-modal__body">
          <canvas ref={resultCanvasRef} style={{ display: 'none' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Upload / Camera View */}
          {!faceImage && !showCamera && !processing && !resultImage && (
            <div className="tryon-modal__upload">
              <div
                className="tryon-modal__dropzone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="tryon-modal__upload-icon">
                  <FiUpload />
                </div>
                <h4>Tải ảnh khuôn mặt lên</h4>
                <p>Kéo thả hoặc click để chọn ảnh</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
              <button className="tryon-modal__camera-btn" onClick={startCamera}>
                <FiCamera /> Chụp ảnh từ Camera
              </button>
            </div>
          )}

          {/* Camera */}
          {showCamera && (
            <div className="tryon-modal__camera">
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', transform: 'scaleX(-1)', borderRadius: '12px' }} />
              <div className="tryon-modal__camera-actions">
                <button className="tryon-modal__cam-cancel" onClick={stopCamera}>
                  <FiX /> Hủy
                </button>
                <button className="tryon-modal__cam-capture" onClick={capturePhoto}>
                  <div className="tryon-modal__cam-shutter" />
                </button>
                <div style={{ width: 60 }} />
              </div>
            </div>
          )}

          {/* Face Preview - Ready to process */}
          {faceImage && !processing && !resultImage && (
            <div className="tryon-modal__preview">
              <div className="tryon-modal__preview-img">
                <img src={faceImage} alt="Face" />
                <button className="tryon-modal__preview-remove" onClick={() => setFaceImage(null)}>
                  <FiX />
                </button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={processTryOn} style={{ width: '100%' }}>
                <RiMagicLine /> Đeo thử kính
              </button>
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="tryon-modal__processing">
              <div className="tryon-modal__proc-rings">
                <div className="tryon-modal__proc-ring" />
                <div className="tryon-modal__proc-ring tryon-modal__proc-ring--2" />
                <RiMagicLine className="tryon-modal__proc-icon" />
              </div>
              <h4>AI đang xử lý ảnh thử kính...</h4>
              <p style={{ fontSize: '0.8125rem', opacity: 0.6, marginTop: '8px' }}>Quá trình này có thể mất 10-30 giây</p>
              <div className="tryon-modal__proc-bar-wrap">
                <div className="tryon-modal__proc-bar" />
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && !processing && !resultImage && (
            <div className="tryon-modal__error tryon-fade-in" style={{
              textAlign: 'center', padding: '32px 20px',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                fontSize: '1.5rem', color: '#ef4444',
              }}>!</div>
              <h4 style={{ marginBottom: '8px', color: '#ef4444' }}>Lỗi xử lý</h4>
              <p style={{ fontSize: '0.8125rem', opacity: 0.7, marginBottom: '20px', lineHeight: 1.5 }}>{errorMsg}</p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => { setErrorMsg(null); processTryOn(); }}>
                  <FiRotateCcw /> Thử lại
                </button>
                <button className="btn btn-secondary" onClick={resetTryOn}>
                  Chọn ảnh khác
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {resultImage && !processing && (
            <div className="tryon-modal__result tryon-fade-in">
              <div className="tryon-modal__result-img">
                <img src={resultImage} alt="Try-on result" />
                {/* CSS Overlay Watermark - Logo giữa ảnh 15% opacity */}
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', zIndex: 2,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={siteLogo}
                    alt=""
                    onError={(e) => { (e.target as HTMLImageElement).src = fallbackLogo; }}
                    style={{
                      width: '35%', maxWidth: '180px', height: 'auto',
                      opacity: 0.15, filter: 'grayscale(0.3)',
                      userSelect: 'none', pointerEvents: 'none',
                    }}
                  />
                </div>
                {/* Text watermark ở dưới */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(10, 10, 26, 0.6)',
                  padding: '6px 12px', textAlign: 'center',
                  pointerEvents: 'none', zIndex: 2,
                }}>
                  <div style={{ color: '#c9a96e', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                    ✦ {siteName} — Virtual Try-On ✦
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', marginTop: '2px' }}>
                    {product.name}
                  </div>
                </div>
              </div>
              <div className="tryon-modal__result-actions">
                <button className="btn btn-primary" onClick={downloadResult}>
                  <FiDownload /> Tải ảnh
                </button>
                <button className="btn btn-secondary" onClick={resetTryOn}>
                  <FiRotateCcw /> Thử lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
