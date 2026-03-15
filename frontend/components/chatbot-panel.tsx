"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import GlassSurface from "@/components/GlassSurface";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconSend,
  IconLoader2,
  IconBrain,
  IconTool,
  IconMessageCircle,
  IconCube3dSphere,
  IconTerminal,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFileTypePdf,
  IconPaperclip,
} from "@tabler/icons-react";
import { isReportContent, downloadReportPdf } from "@/components/report-view";
import { supabase } from "@/lib/supabase";

const PROJECTS_BUCKET = "pdfs";

function sanitizeUserPath(email: string): string {
  return email.replace(/@/g, "_at_").replace(/\./g, "_");
}

const ML_MODELS = [
  { id: "gpt-4.1", label: "GPT-4.1", image: "/openai.png" },
  { id: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", image: "/claude (1).svg" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", image: "/gemini (1).png" },
  { id: "deepseek-r1", label: "DeepSeek-R1", image: "/deepseek (1).png" },
] as const;

export interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "output";
  label: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
}

type ProjectFileEntry = { name: string; path: string };

interface ChatbotPanelProps {
  onSend?: () => void;
  messages: ChatMessage[];
  onNewMessage: (userText: string) => void;
  isLoading: boolean;
  onToggleModelView?: () => void;
  modelViewActive?: boolean;
  modelViewContent?: React.ReactNode;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  attachedProjectPaths?: string[];
  onAttachedProjectChange?: (paths: string[]) => void;
}

const STEP_ICON: Record<AgentStep["type"], typeof IconBrain> = {
  thinking: IconBrain,
  tool_call: IconTool,
  tool_result: IconTerminal,
  output: IconMessageCircle,
};

const STEP_COLOR: Record<AgentStep["type"], string> = {
  thinking: "text-violet-600",
  tool_call: "text-amber-600",
  tool_result: "text-emerald-600",
  output: "text-blue-600",
};

