import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Database, Sparkles, Loader2 } from "lucide-react";

const SUPABASE_USER_ID = import.meta.env.VITE_SUPABASE_USER_ID as string;

interface Virtual {
  id: string;
  url: string;
  created_at: string;
}

async function fetchGallery(): Promise<Virtual[]> {
  try {
    const res = await fetch(
      `/supabase/rest/v1/virtuals?select=*&user_id=eq.${SUPABASE_USER_ID}&url=not.is.null&order=created_at.desc&offset=0&limit=10`
    );
    if (!res.ok) return [];
    return (await res.json()) as Virtual[];
  } catch {
    return [];
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(base64: string): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo: base64 }),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  return data.data as string;
}

async function generateImage(modelInput: string, dressInput: string): Promise<string> {
  const submitRes = await fetch("/api/gen/image-generate-n", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelInput, dressInput, numSelected: 1 }),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => "");
    throw new Error(`Submit failed: ${submitRes.status} — ${errBody}`);
  }
  const submitJson = await submitRes.json();
  console.log("[generate] submit response:", JSON.stringify(submitJson));
  // Support both {data:{id}} and {data:{taskId}} and top-level {id}
  const genId: string =
    submitJson?.data?.id ??
    submitJson?.data?.taskId ??
    submitJson?.id ??
    submitJson?.taskId;
  if (!genId) throw new Error(`Submit succeeded but no task ID in response: ${JSON.stringify(submitJson)}`);
  console.log("[generate] task id:", genId);

  // Poll every 5 s, up to 60 times (5 min)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`/api/gen/image-generate-n/${genId}`);
    if (!pollRes.ok) {
      const errBody = await pollRes.text().catch(() => "");
      throw new Error(`Poll failed: ${pollRes.status} — ${errBody}`);
    }
    const pollJson = await pollRes.json();
    console.log("[generate] poll response:", JSON.stringify(pollJson));
    const pd = pollJson?.data ?? pollJson;
    const status: string = pd?.status ?? "";
    if (status === "failed") throw new Error("Generation failed");
    // Only proceed when API returns "succeeded"
    if (status === "succeeded") {
      // Try Supabase for the URL
      try {
        const supaRes = await fetch(
          `/supabase/rest/v1/virtuals?select=url&id=eq.${genId}`
        );
        if (supaRes.ok) {
          const rows = (await supaRes.json()) as Array<{ url: string }>;
          if (rows[0]?.url) return rows[0].url;
        }
      } catch {
        // fall through to constructed URL
      }
      // Fallback: construct URL from predictable storage path
      const d = new Date();
      return `https://storage.outfitanyone.net/image-generate-n/${d.getFullYear()}/${d.getMonth() + 1}/${genId}.png`;
    }
  }
  throw new Error("Generation timed out");
}

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
  "/images/model1.jpg",
  "/images/model2.png",
  "/images/example1.png",
  "/images/example2.jpg",
  "/images/example3.png",
  "/images/example4.png",
  "/images/example5.png",
  "/images/example6.jpg",
  "/images/example7.jpg",
  "/images/example8.png",
];

const garments = [
  "/images/dress1.jpg",
  "/images/dress2.jpg",
  "/images/outfit1.jpg",
  "/images/outfit2.jpg",
  "/images/outfit3.png",
  "/images/outfit4.jpg",
  "/images/outfit5.png",
  "/images/outfit6.png",
  "/images/outfit7.png",
  "/images/outfit8.png",
];

function UploadBox({ value, onSelect }: { value: string | null; onSelect: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const url = await uploadImage(base64);
      onSelect(url);
    } catch (err) {
      setError("Upload failed");
      console.error(err);
    } finally {
      setUploading(false);
      // reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={`rounded-xl border overflow-hidden transition-colors cursor-pointer h-36 flex flex-col items-center justify-center gap-2 relative ${
        value && !uploading
          ? "border-emerald-400/60 bg-transparent"
          : "border-white/5 bg-[#1f2937]/60 hover:bg-[#1f2937] text-slate-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {value && !uploading ? (
        <>
          <img src={value} alt="selected" className="h-full w-auto max-w-full object-contain" />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
            <ImagePlus className="w-6 h-6" />
            <span className="text-xs font-medium">Replace</span>
          </div>
        </>
      ) : (
        <>
          {uploading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <ImagePlus className="w-7 h-7" />
          )}
          <span className="text-sm font-medium">
            {uploading ? "Uploading…" : "Upload Image"}
          </span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </>
      )}
    </div>
  );
}

