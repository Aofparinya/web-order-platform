export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="text-xl font-bold">Order Platform</div>
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
            Enterprise Back Office
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            จัดการลูกค้า สินค้า และคลังสินค้าในที่เดียว
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            ระบบหลังบ้านที่เชื่อมต่อ microservices ผ่าน API Gateway
            พร้อมควบคุมสิทธิ์ตามบทบาท
          </p>
        </div>
        <p className="text-sm text-slate-500">Order Platform · Portfolio Project</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        {children}
      </section>
    </main>
  );
}
