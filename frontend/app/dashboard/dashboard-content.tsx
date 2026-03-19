"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "@/components/app-sidebar";
import {
  ChatbotPanel,
  type ChatMessage,
} from "@/components/chatbot-panel";
import { ProjectsPanel } from "@/components/projects-panel";
import { CallioLabsSplash } from "@/components/callio-labs-splash";
import GlassSurface from "@/components/GlassSurface";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEMO_STEPS } from "@/lib/demo-sequence";
const Dither = dynamic(() => import("@/components/Dither"), { ssr: false });
const PdbViewerOverlay = dynamic(
  () =>
    import("@/components/pdb-viewer-overlay").then((m) => ({
      default: m.PdbViewerOverlay,
    })),
  { ssr: false },
);
const EmbeddedModelViewer = dynamic(
  () =>
    import("@/components/embedded-model-viewer").then((m) => ({
      default: m.EmbeddedModelViewer,
    })),
  { ssr: false },
);

type Page = "study" | "projects";

export function DashboardContent() {
  const [hasStarted, setHasStarted] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [panelsOpen, setPanelsOpen] = useState(false);
  const [activePage, setActivePage] = useState<Page>("study");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modelViewActive, setModelViewActive] = useState(false);
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      demoTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPanelsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleNewMessage = useCallback(
    (userText: string) => {
      // Clear any running demo timers from a previous run
      demoTimers.current.forEach(clearTimeout);
      demoTimers.current = [];

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText,
      };
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setIsLoading(true);

      // Run the scripted demo sequence with timed delays
      let cumulativeDelay = 0;
      DEMO_STEPS.forEach((evt, idx) => {
        cumulativeDelay += evt.delay;
        const timer = setTimeout(() => {
          // Add step if present
          if (evt.step) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, steps: [...(m.steps ?? []), evt.step!] }
                  : m,
              ),
            );
          }
          // Set content if present
          if (evt.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: evt.content! } : m,
              ),
            );
          }
          // Last step → stop loading
          if (idx === DEMO_STEPS.length - 1) {
            setIsLoading(false);
          }
        }, cumulativeDelay);
        demoTimers.current.push(timer);
      });
    },
    [],
  );

  const headerTitle =
    activePage === "projects" ? "Projects" : "Genome Analysis";

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <CallioLabsSplash />
      <div className="fixed inset-0 z-0 h-screen w-screen">
        <Dither
          waveSpeed={0.02}
          waveFrequency={3}
          waveAmplitude={0.3}
          backgroundColor={[1, 1, 1]}
          waveColor={[0, 0, 0]}
          colorNum={4}
          pixelSize={2}
          enableMouseInteraction
          mouseRadius={1.2}
        />
      </div>
      <div className="relative z-10">
        <SidebarProvider
          className="!bg-transparent"
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 72)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar
            variant="inset"
            onNavItemClick={(item) => {
              if (item.title === "Projects") setActivePage("projects");
              if (item.title === "Dashboard") setActivePage("study");
            }}
            onNewStudy={() => setActivePage("study")}
          />
          <SidebarInset className="!bg-transparent flex flex-col">
            <SiteHeader title={headerTitle} />

            {activePage === "projects" ? (
              <ProjectsPanel open />
            ) : (
              <>
                <div className="relative flex flex-1 min-h-0 flex-col items-center justify-center gap-4 px-4 pb-4">
                  <div
                    className={`absolute left-4 top-4 bottom-4 flex flex-col gap-4 transition-opacity duration-300 ease-out ${
                      panelsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                    style={{ width: "calc((100% - 42rem) / 2 - 2rem)" }}
                  >
                    <div className="flex-1 min-h-0">
                      <GlassSurface
                        width={"100%" as unknown as number}
                        height={"100%" as unknown as number}
                        borderRadius={16}
                        className="overflow-hidden h-full"
                        contentClassName="!p-0 !m-0"
                      >
                        <div className="h-full w-full" />
                      </GlassSurface>
                    </div>
                    <div className="flex-1 min-h-0">
                      <GlassSurface
                        width={"100%" as unknown as number}
                        height={"100%" as unknown as number}
                        borderRadius={16}
                        className="overflow-hidden h-full"
                        contentClassName="!p-0 !m-0"
                      >
                        <div className="h-full w-full" />
                      </GlassSurface>
                    </div>
                  </div>
                  <div
                    className={`absolute right-4 top-4 bottom-4 flex flex-col gap-4 transition-opacity duration-300 ease-out ${
                      panelsOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                    style={{ width: "calc((100% - 42rem) / 2 - 2rem)" }}
                  >
                    <div className="flex-1 min-h-0">
                      <GlassSurface
                        width={"100%" as unknown as number}
                        height={"100%" as unknown as number}
                        borderRadius={16}
                        className="overflow-hidden h-full"
                        contentClassName="!p-0 !m-0"
                      >
                        <div className="h-full w-full" />
                      </GlassSurface>
                    </div>
                    <div className="flex-1 min-h-0">
                      <GlassSurface
                        width={"100%" as unknown as number}
                        height={"100%" as unknown as number}
                        borderRadius={16}
                        className="overflow-hidden h-full"
                        contentClassName="!p-0 !m-0"
                      >
                        <div className="h-full w-full" />
                      </GlassSurface>
                    </div>
                  </div>

                  <div className="flex-1" />
                  <PdbViewerOverlay
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                  />
                  <ChatbotPanel
                    onSend={() => setHasStarted(true)}
                    messages={messages}
                    onNewMessage={handleNewMessage}
                    isLoading={isLoading}
                    onToggleModelView={() => setModelViewActive((v) => !v)}
                    modelViewActive={modelViewActive}
                    modelViewContent={<EmbeddedModelViewer />}
                  />
                  <div
                    className="transition-[flex-grow] duration-[1400ms] ease-in-out"
                    style={{
                      flexGrow: hasStarted ? 0 : 1,
                      flexShrink: 0,
                      flexBasis: 0,
                    }}
                  />
                </div>
              </>
            )}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