function Thumb({ src, selected, onSelect }: { src: string; selected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`aspect-square rounded-lg overflow-hidden border bg-[#1f2937] cursor-pointer transition ${
        selected ? "ring-2 ring-emerald-400/80 border-emerald-400/60" : "border-white/5 hover:ring-2 hover:ring-emerald-400/60"
      }`}
    >
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
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Virtual[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [tokenRefreshing, setTokenRefreshing] = useState(false);
  const [tokenRefreshed, setTokenRefreshed] = useState(false);

  useEffect(() => {
    setGalleryLoading(true);
    fetchGallery().then(setGallery).finally(() => setGalleryLoading(false));
  }, []);

  const handleRefreshToken = async () => {
    setTokenRefreshing(true);
    setTokenRefreshed(false);
    try {
      await fetch("/api-refresh-token");
      setTokenRefreshed(true);
      setTimeout(() => setTokenRefreshed(false), 3000);
      // Token 刷新后同步刷新画廊
      setGalleryLoading(true);
      fetchGallery().then(setGallery).finally(() => setGalleryLoading(false));
    } finally {
      setTokenRefreshing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedModel || !selectedGarment || generating) return;
    setGenerating(true);
    setResultUrl(null);
    setGenerateError(null);
    try {
      // 提交时将相对路径转为绝对 URL（API 需要可访问的完整地址）
      const resolveUrl = (path: string) =>
        path.startsWith("/") ? `${window.location.origin}${path}` : path;
      const url = await generateImage(resolveUrl(selectedModel), resolveUrl(selectedGarment));
      setResultUrl(url);
      // Refresh gallery in background after generation
      fetchGallery().then(setGallery);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !!selectedModel && !!selectedGarment && !generating;

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
          <button
              onClick={handleRefreshToken}
              disabled={tokenRefreshing}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {tokenRefreshing && <Loader2 className="w-4 h-4 animate-spin" />}
              {tokenRefreshed ? "✓ Token Refreshed" : tokenRefreshing ? "Refreshing…" : "🔄 Refresh Token"}
            </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[360px] shrink-0 p-6 space-y-5 border-r border-white/5">
          <Section title="Models">
            <UploadBox value={selectedModel} onSelect={setSelectedModel} />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {models.map((s) => (
                <Thumb key={s} src={s} selected={selectedModel === s} onSelect={() => setSelectedModel(s)} />
              ))}
            </div>
          </Section>

          <Section title="Garments">
            <UploadBox value={selectedGarment} onSelect={setSelectedGarment} />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {garments.map((s) => (
                <Thumb key={s} src={s} selected={selectedGarment === s} onSelect={() => setSelectedGarment(s)} />
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

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full rounded-xl py-3 font-semibold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              "✨ Generate"
            )}
          </button>
          {generateError && (
            <p className="text-xs text-red-400 px-1">{generateError}</p>
          )}
        </aside>

        {/* Center — loading / result / gallery */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {generating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-slate-300">
                <Loader2 className="w-12 h-12 animate-spin text-fuchsia-400" />
                <p className="text-sm font-medium">Generating your outfit…</p>
              </div>
            </div>
          ) : resultUrl ? (
            <div className="flex-1 flex items-center justify-center px-6 py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="text-xs text-slate-400">Generated Result</div>
                <img
                  src={resultUrl}
                  alt="generated"
                  className="max-h-[70vh] rounded-2xl shadow-2xl object-contain"
                />
                <button
                  className="text-xs text-slate-400 hover:text-white transition"
                  onClick={() => setResultUrl(null)}
                >
                  ← Back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-200">Generated Images</h2>
                <button
                  onClick={() => {
                    setGalleryLoading(true);
                    fetchGallery().then(setGallery).finally(() => setGalleryLoading(false));
                  }}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  ↺ Refresh
                </button>
              </div>
              {galleryLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : gallery.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {gallery.map((item) => (
                    <div
                      key={item.id}
                      className="aspect-[3/4] rounded-xl overflow-hidden bg-[#1f2937] cursor-pointer group"
                      onClick={() => setResultUrl(item.url)}
                    >
                      <img
                        src={item.url}
                        alt="generated"
                        className="w-full h-full object-cover group-hover:opacity-80 transition"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-20">
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
                    <button
                      className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-lg transition"
                      onClick={() => {
                        setSelectedModel(models[0]);
                        setSelectedGarment(garments[0]);
                      }}
                    >
                      Use Sample Model & Garment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
