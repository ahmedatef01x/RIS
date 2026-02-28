import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ZoomIn, ZoomOut, Move, RotateCw, Maximize2, Grid, 
  Contrast, Ruler, Circle, Square, FlipHorizontal, FlipVertical,
  RefreshCw, Download, Layers, ChevronLeft, ChevronRight,
  MousePointer, SunMedium
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DicomStudy {
  studyId: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  series: DicomSeries[];
}

interface DicomSeries {
  seriesId: string;
  description: string;
  images: DicomImage[];
}

interface DicomImage {
  imageId: string;
  instanceNumber: number;
  sliceLocation?: number;
}

interface PACSViewerProps {
  study?: DicomStudy | null;
  className?: string;
}

// Mock DICOM study data
const mockStudy: DicomStudy = {
  studyId: "1.2.840.113619.2.55.3.604688",
  patientName: "Ahmed Mohamed",
  patientId: "MRN-001234",
  studyDate: "2024-01-15",
  modality: "CT",
  description: "CT Chest w/Contrast",
  series: [
    {
      seriesId: "1.1",
      description: "Axial Chest",
      images: Array.from({ length: 120 }, (_, i) => ({
        imageId: `img-${i + 1}`,
        instanceNumber: i + 1,
        sliceLocation: -150 + i * 2.5,
      })),
    },
    {
      seriesId: "1.2",
      description: "Coronal MPR",
      images: Array.from({ length: 80 }, (_, i) => ({
        imageId: `cor-${i + 1}`,
        instanceNumber: i + 1,
      })),
    },
    {
      seriesId: "1.3",
      description: "Sagittal MPR",
      images: Array.from({ length: 60 }, (_, i) => ({
        imageId: `sag-${i + 1}`,
        instanceNumber: i + 1,
      })),
    },
  ],
};

type ViewerTool = "pointer" | "zoom" | "pan" | "window" | "measure" | "annotate";