function StepRow({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  const Icon = STEP_ICON[step.type];
  const color = STEP_COLOR[step.type];

  return (
    <div className="border-b border-black/4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-black/3"
      >
        <IconChevronRight
          className={`size-3 shrink-0 text-black/30 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
        />
        <Icon className={`size-3 shrink-0 ${color}`} />
        <span className="truncate text-[11px] text-black/60">{step.label}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 pl-8">
          <p className="text-[11px] leading-relaxed text-black/50 whitespace-pre-wrap wrap-break-word">
            {step.content}
          </p>
        </div>
      )}
    </div>
  );
}

function ReportDownloadRow({ markdown }: { markdown: string }) {
  const [busy, setBusy] = useState(false);
  const title = markdown.split("\n")[0]?.replace(/^#+\s*/, "").trim() || "Report";

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadReportPdf(markdown);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <IconFileTypePdf className="size-5 shrink-0 text-black/50" />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-black">{title}</p>
          <p className="text-[11px] text-black/40">PDF report ready</p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="shrink-0 rounded p-1.5 text-black transition-opacity hover:opacity-70 disabled:opacity-50"
          aria-label="Download PDF"
        >
          {busy ? (
            <IconLoader2 className="size-5 animate-spin" />
          ) : (
            <IconDownload className="size-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ChatbotPanel({
  onSend,
  messages,
  onNewMessage,
  isLoading,
  onToggleModelView,
  modelViewActive = false,
  modelViewContent,
  selectedModel: controlledModel,
  onModelChange,
  attachedProjectPaths: controlledAttached,
  onAttachedProjectChange,
}: ChatbotPanelProps) {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [showModelViewButton, setShowModelViewButton] = useState(false);
  const [internalModel, setInternalModel] = useState<string>(ML_MODELS[0].id);
  const [internalAttached, setInternalAttached] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFileEntry[]>([]);
  const [projectFilesLoading, setProjectFilesLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceStartedRef = useRef(false);
  const [outputFadedIn, setOutputFadedIn] = useState(false);

  const userPath = session?.user?.email ? sanitizeUserPath(session.user.email) : null;
  const attachedPaths = controlledAttached ?? internalAttached;
  const setAttachedPaths = useCallback(
    (paths: string[]) => {
      if (onAttachedProjectChange) onAttachedProjectChange(paths);
      else setInternalAttached(paths);
    },
    [onAttachedProjectChange],
  );
  const hasAttachments = attachedPaths.length > 0;

  const selectedModel = controlledModel ?? internalModel;
  const setSelectedModel = (id: string) => {
    if (onModelChange) onModelChange(id);
    else setInternalModel(id);
  };
  const currentModel = ML_MODELS.find((m) => m.id === selectedModel) ?? ML_MODELS[0];

  const fetchProjectFiles = useCallback(async () => {
    if (!userPath) return;
    setProjectFilesLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(PROJECTS_BUCKET)
        .list(userPath, { limit: 100 });
      if (error) throw error;
      const entries: ProjectFileEntry[] = (data ?? [])
        .filter((f) => f.name && !f.name.endsWith("/"))
        .map((f) => ({
          name: f.name,
          path: `${userPath}/${f.name}`,
        }));
      setProjectFiles(entries);
    } catch {
      setProjectFiles([]);
    } finally {
      setProjectFilesLoading(false);
    }
  }, [userPath]);

  const onPickerOpenChange = useCallback(
    (open: boolean) => {
      setPickerOpen(open);
      if (open) fetchProjectFiles();
    },
    [fetchProjectFiles],
  );

  const toggleProjectPath = useCallback(
    (path: string) => {
      setAttachedPaths(
        attachedPaths.includes(path)
          ? attachedPaths.filter((p) => p !== path)
          : [...attachedPaths, path],
      );
    },
    [attachedPaths, setAttachedPaths],
  );

  const hasContent = messages.length > 0 || isLoading;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!hasContent || sequenceStartedRef.current) return;
    sequenceStartedRef.current = true;
    const t1 = setTimeout(() => setOutputFadedIn(true), 300);
    const t2 = setTimeout(() => setShowModelViewButton(true), 300 + 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hasContent]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend?.();
    onNewMessage(text);
  };

  return (
    <aside
      className={`w-full max-w-2xl px-4 flex flex-col transition-[gap] duration-300 ${
        showModelViewButton ? "gap-4" : "gap-1"
      }`}
    >
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          hasContent ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <GlassSurface
          width={"100%" as unknown as number}
          height={560}
          borderRadius={16}
          backgroundOpacity={0.55}
          className="overflow-hidden"
          contentClassName="!flex !flex-col !items-stretch !justify-start !p-0 !gap-0 !h-full"
        >
        {modelViewActive && modelViewContent ? (
          <div className="h-full w-full">{modelViewContent}</div>
        ) : (
          <div
            ref={scrollRef}
            className={`h-full overflow-y-auto transition-opacity duration-500 ease-out ${
              outputFadedIn ? "opacity-100" : "opacity-0"
            }`}
          >
            {!hasContent && (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-black/30">
                  Agent output will appear here…
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end px-4 py-2">
                    <div className="max-w-[85%] rounded-xl bg-black/10 px-3.5 py-2 text-sm text-black">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div>
                    {msg.steps && msg.steps.length > 0 && (
                      <div className="border-y border-black/6">
                        {msg.steps.map((step, i) => (
                          <StepRow key={i} step={step} />
                        ))}
                      </div>
                    )}

                    {msg.content ? (
                      isReportContent(msg.content) ? (
                        <ReportDownloadRow markdown={msg.content} />
                      ) : (
                        <div className="px-4 py-3">
                          <div className="text-sm leading-relaxed text-black whitespace-pre-wrap wrap-break-word">
                            {msg.content}
                            {isLoading && msg.id === messages[messages.length - 1]?.id && (
                              <span className="inline-block w-1.5 h-4 ml-0.5 bg-black/40 animate-pulse rounded-sm align-text-bottom" />
                            )}
                          </div>
                        </div>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {(isLoading || (hasContent && !isLoading)) && (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-black/6">
                {isLoading ? (
                  <>
                    <IconLoader2 className="size-3 animate-spin text-violet-600" />
                    <span className="text-[11px] text-black/50">
                      Agent is working…
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-black/50">
                    Anything else I can do for you?
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </GlassSurface>
      </div>

      {onToggleModelView && (
        <div
          className={`flex justify-center overflow-hidden transition-all duration-300 ease-out ${
            showModelViewButton
              ? "max-h-16 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={onToggleModelView}
            className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium text-black/60 transition-colors hover:bg-black/10 hover:text-black/80"
          >
            <IconCube3dSphere className="size-3.5" />
            {modelViewActive ? "Show agent output" : "Show model view"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <GlassSurface
          width={"100%" as unknown as number}
          height={"fit-content" as unknown as number}
          borderRadius={16}
          backgroundOpacity={0.55}
          className="overflow-hidden"
          contentClassName="!flex !flex-col !items-stretch !justify-center !p-0 !gap-0"
        >
          <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about genome primer design…"
              className="w-full bg-transparent text-sm text-black placeholder:text-black/50 outline-none md:text-base"
              aria-label="Message"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-7 w-[132px] shrink-0 gap-1.5 border border-black/15 bg-white/80 px-2 shadow-none focus:ring-1 focus:ring-black/10 [&>svg:last-of-type]:hidden">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <img
                        src={currentModel.image}
                        alt=""
                        className="size-3.5 shrink-0 rounded object-contain"
                      />
                      <span className="truncate text-[11px] text-black/80">
                        {currentModel.label}
                      </span>
                    </div>
                    <IconChevronDown className="size-3 shrink-0 text-black/40" />
                  </SelectTrigger>
                  <SelectContent>
                    {ML_MODELS.map((m) => (
                      <SelectItem
                        key={m.id}
                        value={m.id}
                        className="flex items-center gap-2 text-[13px]"
                      >
                        <img
                          src={m.image}
                          alt=""
                          className="size-3.5 shrink-0 rounded object-contain"
                        />
                        <span>{m.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu open={pickerOpen} onOpenChange={onPickerOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`flex h-7 w-7 items-center justify-center rounded-md border text-black/60 transition-colors ${
                        hasAttachments
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-black/15 bg-white/80 hover:bg-black/5"
                      }`}
                      aria-label={hasAttachments ? "Attachments selected" : "Pick from project"}
                    >
                      <IconPaperclip
                        className={`size-3.5 ${
                          hasAttachments ? "text-emerald-600" : "text-black/55"
                        }`}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="top" className="min-w-[200px] max-h-[280px] overflow-y-auto">
                    {!userPath ? (
                      <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                        <span className="text-xs text-black/50">Sign in to use project files</span>
                      </DropdownMenuItem>
                    ) : projectFilesLoading ? (
                      <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                        <span className="text-xs text-black/50">Loading…</span>
                      </DropdownMenuItem>
                    ) : projectFiles.length === 0 ? (
                      <DropdownMenuItem disabled onSelect={(e) => e.preventDefault()}>
                        <span className="text-xs text-black/50">No files in project</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        {projectFiles.map((f) => (
                          <DropdownMenuItem
                            key={f.path}
                            onSelect={(e) => {
                              e.preventDefault();
                              toggleProjectPath(f.path);
                            }}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={attachedPaths.includes(f.path)}
                              className="pointer-events-none"
                            />
                            <span className="truncate text-xs">{f.name}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onSelect={() => setPickerOpen(false)}>
                          <span className="text-xs font-medium">Done</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                type="submit"
                size="icon-sm"
                className="size-8 shrink-0 rounded-lg bg-black/15 text-black hover:bg-black/25"
                disabled={!input.trim() || isLoading}
                aria-label="Send"
              >
                {isLoading ? (
                  <IconLoader2 className="size-4 text-black animate-spin" />
                ) : (
                  <IconSend className="size-4 text-black stroke-[2.5]" />
                )}
              </Button>
            </div>
          </div>
        </GlassSurface>
      </form>
    </aside>
  );
}
