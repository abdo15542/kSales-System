/**
 * فلسفة «دفتر الحي المعاصر»: أداة ميدانية مباشرة، لا تتطلب خدمة خارجية.
 * الكاميرا والنتيجة تبقيان داخل الجهاز ولا تُرسلان إلى أي خادم.
 */
import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, ScanLine, X } from "lucide-react";

type DetectorResult = { rawValue?: string };
type DetectorInstance = { detect: (source: ImageBitmapSource) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => DetectorInstance;

declare global {
  interface Window {
    BarcodeDetector?: DetectorConstructor;
  }
}

type BarcodeScannerProps = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  continuous?: boolean;
  kicker?: string;
  heading?: string;
  closeLabel?: string;
};

export default function BarcodeScanner({ onDetected, onClose, continuous = false, kicker = "نقطة البيع", heading = "مسح باركود", closeLabel = "العودة إلى البيع" }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastDetectedRef = useRef<{ value: string; at: number } | null>(null);
  const [status, setStatus] = useState<"requesting" | "ready" | "unsupported" | "error">("requesting");
  const [message, setMessage] = useState("نطلب إذن الكاميرا الخلفية…");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId = 0;
    let stopped = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setMessage("لا تتوفر الكاميرا في هذا المتصفح. اكتب رمز الصنف في البحث يدويًا.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (!window.BarcodeDetector) {
          setStatus("unsupported");
          setMessage("الكاميرا جاهزة، لكن هذا المتصفح لا يدعم قراءة الباركود تلقائيًا. استخدم Chrome حديثًا على هاتف Android أو اكتب الرمز يدويًا.");
          return;
        }
        setStatus("ready");
        setMessage("وجّه الكاميرا إلى الباركود حتى يتم التعرف عليه.");
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(videoRef.current);
              const value = codes.find((code) => code.rawValue?.trim())?.rawValue?.trim();
              if (value) {
                if (!continuous) {
                  stopped = true;
                  onDetected(value);
                  return;
                }
                const previous = lastDetectedRef.current;
                const now = Date.now();
                if (!previous || previous.value !== value || now - previous.at >= 1_200) {
                  lastDetectedRef.current = { value, at: now };
                  onDetected(value);
                }
              }
            }
          } catch {
            // يستمر المسح في الإطار التالي لأن جودة الكاميرا قد تتغير أثناء التركيز.
          }
          frameId = window.requestAnimationFrame(scan);
        };
        frameId = window.requestAnimationFrame(scan);
      } catch {
        setStatus("error");
        setMessage("تعذّر فتح الكاميرا. تأكد من منح الإذن للتطبيق ثم أعد المحاولة.");
      }
    };

    void start();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected]);

  return (
    <div className="modal-backdrop barcode-backdrop" role="presentation">
      <section className="barcode-scanner" role="dialog" aria-modal="true" aria-label={heading}>
        <div className="barcode-scanner__head"><div><span className="section-kicker">{kicker}</span><h3>{heading}</h3></div><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق الماسح"><X size={19} /></button></div>
        <div className="barcode-scanner__viewport">
          <video ref={videoRef} muted playsInline aria-label="معاينة الكاميرا" />
          <span className="barcode-scanner__guide"><i /><i /><i /><i /></span>
          {status === "requesting" && <div className="barcode-scanner__overlay"><LoaderCircle className="spin" size={28} /><b>جاري تجهيز الكاميرا</b></div>}
          {status === "unsupported" && <div className="barcode-scanner__overlay barcode-scanner__overlay--notice"><Camera size={27} /><b>المسح التلقائي غير متاح</b></div>}
          {status === "error" && <div className="barcode-scanner__overlay barcode-scanner__overlay--notice"><ScanLine size={27} /><b>لم تُفتح الكاميرا</b></div>}
        </div>
        <p className="barcode-scanner__message">{message}</p>
        <button type="button" className="action-button action-button--secondary barcode-scanner__close" onClick={onClose}>{closeLabel}</button>
      </section>
    </div>
  );
}
