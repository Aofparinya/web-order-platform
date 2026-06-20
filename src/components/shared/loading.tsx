export function LoadingState({ text = "กำลังโหลดข้อมูล..." }: { text?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
      {text}
    </div>
  );
}
