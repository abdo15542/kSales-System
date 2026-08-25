export type BarcodeFeedbackKind = "success" | "not-found" | "error";

export const getBarcodeFeedbackMessage = (kind: BarcodeFeedbackKind, productName?: string) => {
  if (kind === "success") return productName ? `تم التعرف على «${productName}» بنجاح.` : "تم التعرف على الباركود بنجاح.";
  if (kind === "not-found") return "هذا الباركود غير مسجل؛ أضف الصنف الجديد الآن.";
  return "تعذر قراءة الباركود. حاول المسح مرة أخرى أو اكتب الرمز يدويًا.";
};

export const playBarcodeFeedback = (kind: BarcodeFeedbackKind, enabled: boolean) => {
  if (!enabled || typeof window === "undefined") return;
  try {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const tones = kind === "success" ? [760, 1040] : kind === "not-found" ? [480, 360] : [180];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "success" ? "sine" : "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(kind === "success" ? 0.06 : 0.045, context.currentTime + index * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.09 + 0.08);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.09);
      oscillator.stop(context.currentTime + index * 0.09 + 0.09);
    });
    window.setTimeout(() => void context.close(), tones.length * 100 + 150);
  } catch {
    // الصوت اختياري؛ تبقى الرسالة المرئية متاحة إذا منع المتصفح تشغيل الصوت.
  }
};
