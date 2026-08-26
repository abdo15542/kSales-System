export const TRAINING_MODE_LABEL = "وضع التدريب";

export const getTrainingModeMessage = (active: boolean) => active
  ? "أنت في وضع التدريب: لا تُحفظ أي فاتورة أو تعديل مخزون في بيانات المحل."
  : "وضع التدريب متوقف؛ عمليات البيع تحفظ في بيانات المحل كالمعتاد.";

export const shouldPersistStoreChange = (trainingMode: boolean) => !trainingMode;
