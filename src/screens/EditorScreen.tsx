import { useEffect, useMemo, useRef, useState } from "react";
import type { Clip, Project, RenderJob, SettingsState, PreviewSettings, ExportSettings, MediaAsset } from "../lib/types";
import { formatClock } from "../lib/store";
import { MEDIA_LIBRARY, waveBars } from "../lib/demo";
import { VIDEO_EFFECTS } from "../lib/mock";
import * as Ic from "../components/icons";
import { Sheet, Slider, Select, Field, Primary, Ghost, Progress, Input } from "../components/ui";

type Tool = "edit" | "speed" | "volume" | "effects" | "animation" | "crop";

export function EditorScreen(props: {
  tr: (k: string) => string;
  project: Project;
  settings: SettingsState;
  saved: boolean;
  renderJobs: RenderJob[];
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addClip: (projectId: string, clip: Omit<Clip, "id">) => void;
  deleteClip: (projectId: string, clipId: string) => void;
  duplicateClip: (projectId: string, clipId: string) => void;
  splitClip: (projectId: string, clipId: string, at: number) => void;
  updateClip: (projectId: string, clipId: string, patch: Partial<Clip>) => void;
  startRender: (projectId: string) => void;
  pauseRender: (id: string) => void;
  resumeRender: (id: string) => void;
  cancelRender: (id: string) => void;
  retryRender: (id: string) => void;
  updatePreview: (p: Partial<PreviewSettings>) => void;
  updateExport: (p: Partial<ExportSettings>) => void;
}) {
  const { tr, project, settings, saved, renderJobs, onBack, onUndo, onRedo } = props;
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [tNow, setTNow] = useState(12);
  const [zoom, setZoom] = useState(1.05);
  const [snap, setSnap] = useState(true);
  const [selected, setSelected] = useState<string | null>(project.clips.find((c) => c.track === 2)?.id ?? null);

  useEffect(() => {
    setSelected(project.clips.find((c) => c.track === 2)?.id ?? null);
  }, [project.id]);
  const [tool, setTool] = useState<Tool>("edit");
  const [addOpen, setAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ id: string; start: number; x: number } | null>(null);

  const duration = Math.max(30, ...project.clips.map((c) => c.start + c.duration), 1);
  const px = 38 * zoom;
  const sel = project.clips.find((c) => c.id === selected) || null;

  const frameClip = useMemo(() => {
    const vids = project.clips.filter((c) => c.type !== "audio" && tNow >= c.start && tNow < c.start + c.duration);
    return vids.sort((a, b) => a.track - b.track).pop() || null;
  }, [project.clips, tNow]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTNow((t) => {
        let n = t + dt;
        if (n >= duration) {
          if (loop) return 0;
          setPlaying(false);
          return duration;
        }
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, loop]);

  const previewFilter = settings.preview.effectQuality === "fast" ? "saturate(0.92) contrast(1.02)" : settings.preview.effectQuality === "full" ? "none" : "saturate(0.97)";
  const resScale = { "360p": 0.42, "480p": 0.55, "720p": 0.78, "1080p": 1, original: 1 }[settings.preview.resolution];

  const onRulerPointer = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left + el.scrollLeft - 40;
    setTNow(Math.max(0, Math.min(duration, x / px)));
  };

  const ticks: number[] = [];
  for (let s = 0; s <= duration + 0.01; s += 10) ticks.push(s);

  return (
    <div className="flex h-full flex-col bg-[#111114]">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-1 px-2">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center text-white" aria-label="Back">
          <Ic.IcBack />
        </button>
        <div className="min-w-0 flex-1 truncate text-[16px] font-medium">{project.name}</div>
        <button onClick={onUndo} className="flex h-10 w-10 items-center justify-center text-zinc-300" aria-label={tr("undo")}>
          <Ic.IcUndo />
        </button>
        <button onClick={onRedo} className="flex h-10 w-10 items-center justify-center text-zinc-400" aria-label={tr("redo")}>
          <Ic.IcRedo />
        </button>
        <div className="mr-1 flex items-center gap-1 text-[12px] text-emerald-400">
          <Ic.IcCheck size={16} />
          {saved ? tr("saved") : tr("unsaved")}
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="mr-1 rounded-xl bg-violet-500 px-3.5 py-1.5 text-[13px] font-semibold text-white"
        >
          {tr("export")}
        </button>
      </header>

      {/* Preview */}
      <div className="px-3">
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <div className="relative aspect-video w-full">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <img
                src={frameClip?.thumb || project.cover || "/images/preview-car.jpg"}
                alt=""
                className="h-full w-full object-cover"
                style={{
                  transform: `scale(${resScale * (sel?.scale || 1)})`,
                  filter: previewFilter,
                  opacity: sel ? sel.opacity : 1,
                }}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
              <button onClick={() => setLoop((v) => !v)} className={`text-white/80 ${loop ? "text-violet-300" : ""}`}>
                <Ic.IcLoop size={18} />
              </button>
              <div className="flex items-center gap-5 text-white">
                <button onClick={() => setTNow((t) => Math.max(0, t - 2))}>
                  <Ic.IcSkipBack size={18} />
                </button>
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                >
                  {playing ? <Ic.IcPause size={18} /> : <Ic.IcPlay size={18} />}
                </button>
                <button onClick={() => setTNow((t) => Math.min(duration, t + 2))}>
                  <Ic.IcSkipFwd size={18} />
                </button>
              </div>
              <div className="w-16 text-right font-mono text-[11px] text-white/80">{formatClock(tNow).slice(0, 8)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-2">
        <button
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1c1c22] px-3 py-1 text-[11px] text-zinc-300 ring-1 ring-white/6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          {tr("preview")}: {settings.preview.resolution} · {settings.preview.mode === "auto" ? tr("auto") : tr("manual")}
        </button>
      </div>

      {/* Tools */}
      <div className="flex items-center gap-1 px-3 pb-1 text-[13px] text-zinc-200">
        <button onClick={() => setAddOpen(true)} className="flex items-center gap-1 px-1 py-2 font-medium">
          <Ic.IcPlus size={18} /> {tr("addMedia")}
        </button>
        <button
          onClick={() => {
            if (sel) props.splitClip(project.id, sel.id, tNow);
          }}
          className="flex items-center gap-1 px-2 py-2"
        >
          <Ic.IcSplit size={18} /> {tr("split")}
        </button>
        <button onClick={() => setSnap((s) => !s)} className={`flex items-center gap-1 px-2 py-2 ${snap ? "text-violet-300" : ""}`}>
          <Ic.IcSnap size={18} /> {tr("snap")}
        </button>
        <div className="ml-auto flex items-center gap-1 text-zinc-400">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} className="p-2">
            <Ic.IcZoomOut size={18} />
          </button>
          <button onClick={() => setZoom((z) => Math.min(2.4, z + 0.15))} className="p-2">
            <Ic.IcZoomIn size={18} />
          </button>
          <button onClick={() => setZoom(1.05)} className="p-2">
            <Ic.IcFit size={18} />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          className="no-scrollbar h-full overflow-auto"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).dataset.role === "ruler") onRulerPointer(e);
          }}
        >
          <div className="relative" style={{ width: duration * px + 80, minHeight: "100%" }}>
            {/* ruler */}
            <div data-role="ruler" className="sticky top-0 z-10 h-7 bg-[#111114]" onPointerDown={onRulerPointer}>
              {ticks.map((s) => (
                <div key={s} className="absolute top-0 text-[10px] text-zinc-500" style={{ left: 40 + s * px }}>
                  <div className="h-2 w-px bg-zinc-600" />
                  {formatClock(s).slice(0, 5)}
                </div>
              ))}
            </div>

            {project.tracks.map((tk) => {
              const icon =
                tk.type === "audio" ? <Ic.IcSpeaker size={14} /> : tk.id === 1 ? <Ic.IcCam size={14} /> : tk.id === 4 ? <Ic.IcLayers size={14} /> : <Ic.IcPlay size={14} />;
              const h = tk.type === "video" ? 58 : tk.type === "audio" ? 44 : 36;
              return (
                <div key={tk.id} className="relative mb-1 flex items-center" style={{ height: h }}>
                  <div className="sticky left-0 z-20 flex h-full w-10 items-center justify-center bg-[#111114] text-zinc-500">{icon}</div>
                  <div className="relative h-full flex-1">
                    {project.clips
                      .filter((c) => c.track === tk.id)
                      .map((c) => (
                        <ClipView
                          key={c.id}
                          clip={c}
                          px={px}
                          selected={selected === c.id}
                          height={h - 8}
                          onSelect={() => setSelected(c.id)}
                          onDragStart={(x) => {
                            dragging.current = { id: c.id, start: c.start, x };
                          }}
                          onDrag={(x) => {
                            const d = dragging.current;
                            if (!d || d.id !== c.id) return;
                            let next = d.start + (x - d.x) / px;
                            next = Math.max(0, next);
                            if (snap) next = Math.round(next * 2) / 2;
                            props.updateClip(project.id, c.id, { start: next });
                          }}
                        />
                      ))}
                  </div>
                </div>
              );
            })}

            {/* playhead */}
            <div className="pointer-events-none absolute top-0 bottom-0 z-30" style={{ left: 40 + tNow * px }}>
              <div className="absolute -top-0 left-1/2 h-3 w-3 -translate-x-1/2 rounded-sm bg-violet-500" />
              <div className="h-full w-[2px] bg-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {sel && tool !== "edit" && (
        <div className="border-t border-white/6 bg-[#1a1a20] px-4 py-3">
          {tool === "speed" && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>{tr("speedLabel")}</span>
                <span>{sel.speed.toFixed(2)}x</span>
              </div>
              <Slider value={sel.speed * 100} min={10} max={300} onChange={(v: number) => props.updateClip(project.id, sel.id, { speed: v / 100 })} />
              <div className="mt-2 flex gap-2">
                <Ghost onClick={() => props.updateClip(project.id, sel.id, { reversed: !sel.reversed })}>{tr("reverse")}</Ghost>
                <Ghost onClick={() => props.updateClip(project.id, sel.id, { frozen: !sel.frozen })}>{tr("freeze")}</Ghost>
              </div>
            </div>
          )}
          {tool === "volume" && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-400">
                <span>{tr("volume")}</span>
                <span>{Math.round(sel.volume * 100)}%</span>
              </div>
              <Slider value={sel.volume * 100} onChange={(v: number) => props.updateClip(project.id, sel.id, { volume: v / 100 })} />
            </div>
          )}
          {tool === "effects" && (
            <div className="flex flex-wrap gap-1.5">
              {VIDEO_EFFECTS.map((e) => {
                const on = sel.effects.includes(e.id);
                return (
                  <button
                    key={e.id}
                    onClick={() =>
                      props.updateClip(project.id, sel.id, {
                        effects: on ? sel.effects.filter((x) => x !== e.id) : [...sel.effects, e.id],
                      })
                    }
                    className={`rounded-full px-2.5 py-1 text-[11px] ${on ? "bg-violet-500 text-white" : "bg-white/8 text-zinc-300"}`}
                  >
                    {e.name}
                  </button>
                );
              })}
            </div>
          )}
          {tool === "animation" && (
            <div>
              <div className="mb-1 text-xs text-zinc-400">{tr("opacity")}</div>
              <Slider value={sel.opacity * 100} onChange={(v: number) => props.updateClip(project.id, sel.id, { opacity: v / 100 })} />
              <div className="mt-2 mb-1 text-xs text-zinc-400">{tr("scale")}</div>
              <Slider value={sel.scale * 100} min={10} max={200} onChange={(v: number) => props.updateClip(project.id, sel.id, { scale: v / 100 })} />
            </div>
          )}
          {tool === "crop" && (
            <div>
              <div className="mb-1 text-xs text-zinc-400">{tr("crop")}</div>
              <Slider value={sel.crop} onChange={(v: number) => props.updateClip(project.id, sel.id, { crop: v })} />
              <div className="mt-2 mb-1 text-xs text-zinc-400">{tr("rotation")}</div>
              <Slider value={sel.rotation + 180} min={0} max={360} onChange={(v: number) => props.updateClip(project.id, sel.id, { rotation: v - 180 })} />
            </div>
          )}
        </div>
      )}

      <nav className="grid grid-cols-6 border-t border-white/5 bg-[#16161a] px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1">
        {(
          [
            ["edit", tr("edit"), Ic.IcPencil],
            ["speed", tr("speed"), Ic.IcGauge],
            ["volume", tr("volume"), Ic.IcSpeaker],
            ["effects", tr("effects"), Ic.IcSpark],
            ["animation", tr("animation"), Ic.IcWand],
            ["crop", tr("crop"), Ic.IcCrop],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] ${tool === id ? "text-violet-400" : "text-zinc-500"}`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>

      {/* Add media */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <h3 className="mb-3 font-semibold">{tr("addMedia")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {MEDIA_LIBRARY.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                addMedia(props, project, m, tNow);
                setAddOpen(false);
              }}
              className="overflow-hidden rounded-xl bg-[#121216] text-left"
            >
              <div className="aspect-video bg-zinc-800">
                {m.thumb ? <img src={m.thumb} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="px-2 py-1.5 text-[12px]">{m.name}</div>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Preview settings */}
      <Sheet open={previewOpen} onClose={() => setPreviewOpen(false)}>
        <h3 className="mb-1 font-semibold">{tr("preview")}</h3>
        <p className="mb-3 text-xs text-zinc-500">{tr("previewHint")}</p>
        <Field label={tr("auto") + " / " + tr("manual")}>
          <Select value={settings.preview.mode} onChange={(e: any) => props.updatePreview({ mode: e.target.value })}>
            <option value="auto">{tr("auto")}</option>
            <option value="manual">{tr("manual")}</option>
          </Select>
        </Field>
        <div className="mt-3">
          <Field label={tr("previewQuality")}>
            <Select value={settings.preview.resolution} onChange={(e: any) => props.updatePreview({ resolution: e.target.value, mode: "manual" })}>
              <option value="360p">360p</option>
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="original">{tr("original")}</option>
            </Select>
          </Field>
        </div>
      </Sheet>

      {/* Export */}
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)}>
        <h3 className="mb-3 text-lg font-semibold">{tr("export")}</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Resolution">
            <Select value={settings.export.resolution} onChange={(e: any) => props.updateExport({ resolution: e.target.value })}>
              {["480p", "720p", "1080p", "2K", "4K"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="FPS">
            <Select value={settings.export.fps} onChange={(e: any) => props.updateExport({ fps: Number(e.target.value) as any })}>
              {[15, 24, 30, 60, 120].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
          </Field>
        </div>
        <button onClick={() => setAdvanced((a) => !a)} className="mt-3 text-xs text-violet-300">
          {tr("advanced")}
        </button>
        {advanced && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label={tr("quality")}>
              <Select value={settings.export.quality} onChange={(e: any) => props.updateExport({ quality: e.target.value })}>
                <option value="saver">{tr("saver")}</option>
                <option value="balanced">{tr("balanced")}</option>
                <option value="high">{tr("high")}</option>
                <option value="max">{tr("max")}</option>
              </Select>
            </Field>
            <Field label={tr("codec")}>
              <Select value={settings.export.codec} onChange={(e: any) => props.updateExport({ codec: e.target.value })}>
                <option value="auto">Auto · {tr("hwEncode")}</option>
                <option value="h264">H.264</option>
                <option value="h265">H.265</option>
                <option value="av1">AV1</option>
              </Select>
            </Field>
            <Field label={tr("bitrate")}>
              <Input type="number" value={settings.export.bitrate} onChange={(e: any) => props.updateExport({ bitrate: Number(e.target.value) })} />
            </Field>
            <Field label={tr("audioBitrate")}>
              <Select value={settings.export.audioBitrate} onChange={(e: any) => props.updateExport({ audioBitrate: Number(e.target.value) })}>
                <option value={128}>128</option>
                <option value={192}>192</option>
                <option value={256}>256</option>
                <option value={320}>320</option>
              </Select>
            </Field>
          </div>
        )}
        <p className="mt-2 text-[11px] text-zinc-500">
          {tr("estimate")}: ~{Math.max(12, Math.round((duration * settings.export.fps * 0.08)))} MB · {tr("previewHint")}
        </p>
        <Primary className="mt-4 w-full" onClick={() => props.startRender(project.id)}>
          {tr("export")}
        </Primary>

        {renderJobs.filter((j) => j.projectId === project.id).length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-zinc-400">{tr("renderQueue")}</div>
            {renderJobs
              .filter((j) => j.projectId === project.id)
              .map((j) => (
                <div key={j.id} className="rounded-xl bg-[#121216] p-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>
                      {j.status} · {j.resolution} · {j.fps}fps
                    </span>
                    <span className="text-zinc-500">
                      {j.progress.toFixed(0)}% · {j.eta.toFixed(0)}s
                    </span>
                  </div>
                  <Progress value={j.progress} />
                  <div className="mt-2 flex gap-2">
                    {j.status === "RENDERING" && (
                      <Ghost onClick={() => props.pauseRender(j.id)}>{tr("pause")}</Ghost>
                    )}
                    {j.status === "PAUSED" && <Ghost onClick={() => props.resumeRender(j.id)}>{tr("resume")}</Ghost>}
                    {(j.status === "RENDERING" || j.status === "PAUSED" || j.status === "PREPARING") && (
                      <Ghost danger onClick={() => props.cancelRender(j.id)}>
                        {tr("cancel")}
                      </Ghost>
                    )}
                    {j.status === "FAILED" && <Ghost onClick={() => props.retryRender(j.id)}>{tr("retry")}</Ghost>}
                    {j.status === "COMPLETED" && <span className="text-[11px] text-emerald-400">{j.outputPath}</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function addMedia(props: any, project: Project, m: MediaAsset, at: number) {
  const end = project.clips.filter((c) => c.track === 2).reduce((a, c) => Math.max(a, c.start + c.duration), at);
  props.addClip(project.id, {
    track: m.type === "audio" ? 3 : 2,
    type: m.type === "audio" ? "audio" : "video",
    name: m.name,
    start: end,
    duration: m.duration,
    color: m.type === "audio" ? "#3ee0c8" : "#8b67f7",
    opacity: 1,
    speed: 1,
    reversed: false,
    frozen: false,
    effects: [],
    thumb: m.thumb,
    volume: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    crop: 0,
  });
}

function ClipView({
  clip,
  px,
  selected,
  height,
  onSelect,
  onDragStart,
  onDrag,
}: {
  clip: Clip;
  px: number;
  selected: boolean;
  height: number;
  onSelect: () => void;
  onDragStart: (x: number) => void;
  onDrag: (x: number) => void;
}) {
  const bars = clip.type === "audio" ? waveBars(clip.id, 48) : [];
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onDragStart(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        onDrag(e.clientX);
      }}
      className={`absolute top-1 overflow-hidden rounded-[10px] ${selected ? "ring-[2.5px] ring-violet-400" : "ring-1 ring-black/40"}`}
      style={{
        left: clip.start * px,
        width: Math.max(28, clip.duration * px),
        height,
        background: clip.type === "audio" ? "#1b2430" : "#1a1a22",
      }}
    >
      {clip.thumb && clip.type !== "audio" ? (
        <img src={clip.thumb} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : clip.type === "audio" ? (
        <div className="flex h-full items-end gap-px px-1 py-1">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-sm bg-zinc-400/70" style={{ height: `${b * 100}%` }} />
          ))}
        </div>
      ) : (
        <div className="h-full w-full bg-violet-800/40" />
      )}
    </div>
  );
}