import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Series {
  seriesId: string;
  description: string;
  imageCount: number;
  modality: string;
}

interface SeriesThumbnailsProps {
  series: Series[];
  selectedSeriesId?: string;
  onSeriesSelect: (seriesId: string) => void;
}

export function SeriesThumbnails({ series, selectedSeriesId, onSeriesSelect }: SeriesThumbnailsProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 p-2">
        {series.map((s, index) => (
          <div
            key={s.seriesId}
            onClick={() => onSeriesSelect(s.seriesId)}
            className={cn(
              "flex-shrink-0 w-24 cursor-pointer transition-smooth",
              selectedSeriesId === s.seriesId && "ring-2 ring-primary"
            )}
          >
            {/* Thumbnail preview */}
            <div className="w-24 h-24 bg-black rounded-lg overflow-hidden relative group">
              {/* Simulated thumbnail */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-radial from-gray-600 to-black opacity-80" />
              </div>
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Series number badge */}
              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                {index + 1}
              </div>
              
              {/* Image count */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                {s.imageCount}
              </div>
            </div>
            
            {/* Series description */}
            <p className="text-xs text-center text-muted-foreground mt-1 truncate">
              {s.description}
            </p>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
