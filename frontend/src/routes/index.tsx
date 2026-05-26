import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Database, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Create Image — Outfit Anyone" },
      {
        name: "description",
        content:
          "Create AI virtual try-on images. Choose a model, a garment, and generate in seconds.",
      },
    ],
  }),
});

const models = [
  "https://storage.outfitanyone.net/home/example1.png",
  "https://storage.outfitanyone.net/home/example2.jpg",
  "https://storage.outfitanyone.net/home/example3.png",
  "https://storage.outfitanyone.net/home/example4.png",
  "https://storage.outfitanyone.net/home/example5.png",
  "https://storage.outfitanyone.net/home/example6.jpg",
  "https://storage.outfitanyone.net/home/example7.jpg",
  "https://storage.outfitanyone.net/home/example8.png",
];

const garments = [
  "https://storage.outfitanyone.net/home/outfit1.jpg",
  "https://storage.outfitanyone.net/home/outfit2.jpg",
  "https://storage.outfitanyone.net/home/outfit3.png",
  "https://storage.outfitanyone.net/home/outfit4.jpg",
  "https://storage.outfitanyone.net/home/outfit5.png",
  "https://storage.outfitanyone.net/home/outfit6.png",
  "https://storage.outfitanyone.net/home/outfit7.png",
  "https://storage.outfitanyone.net/home/outfit8.png",
];

function UploadBox() {
  return (
    <div className="rounded-xl border border-white/5 bg-[#1f2937]/60 hover:bg-[#1f2937] transition-colors cursor-pointer aspect-[2/1] flex flex-col items-center justify-center gap-2 text-slate-300">
      <ImagePlus className="w-7 h-7" />
      <span className="text-sm font-medium">Upload Image</span>
    </div>
  );
}

function Thumb({ src }: { src: string }) {
  return (
    <div className="aspect-square rounded-lg overflow-hidden border border-white/5 bg-[#1f2937] hover:ring-2 hover:ring-emerald-400/60 cursor-pointer transition">
      <img src={src} alt="example" className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-400 mb-2 px-1">{title}</div>
      {children}
    </div>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-lg">👤</span>
          </div>
          <span className="font-semibold text-lg">Outfit Anyone</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
          <a href="#" className="hover:text-white">Create</a>
          <a href="#" className="hover:text-white">Free Playground</a>
          <a href="#" className="hover:text-white">AI Song Generator</a>
          <a href="#" className="hover:text-white">Pricing</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-sm text-slate-300 hover:text-white flex items-center gap-1">
            🌐 EN
          </button>
          <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
            Get Started -- It's Free
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[360px] shrink-0 p-6 space-y-5 border-r border-white/5">
          <Section title="Models">
            <UploadBox />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {models.map((s) => (
                <Thumb key={s} src={s} />
              ))}
            </div>
          </Section>

          <Section title="Garments">
            <UploadBox />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {garments.map((s) => (
                <Thumb key={s} src={s} />
              ))}
            </div>
          </Section>

          <div className="rounded-xl border border-white/5 bg-[#1f2937]/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Upgrade your account</div>
              <button className="text-xs px-3 py-1 rounded-full border border-white/15 hover:bg-white/10">
                Upgrade
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Purchase a Basic plan or higher, to create more, get better quality and access more
              features!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Database className="w-3.5 h-3.5" />
            10 credits
          </div>

          <button className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:opacity-95 transition">
            ✨ Generate
          </button>
        </aside>

        {/* Center hero */}
        <main className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="text-center max-w-2xl">
            <h1 className="text-5xl font-bold flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-cyan-300" />
              Outfit Anyone
              <Sparkles className="w-8 h-8 text-cyan-300" />
            </h1>
            <p className="mt-6 text-slate-300 leading-relaxed font-medium">
              Create images for your virtual try-on experience with Outfit Anyone AI Virtual Try-On
              Image Tool. Choose a model, garment, and generate images in seconds.
            </p>
            <button className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-lg transition">
              Use Sample Model & Garment
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
