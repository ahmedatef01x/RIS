import { forwardRef } from "react";

interface ReportData {
  patient_name: string;
  mrn: string;
  patient_age?: number;
  patient_gender?: string;
  exam_type: string;
  exam_date: string;
  findings: string;
  impression: string;
  radiologist_name: string;
  finalized_at?: string;
}

interface ReportPrintViewProps {
  report: ReportData;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export const ReportPrintView = forwardRef<HTMLDivElement, ReportPrintViewProps>(
  ({ report, clinicName = "مركز الأشعة التشخيصية", clinicAddress = "القاهرة، مصر", clinicPhone = "0100-000-0000" }, ref) => {
    return (
      <div ref={ref} className="bg-white text-black p-8 max-w-[210mm] mx-auto print:p-0" dir="rtl">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{clinicName}</h1>
              <p className="text-sm text-gray-600">{clinicAddress}</p>
              <p className="text-sm text-gray-600">هاتف: {clinicPhone}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-600">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
              <p className="text-sm text-gray-600">وقت الطباعة: {new Date().toLocaleTimeString('ar-EG')}</p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-900">بيانات المريض</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">الاسم:</span>
              <span className="mr-2 text-gray-900">{report.patient_name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">الرقم الطبي:</span>
              <span className="mr-2 text-gray-900">{report.mrn}</span>
            </div>
            {report.patient_age && (
              <div>
                <span className="font-semibold text-gray-700">العمر:</span>
                <span className="mr-2 text-gray-900">{report.patient_age} سنة</span>
              </div>
            )}
            {report.patient_gender && (
              <div>
                <span className="font-semibold text-gray-700">الجنس:</span>
                <span className="mr-2 text-gray-900">{report.patient_gender === 'male' ? 'ذكر' : 'أنثى'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Exam Info */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">نوع الفحص: {report.exam_type}</h2>
            <p className="text-sm text-gray-600">تاريخ الفحص: {report.exam_date}</p>
          </div>
        </div>

        {/* Findings */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-gray-900 border-b border-gray-300 pb-2">النتائج (Findings)</h2>
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{report.findings}</p>
        </div>

        {/* Impression */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3 text-gray-900 border-b border-gray-300 pb-2">الانطباع (Impression)</h2>
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{report.impression}</p>
        </div>

        {/* Signature */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600 mb-1">أخصائي الأشعة:</p>
              <p className="font-bold text-gray-900">{report.radiologist_name}</p>
              {report.finalized_at && (
                <p className="text-xs text-gray-500 mt-1">
                  تم الاعتماد: {new Date(report.finalized_at).toLocaleString('ar-EG')}
                </p>
              )}
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-gray-400 mb-1"></div>
              <p className="text-xs text-gray-500">التوقيع</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>هذا التقرير صادر إلكترونياً وهو صالح بدون توقيع</p>
        </div>
      </div>
    );
  }
);

ReportPrintView.displayName = "ReportPrintView";
