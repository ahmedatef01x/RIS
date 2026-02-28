import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, User, FileImage, ExternalLink } from "lucide-react";

export interface Study {
  studyId: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  seriesCount: number;
  imageCount: number;
  status: "new" | "viewed" | "reported";
}

interface StudyListProps {
  studies: Study[];
  selectedStudyId?: string;
  onStudySelect: (studyId: string) => void;
}

const statusColors = {
  new: "bg-info/10 text-info border-info/30",
  viewed: "bg-warning/10 text-warning border-warning/30",
  reported: "bg-success/10 text-success border-success/30",
};

export function StudyList({ studies, selectedStudyId, onStudySelect }: StudyListProps) {
  return (
    <div className="space-y-2">
      {studies.map((study) => (
        <div
          key={study.studyId}
          onClick={() => onStudySelect(study.studyId)}
          className={cn(
            "p-3 rounded-lg cursor-pointer transition-smooth",
            selectedStudyId === study.studyId
              ? "bg-primary/10 border border-primary/30"
              : "bg-muted/30 hover:bg-muted/50 border border-transparent"
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {study.modality}
              </Badge>
              <Badge variant="outline" className={cn(statusColors[study.status], "text-xs")}>
                {study.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                // Open in PACS viewer
              }}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          
          <p className="font-medium text-foreground text-sm mb-1">{study.description}</p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {study.patientName}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {study.studyDate}
            </div>
            <div className="flex items-center gap-1">
              <FileImage className="w-3 h-3" />
              {study.imageCount} images
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