export function PACSViewer({ study = mockStudy, className }: PACSViewerProps) {
  const [activeTool, setActiveTool] = useState<ViewerTool>("pointer");
  const [zoom, setZoom] = useState(100);
  const [windowWidth, setWindowWidth] = useState(400);
  const [windowCenter, setWindowCenter] = useState(40);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [currentSeriesIndex, setCurrentSeriesIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const currentSeries = study?.series[currentSeriesIndex];
  const currentImage = currentSeries?.images[currentImageIndex];
  const totalImages = currentSeries?.images.length || 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && currentImageIndex > 0) {
        setCurrentImageIndex(prev => prev - 1);
      } else if (e.key === "ArrowDown" && currentImageIndex < totalImages - 1) {
        setCurrentImageIndex(prev => prev + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImageIndex, totalImages]);

  // Mouse wheel for scrolling through slices
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0 && currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setZoom(100);
    setWindowWidth(400);
    setWindowCenter(40);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && viewerRef.current) {
      viewerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const tools = [
    { id: "pointer" as ViewerTool, icon: MousePointer, label: "Select" },
    { id: "zoom" as ViewerTool, icon: ZoomIn, label: "Zoom" },
    { id: "pan" as ViewerTool, icon: Move, label: "Pan" },
    { id: "window" as ViewerTool, icon: Contrast, label: "Window/Level" },
    { id: "measure" as ViewerTool, icon: Ruler, label: "Measure" },
    { id: "annotate" as ViewerTool, icon: Circle, label: "Annotate" },
  ];

  if (!study) {
    return (
      <div className={cn("flex items-center justify-center h-[500px] bg-black/90 rounded-lg", className)}>
        <div className="text-center text-muted-foreground">
          <Layers className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>No study selected</p>
          <p className="text-sm">Select a case to view images</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={viewerRef} className={cn("flex flex-col bg-black rounded-lg overflow-hidden", className)}>
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 border-b border-white/10">
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-white/70 hover:text-white hover:bg-white/10",
                    activeTool === tool.id && "bg-primary/30 text-primary"
                  )}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <tool.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{tool.label}</TooltipContent>
            </Tooltip>
          ))}
          
          <div className="w-px h-6 bg-white/20 mx-2" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Rotate 90°</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-white/70 hover:text-white hover:bg-white/10",
                  flipH && "bg-primary/30 text-primary"
                )}
                onClick={() => setFlipH(!flipH)}
              >
                <FlipHorizontal className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flip Horizontal</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-white/70 hover:text-white hover:bg-white/10",
                  flipV && "bg-primary/30 text-primary"
                )}
                onClick={() => setFlipV(!flipV)}
              >
                <FlipVertical className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flip Vertical</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={handleReset}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset View</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Layout</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Fullscreen</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main viewport */}
      <div className="flex-1 relative" onWheel={handleWheel}>
        {/* DICOM Image viewport */}
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-crosshair"
          style={{
            filter: `brightness(${windowCenter / 40}) contrast(${windowWidth / 400})`,
          }}
        >
          {/* Simulated CT image */}
          <div
            className="relative w-[400px] h-[400px]"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
              transition: "transform 0.2s ease",
            }}
          >
            {/* CT Image simulation with gradients */}
            <div className="w-full h-full rounded-full bg-gradient-radial from-gray-600 via-gray-800 to-black relative overflow-hidden">
              {/* Body outline */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 opacity-80" />
              
              {/* Lung areas (darker for air) */}
              <div className="absolute top-1/4 left-1/4 w-1/4 h-1/3 bg-gray-900 rounded-full opacity-70 blur-sm" />
              <div className="absolute top-1/4 right-1/4 w-1/4 h-1/3 bg-gray-900 rounded-full opacity-70 blur-sm" />
              
              {/* Spine/vertebra (bright) */}
              <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-8 h-12 bg-white/80 rounded-lg" />
              
              {/* Heart area */}
              <div className="absolute top-1/3 left-1/3 w-1/4 h-1/4 bg-gray-400 rounded-full opacity-60 blur-sm" />
              
              {/* Ribs simulation */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-1 bg-white/40 rounded-full"
                  style={{
                    top: `${25 + i * 10}%`,
                    left: "10%",
                    width: "35%",
                    transform: `rotate(${10 - i * 2}deg)`,
                  }}
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`r-${i}`}
                  className="absolute h-1 bg-white/40 rounded-full"
                  style={{
                    top: `${25 + i * 10}%`,
                    right: "10%",
                    width: "35%",
                    transform: `rotate(${-10 + i * 2}deg)`,
                  }}
                />
              ))}
              
              {/* Noise overlay for realism */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }} />
            </div>
          </div>
        </div>

        {/* Overlay information - Top Left */}
        <div className="absolute top-3 left-3 text-xs text-green-400 font-mono space-y-0.5">
          <div>{study.patientName}</div>
          <div>{study.patientId}</div>
          <div>{study.studyDate}</div>
          <div>{study.modality}: {study.description}</div>
        </div>

        {/* Overlay information - Top Right */}
        <div className="absolute top-3 right-3 text-xs text-green-400 font-mono text-right space-y-0.5">
          <div>Series: {currentSeries?.description}</div>
          <div>Image: {currentImageIndex + 1} / {totalImages}</div>
          {currentImage?.sliceLocation && <div>Loc: {currentImage.sliceLocation.toFixed(1)} mm</div>}
          <div>Zoom: {zoom}%</div>
        </div>

        {/* Overlay information - Bottom Left */}
        <div className="absolute bottom-3 left-3 text-xs text-green-400 font-mono space-y-0.5">
          <div>W: {windowWidth} C: {windowCenter}</div>
        </div>

        {/* Overlay information - Bottom Right */}
        <div className="absolute bottom-3 right-3 text-xs text-green-400 font-mono text-right">
          <div>512 x 512</div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 h-2/3 w-2 bg-white/10 rounded-full">
          <div
            className="w-full bg-primary/60 rounded-full transition-all"
            style={{
              height: `${Math.max(10, 100 / totalImages)}%`,
              marginTop: `${(currentImageIndex / totalImages) * (100 - Math.max(10, 100 / totalImages))}%`,
            }}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-3 bg-black/80 border-t border-white/10 space-y-3">
        {/* Series selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 w-16">Series:</span>
          <div className="flex gap-1">
            {study.series.map((series, index) => (
              <Button
                key={series.seriesId}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs text-white/70 hover:text-white",
                  currentSeriesIndex === index && "bg-primary/30 text-white"
                )}
                onClick={() => {
                  setCurrentSeriesIndex(index);
                  setCurrentImageIndex(0);
                }}
              >
                {series.description}
              </Button>
            ))}
          </div>
        </div>

        {/* Image slider */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white"
            onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
            disabled={currentImageIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Slider
            value={[currentImageIndex]}
            onValueChange={([v]) => setCurrentImageIndex(v)}
            max={totalImages - 1}
            step={1}
            className="flex-1"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:text-white"
            onClick={() => setCurrentImageIndex(prev => Math.min(totalImages - 1, prev + 1))}
            disabled={currentImageIndex === totalImages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Window/Level controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 flex-1">
            <Contrast className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60 w-8">W:</span>
            <Slider
              value={[windowWidth]}
              onValueChange={([v]) => setWindowWidth(v)}
              min={1}
              max={1000}
              step={10}
              className="flex-1"
            />
            <span className="text-xs text-white/60 w-10">{windowWidth}</span>
          </div>
          
          <div className="flex items-center gap-2 flex-1">
            <SunMedium className="w-4 h-4 text-white/60" />
            <span className="text-xs text-white/60 w-8">C:</span>
            <Slider
              value={[windowCenter]}
              onValueChange={([v]) => setWindowCenter(v)}
              min={-500}
              max={500}
              step={10}
              className="flex-1"
            />
            <span className="text-xs text-white/60 w-10">{windowCenter}</span>
          </div>
          
          <div className="flex items-center gap-2 w-32">
            <ZoomIn className="w-4 h-4 text-white/60" />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={25}
              max={400}
              step={25}
              className="flex-1"
            />
            <span className="text-xs text-white/60 w-10">{zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
