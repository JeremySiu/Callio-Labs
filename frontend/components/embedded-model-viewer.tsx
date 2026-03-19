"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RENDERED_FOLD_FILES = [
  { path: "/rendered_folds/1HTM_icn3d.pdb", label: "1HTM" },
  { path: "/rendered_folds/1HGJ_icn3d.pdb", label: "1HGJ" },
  { path: "/rendered_folds/9H6U_icn3d.pdb", label: "9H6U" },
] as const;

export function EmbeddedModelViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelIndex, setModelIndex] = useState(0);

  const destroyViewer = useCallback(() => {
    const v = viewerRef.current as { clear?: () => void } | null;
    if (v && typeof v.clear === "function") v.clear();
    viewerRef.current = null;
    if (containerRef.current) containerRef.current.innerHTML = "";
  }, []);

  const loadModel = useCallback(
    async (index: number) => {
      if (!containerRef.current) return;
      destroyViewer();
      setError(null);
      setLoading(true);
      try {
        const el = containerRef.current;
        const $3Dmol = await import("3dmol");
        const viewer = $3Dmol.createViewer(el, {
          backgroundColor: "white",
        });
        viewerRef.current = viewer;

        const res = await fetch(RENDERED_FOLD_FILES[index].path);
        if (!res.ok) throw new Error(`Failed to load model: ${res.status}`);
        const pdbData = await res.text();

        viewer.addModel(pdbData, "pdb");
        viewer.setStyle(
          {},
          { cartoon: { color: "spectrum" }, stick: { colorscheme: "default" } },
        );
        viewer.setBackgroundColor("white", 0);
        viewer.zoomTo();
        viewer.zoom(1.3);
        viewer.rotate(Math.random() * 360, "x");
        viewer.rotate(Math.random() * 360, "y");
        viewer.resize();
        viewer.render();
        viewer.spin("z", 0.2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load viewer");
      } finally {
        setLoading(false);
      }
    },
    [destroyViewer],
  );

  const switchModel = useCallback(() => {
    const next = (modelIndex + 1) % RENDERED_FOLD_FILES.length;
    setModelIndex(next);
    setTimeout(() => loadModel(next), 80);
  }, [modelIndex, loadModel]);

  useEffect(() => {
    const id = setTimeout(() => loadModel(modelIndex), 80);
    return () => {
      clearTimeout(id);
      destroyViewer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full">

      {loading && (
        <div className="absolute inset-0 z-5 flex items-center justify-center text-sm text-black/50">
          Loading model…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-5 flex items-center justify-center text-sm text-red-500/80">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
